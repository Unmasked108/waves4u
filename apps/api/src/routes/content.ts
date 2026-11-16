import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../config.js';
import { Analysis, BlogPost, CAPITAL_RANGES, Faq, Lead, Market, MentorSession, Testimonial, Video } from '../models/index.js';
import { authenticate, canSee, optionalAuth, requirePremium } from '../middleware/auth.js';
import { verifyCaptcha } from '../services/captcha.js';
import { notify } from '../services/notifications.js';
import { AppError, wrap } from '../utils/errors.js';
import { indianMobile } from '../utils/phone.js';

/**
 * THE PAYWALL LIVES HERE. Content marked premium/club is removed on the server, so it never reaches
 * a browser that is not allowed to see it, not even in "view source".
 */
const r = Router();
const pageOf = (q: any) => ({ page: Math.max(1, +q.page || 1), limit: Math.min(50, +q.limit || 12) });

/* ----- Blog ----- */
r.get('/blog', wrap(async (req, res) => {
  const { page, limit } = pageOf(req.query);
  const filter = { status: 'published' };
  const [items, total] = await Promise.all([
    BlogPost.find(filter).sort({ publishedAt: -1 }).skip((page - 1) * limit).limit(limit)
      .select('title slug market teaser access coverImageUrl publishedAt updatedAt').lean(), // no body
    BlogPost.countDocuments(filter),
  ]);
  res.json({ items, page, total });
}));

r.get('/blog/:slug', optionalAuth, wrap(async (req, res) => {
  const p = await BlogPost.findOne({ slug: req.params.slug, status: 'published' }).populate('author', 'name').lean();
  if (!p) throw new AppError(404, 'Post not found');
  const locked = !canSee(req.user, p.access);
  res.json({
    locked,
    post: {
      title: p.title, slug: p.slug, market: p.market, teaser: p.teaser, access: p.access, coverImageUrl: p.coverImageUrl,
      publishedAt: p.publishedAt, updatedAt: p.updatedAt, author: (p.author as any)?.name ?? 'waves4u Research',
      ...(locked ? {} : { body: p.body }),
    },
  });
}));

/* ----- Elliott Wave analysis ----- */
const stripLevels = (a: any, user: Express.Request['user']) => {
  const locked = !canSee(user, a.access);
  if (locked) delete a.levels;
  return { ...a, locked };
};

r.get('/analysis', optionalAuth, wrap(async (req, res) => {
  const limit = Math.min(60, +(req.query.limit as string) || 60);
  const items = await Analysis.find({ status: 'published', supersededBy: null }).sort({ publishedAt: -1 }).limit(limit)
    .populate('market', 'name slug category').lean();
  const out = items.map((a) => stripLevels(a, req.user));
  res.json({ items: out, locked: out.some((a) => a.locked) });
}));

r.get('/analysis/:id', optionalAuth, wrap(async (req, res) => {
  z.string().length(24).parse(req.params.id);
  const a = await Analysis.findOne({ _id: req.params.id, status: 'published' }).populate('market', 'name slug category').lean();
  if (!a) throw new AppError(404, 'Not found');
  const out = stripLevels(a, req.user);
  res.json({ analysis: out, locked: out.locked });
}));

r.get('/markets', wrap(async (_req, res) => { res.json({ items: await Market.find().sort({ name: 1 }).lean() }); }));

/* ----- Videos ----- */
r.get('/videos', optionalAuth, wrap(async (req, res) => {
  const { page, limit } = pageOf(req.query);
  const items = await Video.find({ hidden: false }).sort({ publishedAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
  // Locked videos keep their title and thumbnail (as a teaser) but lose the playable id.
  res.json({
    items: items.map((v) => {
      const locked = !canSee(req.user, v.access);
      return { _id: v._id, provider: v.provider, title: v.title, description: v.description, thumbnail: v.thumbnail, access: v.access, publishedAt: v.publishedAt, locked, ...(locked ? {} : { videoId: v.videoId }) };
    }),
    page,
  });
}));

/* ----- FAQs and testimonials (managed in the admin panel) ----- */
r.get('/faqs', wrap(async (_req, res) => {
  res.json({ items: await Faq.find({ active: true }).sort({ order: 1, createdAt: 1 }).select('question answer').lean() });
}));
r.get('/testimonials', wrap(async (_req, res) => {
  res.json({ items: await Testimonial.find({ active: true, consent: true }).sort({ order: 1, createdAt: -1 }).select('firstName city text rating').lean() });
}));

/* ----- Get a Callback ----- */
const leadLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false, validate: { trustProxy: false }, message: { error: 'Too many requests. Please call us instead.' } });
const leadSchema = z.object({
  name: z.string().trim().min(2, 'Name must be 2 to 80 characters').max(80, 'Name must be 2 to 80 characters'),
  mobile: indianMobile,
  capital: z.enum(CAPITAL_RANGES, { errorMap: () => ({ message: 'Choose your trading capital' }) }),
  consent: z.literal(true, { errorMap: () => ({ message: 'Please agree to be contacted' }) }),
  website: z.string().optional(), // honeypot: real people never fill this hidden field
  captchaToken: z.string().optional(),
  page: z.string().max(200).optional(),
});

r.post('/leads', leadLimiter, wrap(async (req, res) => {
  const b = leadSchema.parse(req.body);
  if (b.website) return res.status(201).json({ ok: true }); // bot: pretend success, store nothing
  if (!(await verifyCaptcha(b.captchaToken, req.ip))) throw new AppError(400, 'Captcha check failed. Please try again.');
  const mobile = b.mobile;
  const lead = await Lead.create({ name: b.name, mobile, capital: b.capital, consent: true, page: b.page, ip: req.ip, userAgent: req.get('user-agent')?.slice(0, 300) });
  if (env.TEAM_EMAIL) await notify(null, 'email', 'lead_new', { name: lead.name, mobile, capital: lead.capital, page: b.page }, env.TEAM_EMAIL);
  res.status(201).json({ ok: true });
}));

/* ----- Mentorship sessions ----- */
r.get('/sessions', optionalAuth, wrap(async (req, res) => {
  const q = MentorSession.find({ startsAt: { $gte: new Date() } }).sort({ startsAt: 1 }).limit(20);
  if (!req.user?.isPremium) q.select('-joinLink -registrations');
  const items = await q.lean();
  res.json({ items: items.map((s: any) => ({ ...s, registered: req.user ? !!s.registrations?.some((id: any) => String(id) === req.user!.id) : false })) });
}));

r.post('/sessions/:id/register', authenticate, requirePremium, wrap(async (req, res) => {
  z.string().length(24).parse(req.params.id);
  const done = await MentorSession.updateOne(
    { _id: req.params.id, $expr: { $lt: [{ $size: '$registrations' }, '$capacity'] } },
    { $addToSet: { registrations: req.user!.id } },
  );
  if (!done.matchedCount) throw new AppError(409, 'Session is full or not found');
  res.json({ ok: true });
}));

/** URLs for the XML sitemap. */
r.get('/sitemap', wrap(async (_req, res) => {
  const posts = await BlogPost.find({ status: 'published' }).select('slug updatedAt').lean();
  res.json({ blogs: posts.map((p) => ({ slug: p.slug, updatedAt: p.updatedAt })) });
}));

export default r;
