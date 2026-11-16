import { Router } from 'express';
import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';
import {
  ACCESS, Analysis, AuditLog, BlogPost, CAPITAL_RANGES, Coupon, DURATIONS, Faq, Lead, MentorSession, Payment, Plan, PRODUCTS,
  SEGMENTS, Subscription, Testimonial, User, Video,
} from '../models/index.js';
import { authenticate, requireMfa, requireRole } from '../middleware/auth.js';
import { audit } from '../services/audit.js';
import { cancelSubscription, extendSubscription, grantSubscription } from '../services/subscription.js';
import { AppError, wrap } from '../utils/errors.js';
import { escapeRegex, MONTHS, slugify } from '../utils/money.js';
import { parseVideoUrl, videoMeta } from '../utils/video.js';

const r = Router();
// Every route below is admin-only, checked on the server, and needs a 2FA-verified session.
r.use(authenticate, requireRole('admin'), requireMfa);

const clean = (html: string) =>
  sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2']),
    allowedAttributes: { a: ['href', 'target', 'rel'], img: ['src', 'alt'] },
    allowedSchemes: ['http', 'https'],
  });
const plain = (s: string) => sanitizeHtml(s, { allowedTags: [], allowedAttributes: {} });
const oid = z.string().length(24);
const access = z.enum(ACCESS);
const DAY = 864e5;
const now = () => new Date();
const activeSubFilter = () => ({ status: 'active', endsAt: { $gt: now() } });
const paging = (q: any) => ({ page: Math.max(1, +q.page || 1), limit: Math.min(100, +q.limit || 20) });

/* ----- Overview + reports ----- */
r.get('/stats', wrap(async (_req, res) => {
  const monthStart = new Date(now().getFullYear(), now().getMonth(), 1);
  const [users, premium, posts, revenue, newLeads, monthRevenue] = await Promise.all([
    User.countDocuments(),
    Subscription.distinct('user', activeSubFilter()).then((a) => a.length),
    BlogPost.countDocuments({ status: 'published' }),
    Payment.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amountPaise' } } }]),
    Lead.countDocuments({ status: 'new' }),
    Payment.aggregate([{ $match: { status: 'paid', paidAt: { $gte: monthStart } } }, { $group: { _id: null, total: { $sum: '$amountPaise' } } }]),
  ]);
  res.json({ users, activePremium: premium, publishedPosts: posts, revenuePaise: revenue[0]?.total ?? 0, newLeads, monthRevenuePaise: monthRevenue[0]?.total ?? 0 });
}));

r.get('/reports', wrap(async (req, res) => {
  const q = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() }).parse(req.query);
  const to = q.to ?? now();
  const from = q.from ?? new Date(to.getTime() - 365 * DAY);
  const range = { $gte: from, $lte: to };
  const monthKey = (field: string) => ({ $dateToString: { format: '%Y-%m', date: field, timezone: 'Asia/Kolkata' } });

  const [signups, revenueByMonth, revenueByPlan, activeByProduct, activeBySegment, renewals, leads] = await Promise.all([
    User.aggregate([{ $match: { createdAt: range } }, { $group: { _id: monthKey('$createdAt'), count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Payment.aggregate([{ $match: { status: 'paid', paidAt: range } }, { $group: { _id: monthKey('$paidAt'), revenuePaise: { $sum: '$amountPaise' }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Payment.aggregate([
      { $match: { status: 'paid', paidAt: range } },
      { $group: { _id: '$plan', revenuePaise: { $sum: '$amountPaise' }, count: { $sum: 1 } } },
      { $lookup: { from: 'plans', localField: '_id', foreignField: '_id', as: 'plan' } },
      { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, plan: { $ifNull: ['$plan.name', 'Deleted plan'] }, product: '$plan.product', revenuePaise: 1, count: 1 } },
      { $sort: { revenuePaise: -1 } },
    ]),
    Subscription.aggregate([{ $match: activeSubFilter() }, { $group: { _id: '$product', users: { $addToSet: '$user' } } }, { $project: { _id: 0, product: '$_id', count: { $size: '$users' } } }]),
    Subscription.aggregate([{ $match: { ...activeSubFilter(), product: 'trade' } }, { $group: { _id: '$segment', users: { $addToSet: '$user' } } }, { $project: { _id: 0, segment: '$_id', count: { $size: '$users' } } }]),
    Payment.aggregate([{ $match: { status: 'paid', paidAt: range } }, { $group: { _id: { $cond: ['$isRenewal', 'renewal', 'new'] }, count: { $sum: 1 }, revenuePaise: { $sum: '$amountPaise' } } }]),
    Lead.aggregate([{ $match: { createdAt: range } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  const totals = { signups: signups.reduce((a, b) => a + b.count, 0), revenuePaise: revenueByMonth.reduce((a, b) => a + b.revenuePaise, 0) };
  res.json({ from, to, totals, signups, revenueByMonth, revenueByPlan, activeByProduct, activeBySegment, renewals, leads });
}));

/* ----- User management ----- */
r.get('/users', wrap(async (req, res) => {
  const q = z.object({
    q: z.string().optional(), status: z.enum(['active', 'blocked']).optional(), plan: z.enum(['premium', 'free', 'trade', 'club']).optional(),
    role: z.enum(['user', 'admin']).optional(), page: z.coerce.number().default(1),
  }).parse(req.query);
  const filter: any = {};
  if (q.q) { const rx = new RegExp(escapeRegex(q.q), 'i'); filter.$or = [{ name: rx }, { email: rx }, { phone: rx }]; }
  if (q.status) filter.status = q.status;
  if (q.role) filter.role = q.role;
  if (q.plan) {
    const ids = await Subscription.distinct('user', { ...activeSubFilter(), ...(q.plan === 'trade' || q.plan === 'club' ? { product: q.plan } : {}) });
    filter._id = q.plan === 'free' ? { $nin: ids } : { $in: ids };
  }
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * 20).limit(20).select('name email phone role status createdAt lastLoginAt totpEnabled').lean(),
    User.countDocuments(filter),
  ]);
  const subs = await Subscription.find({ user: { $in: items.map((u) => u._id) }, ...activeSubFilter() }).select('user product segment endsAt').lean();
  res.json({
    total,
    items: items.map((u) => {
      const mine = subs.filter((s) => String(s.user) === String(u._id));
      return { ...u, plans: mine.map((s) => ({ product: s.product, segment: s.segment, endsAt: s.endsAt })), premiumUntil: mine.length ? new Date(Math.max(...mine.map((s) => +s.endsAt))) : null };
    }),
  });
}));

r.get('/users/:id', wrap(async (req, res) => {
  oid.parse(req.params.id);
  const u = await User.findById(req.params.id).select('-passwordHash -totpSecret -totpPendingSecret -resetTokenHash').lean();
  if (!u) throw new AppError(404, 'User not found');
  const [subscriptions, payments] = await Promise.all([
    Subscription.find({ user: u._id }).sort({ endsAt: -1 }).populate('plan', 'name code').lean(),
    Payment.find({ user: u._id }).sort({ createdAt: -1 }).populate('plan', 'name').lean(),
  ]);
  res.json({ user: u, subscriptions, payments });
}));

r.patch('/users/:id/status', wrap(async (req, res) => {
  oid.parse(req.params.id);
  const { status } = z.object({ status: z.enum(['active', 'blocked']) }).parse(req.body);
  if (req.params.id === req.user!.id) throw new AppError(400, 'You cannot block yourself');
  await User.updateOne({ _id: req.params.id }, { status, $inc: { tokenVersion: 1 } }); // also ends their sessions
  await audit(req.user!.id, `user.${status}`, req.params.id);
  res.json({ ok: true });
}));

r.patch('/users/:id/role', wrap(async (req, res) => {
  oid.parse(req.params.id);
  const { role } = z.object({ role: z.enum(['user', 'admin']) }).parse(req.body);
  if (req.params.id === req.user!.id) throw new AppError(400, 'You cannot change your own role');
  await User.updateOne({ _id: req.params.id }, { role, $inc: { tokenVersion: 1 } });
  await audit(req.user!.id, 'user.role', req.params.id, { role });
  res.json({ ok: true });
}));

r.post('/users/:id/grant', wrap(async (req, res) => {
  oid.parse(req.params.id);
  const b = z.object({ planCode: z.string(), days: z.number().int().positive().max(3650).optional(), segment: z.enum(SEGMENTS).optional() }).parse(req.body);
  const sub = await grantSubscription(req.params.id, b.planCode, b.days, b.segment);
  await audit(req.user!.id, 'subscription.grant', req.params.id, b);
  res.status(201).json({ subscription: sub });
}));

r.post('/subscriptions/:id/extend', wrap(async (req, res) => {
  oid.parse(req.params.id);
  const { days } = z.object({ days: z.number().int().positive().max(3650) }).parse(req.body);
  const s = await extendSubscription(req.params.id, days);
  await audit(req.user!.id, 'subscription.extend', req.params.id, { days, user: String(s.user) });
  res.json({ subscription: s });
}));

r.post('/subscriptions/:id/cancel', wrap(async (req, res) => {
  oid.parse(req.params.id);
  const s = await cancelSubscription(req.params.id);
  await audit(req.user!.id, 'subscription.cancel', req.params.id, { user: String(s.user) });
  res.json({ subscription: s });
}));

/* ----- Plans and prices ----- */
r.get('/plans', wrap(async (_req, res) => { res.json({ items: await Plan.find().sort({ product: -1, sortOrder: 1, durationDays: 1 }).lean() }); }));

const planSchema = z.object({
  product: z.enum(PRODUCTS), duration: z.enum(DURATIONS), name: z.string().trim().min(2).max(80),
  pricePaise: z.number().int().min(100), durationDays: z.number().int().positive().max(3650).optional(),
  active: z.boolean().default(true), sortOrder: z.number().int().default(0),
});
r.post('/plans', wrap(async (req, res) => {
  const b = planSchema.parse(req.body);
  const p = await Plan.create({ ...b, code: `${b.product}-${b.duration.replace('_', '-')}`, durationDays: b.durationDays ?? MONTHS[b.duration] * 30 + (b.duration === 'yearly' ? 5 : 0) });
  await audit(req.user!.id, 'plan.create', p.code, b);
  res.status(201).json({ plan: p });
}));
r.patch('/plans/:code', wrap(async (req, res) => {
  const b = planSchema.pick({ name: true, pricePaise: true, durationDays: true, active: true, sortOrder: true }).partial().parse(req.body);
  const before = await Plan.findOne({ code: req.params.code }).lean();
  if (!before) throw new AppError(404, 'Plan not found');
  const p = await Plan.findOneAndUpdate({ code: req.params.code }, b, { new: true });
  await audit(req.user!.id, 'plan.update', req.params.code, { before: { pricePaise: before.pricePaise, active: before.active, name: before.name }, after: b });
  res.json({ plan: p });
}));

/* ----- Coupons ----- */
const couponSchema = z.object({
  code: z.string().trim().min(3).max(30).regex(/^[A-Za-z0-9_-]+$/, 'Letters, numbers, - and _ only'),
  description: z.string().max(200).optional(),
  type: z.enum(['percent', 'flat']),
  value: z.number().int().positive(),
  products: z.array(z.enum(PRODUCTS)).default([]),
  durations: z.array(z.enum(DURATIONS)).default([]),
  validFrom: z.coerce.date().optional().nullable(),
  validTo: z.coerce.date().optional().nullable(),
  maxUses: z.number().int().positive().optional().nullable(),
  active: z.boolean().default(true),
}).refine((c) => c.type !== 'percent' || c.value <= 100, { message: 'A percentage cannot be more than 100', path: ['value'] });

r.get('/coupons', wrap(async (_req, res) => { res.json({ items: await Coupon.find().sort({ createdAt: -1 }).lean() }); }));
r.post('/coupons', wrap(async (req, res) => {
  const b = couponSchema.parse(req.body);
  const c = await Coupon.create({ ...b, code: b.code.toUpperCase() });
  await audit(req.user!.id, 'coupon.create', c.code, b);
  res.status(201).json({ coupon: c });
}));
r.patch('/coupons/:id', wrap(async (req, res) => {
  oid.parse(req.params.id);
  const b = couponSchema.innerType().partial().omit({ code: true }).parse(req.body);
  const c = await Coupon.findByIdAndUpdate(req.params.id, b, { new: true });
  if (!c) throw new AppError(404, 'Coupon not found');
  await audit(req.user!.id, 'coupon.update', c.code, b);
  res.json({ coupon: c });
}));
r.delete('/coupons/:id', wrap(async (req, res) => {
  oid.parse(req.params.id);
  const c = await Coupon.findByIdAndDelete(req.params.id);
  if (c) await audit(req.user!.id, 'coupon.delete', c.code);
  res.json({ ok: true });
}));

/* ----- Payments ----- */
r.get('/payments', wrap(async (req, res) => {
  const q = z.object({ status: z.enum(['created', 'paid', 'failed']).optional(), product: z.enum(PRODUCTS).optional(), q: z.string().optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional() }).parse(req.query);
  const { page, limit } = paging(req.query);
  const filter: any = {};
  if (q.status) filter.status = q.status;
  if (q.product) filter.product = q.product;
  if (q.from || q.to) filter.createdAt = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lte: q.to } : {}) };
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    const users = await User.find({ $or: [{ name: rx }, { email: rx }] }).select('_id').lean();
    filter.$or = [{ invoiceNo: rx }, { razorpayOrderId: rx }, { razorpayPaymentId: rx }, { user: { $in: users.map((u) => u._id) } }];
  }
  const [items, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('user', 'name email').populate('plan', 'name').lean(),
    Payment.countDocuments(filter),
  ]);
  res.json({ items, total, page });
}));

/* ----- Blogs ----- */
const blogSchema = z.object({
  title: z.string().min(3), market: z.string().optional(), teaser: z.string().min(10).max(600), body: z.string().min(10),
  access: access.default('free'), coverImageUrl: z.string().url().optional().or(z.literal('')),
  status: z.enum(['draft', 'scheduled', 'published']).default('draft'), publishAt: z.coerce.date().optional(),
});
r.get('/blog', wrap(async (_req, res) => { res.json({ items: await BlogPost.find().sort({ createdAt: -1 }).limit(200).select('-body').lean() }); }));
r.get('/blog/:id', wrap(async (req, res) => {
  oid.parse(req.params.id);
  const post = await BlogPost.findById(req.params.id).lean();
  if (!post) throw new AppError(404, 'Post not found');
  res.json({ post });
}));
r.post('/blog', wrap(async (req, res) => {
  const b = blogSchema.parse(req.body);
  if (b.status === 'scheduled' && !b.publishAt) throw new AppError(400, 'publishAt is required for scheduled posts');
  const post = await BlogPost.create({
    ...b, body: clean(b.body), teaser: plain(b.teaser), coverImageUrl: b.coverImageUrl || undefined,
    slug: `${slugify(b.title)}-${Date.now().toString(36)}`, author: req.user!.id,
    publishedAt: b.status === 'published' ? now() : undefined,
  });
  await audit(req.user!.id, 'blog.create', String(post._id), { title: post.title });
  res.status(201).json({ post });
}));
r.patch('/blog/:id', wrap(async (req, res) => {
  oid.parse(req.params.id);
  const b = blogSchema.partial().parse(req.body);
  const existing = await BlogPost.findById(req.params.id).select('status').lean();
  if (!existing) throw new AppError(404, 'Post not found');
  const patch: any = { ...b };
  if (b.body) patch.body = clean(b.body);
  if (b.teaser) patch.teaser = plain(b.teaser);
  if (b.coverImageUrl === '') patch.coverImageUrl = undefined;
  if (b.status === 'published' && existing.status !== 'published') patch.publishedAt = now();
  const post = await BlogPost.findByIdAndUpdate(req.params.id, patch, { new: true });
  await audit(req.user!.id, 'blog.update', req.params.id, { fields: Object.keys(b) });
  res.json({ post });
}));
r.delete('/blog/:id', wrap(async (req, res) => {
  oid.parse(req.params.id);
  const p = await BlogPost.findByIdAndDelete(req.params.id);
  if (p) await audit(req.user!.id, 'blog.delete', req.params.id, { title: p.title });
  res.json({ ok: true });
}));

/* ----- Elliott Wave analysis (append-only history) ----- */
const analysisSchema = z.object({
  market: oid, title: z.string().min(3), timeframe: z.string().optional(),
  waveCount: z.string().min(3), bias: z.enum(['Bullish', 'Bearish', 'Neutral']),
  chartImageUrl: z.string().url().optional(), summary: z.string().optional(), access: access.default('premium'),
  levels: z.object({ support: z.string().optional(), resistance: z.string().optional(), target: z.string().optional(), stopLoss: z.string().optional(), notes: z.string().optional() }).optional(),
  status: z.enum(['draft', 'published']).default('published'),
});
r.post('/analysis', wrap(async (req, res) => {
  const b = analysisSchema.parse(req.body);
  const a = await Analysis.create({ ...b, createdBy: req.user!.id, publishedAt: b.status === 'published' ? now() : undefined });
  await audit(req.user!.id, 'analysis.create', String(a._id), { title: a.title });
  res.status(201).json({ analysis: a });
}));
/** Never edit a published analysis: post an update that supersedes it, so history stays intact. */
r.post('/analysis/:id/update', wrap(async (req, res) => {
  oid.parse(req.params.id);
  const old = await Analysis.findOne({ _id: req.params.id, status: 'published', supersededBy: null });
  if (!old) throw new AppError(404, 'Analysis not found or already superseded');
  const b = analysisSchema.parse(req.body);
  const next = await Analysis.create({ ...b, status: 'published', publishedAt: now(), supersedes: old._id, createdBy: req.user!.id });
  old.supersededBy = next._id;
  await old.save();
  await audit(req.user!.id, 'analysis.update', req.params.id, { newId: String(next._id) });
  res.status(201).json({ analysis: next });
}));
/** Takes an analysis off the site. It stays in the database for the record. */
r.post('/analysis/:id/archive', wrap(async (req, res) => {
  oid.parse(req.params.id);
  const a = await Analysis.findByIdAndUpdate(req.params.id, { status: 'archived' }, { new: true });
  if (!a) throw new AppError(404, 'Analysis not found');
  await audit(req.user!.id, 'analysis.archive', req.params.id);
  res.json({ ok: true });
}));

/* ----- Videos ----- */
r.get('/videos', wrap(async (_req, res) => { res.json({ items: await Video.find().sort({ publishedAt: -1 }).limit(300).lean() }); }));
r.post('/videos', wrap(async (req, res) => {
  const b = z.object({
    url: z.string().url(), title: z.string().trim().max(200).optional(), description: z.string().max(1000).optional(),
    access: access.default('free'), publishedAt: z.coerce.date().optional(), thumbnail: z.string().url().optional().or(z.literal('')),
  }).parse(req.body);
  const parsed = parseVideoUrl(b.url);
  if (!parsed) throw new AppError(400, 'Paste a YouTube or Vimeo video link');
  const meta = await videoMeta(parsed.provider, parsed.videoId);
  const v = await Video.findOneAndUpdate(
    parsed,
    { $set: { ...parsed, title: b.title || meta.title || 'Untitled video', description: b.description, access: b.access, thumbnail: b.thumbnail || meta.thumbnail, source: 'manual', hidden: false, publishedAt: b.publishedAt ?? now() } },
    { upsert: true, new: true },
  );
  await audit(req.user!.id, 'video.create', String(v._id), { url: b.url });
  res.status(201).json({ video: v });
}));
r.patch('/videos/:id', wrap(async (req, res) => {
  oid.parse(req.params.id);
  const b = z.object({ title: z.string().trim().min(1).max(200).optional(), description: z.string().max(1000).optional(), access: access.optional(), hidden: z.boolean().optional() }).parse(req.body);
  const v = await Video.findByIdAndUpdate(req.params.id, b, { new: true });
  if (!v) throw new AppError(404, 'Video not found');
  await audit(req.user!.id, 'video.update', req.params.id, b);
  res.json({ video: v });
}));
r.delete('/videos/:id', wrap(async (req, res) => {
  oid.parse(req.params.id);
  const v = await Video.findById(req.params.id);
  if (!v) throw new AppError(404, 'Video not found');
  // Synced videos would come back on the next sync, so they are hidden instead of deleted.
  if (v.source === 'sync') { v.hidden = true; await v.save(); } else await v.deleteOne();
  await audit(req.user!.id, 'video.delete', req.params.id);
  res.json({ ok: true });
}));

/* ----- FAQs ----- */
const faqSchema = z.object({ question: z.string().trim().min(5).max(300), answer: z.string().trim().min(5).max(3000), order: z.number().int().default(0), active: z.boolean().default(true) });
r.get('/faqs', wrap(async (_req, res) => { res.json({ items: await Faq.find().sort({ order: 1, createdAt: 1 }).lean() }); }));
r.post('/faqs', wrap(async (req, res) => {
  const b = faqSchema.parse(req.body);
  const f = await Faq.create({ ...b, question: plain(b.question), answer: plain(b.answer) });
  await audit(req.user!.id, 'faq.create', String(f._id));
  res.status(201).json({ faq: f });
}));
r.patch('/faqs/:id', wrap(async (req, res) => {
  oid.parse(req.params.id);
  const b = faqSchema.partial().parse(req.body);
  if (b.question) b.question = plain(b.question);
  if (b.answer) b.answer = plain(b.answer);
  const f = await Faq.findByIdAndUpdate(req.params.id, b, { new: true });
  if (!f) throw new AppError(404, 'FAQ not found');
  await audit(req.user!.id, 'faq.update', req.params.id);
  res.json({ faq: f });
}));
r.delete('/faqs/:id', wrap(async (req, res) => {
  oid.parse(req.params.id);
  await Faq.findByIdAndDelete(req.params.id);
  await audit(req.user!.id, 'faq.delete', req.params.id);
  res.json({ ok: true });
}));

/* ----- Testimonials ----- */
const testimonialSchema = z.object({
  firstName: z.string().trim().min(2).max(40), city: z.string().trim().min(2).max(60), text: z.string().trim().min(10).max(800),
  rating: z.number().int().min(1).max(5).optional().nullable(), consent: z.boolean(), order: z.number().int().default(0), active: z.boolean().default(true),
});
r.get('/testimonials', wrap(async (_req, res) => { res.json({ items: await Testimonial.find().sort({ order: 1, createdAt: -1 }).lean() }); }));
r.post('/testimonials', wrap(async (req, res) => {
  const b = testimonialSchema.parse(req.body);
  const t = await Testimonial.create({ ...b, text: plain(b.text) });
  await audit(req.user!.id, 'testimonial.create', String(t._id));
  res.status(201).json({ testimonial: t });
}));
r.patch('/testimonials/:id', wrap(async (req, res) => {
  oid.parse(req.params.id);
  const b = testimonialSchema.partial().parse(req.body);
  if (b.text) b.text = plain(b.text);
  const t = await Testimonial.findByIdAndUpdate(req.params.id, b, { new: true });
  if (!t) throw new AppError(404, 'Testimonial not found');
  await audit(req.user!.id, 'testimonial.update', req.params.id);
  res.json({ testimonial: t });
}));
r.delete('/testimonials/:id', wrap(async (req, res) => {
  oid.parse(req.params.id);
  await Testimonial.findByIdAndDelete(req.params.id);
  await audit(req.user!.id, 'testimonial.delete', req.params.id);
  res.json({ ok: true });
}));

/* ----- Callback leads ----- */
const leadFilter = (query: any) => {
  const q = z.object({ status: z.enum(['new', 'contacted', 'converted']).optional(), q: z.string().optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional() }).parse(query);
  const f: any = {};
  if (q.status) f.status = q.status;
  if (q.q) { const rx = new RegExp(escapeRegex(q.q), 'i'); f.$or = [{ name: rx }, { mobile: rx }]; }
  if (q.from || q.to) f.createdAt = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lte: q.to } : {}) };
  return f;
};
r.get('/leads', wrap(async (req, res) => {
  const filter = leadFilter(req.query);
  const { page, limit } = paging(req.query);
  const [items, total, counts] = await Promise.all([
    Lead.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select('-ip -userAgent').lean(),
    Lead.countDocuments(filter),
    Lead.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  res.json({ items, total, page, counts: Object.fromEntries(counts.map((c) => [c._id, c.n])) });
}));
r.patch('/leads/:id', wrap(async (req, res) => {
  oid.parse(req.params.id);
  const b = z.object({ status: z.enum(['new', 'contacted', 'converted']).optional(), notes: z.string().max(2000).optional() }).parse(req.body);
  const l = await Lead.findByIdAndUpdate(req.params.id, b, { new: true });
  if (!l) throw new AppError(404, 'Lead not found');
  await audit(req.user!.id, 'lead.update', req.params.id, b);
  res.json({ lead: l });
}));

const CAPITAL_TEXT: Record<(typeof CAPITAL_RANGES)[number], string> = { below_1l: 'Below 1,00,000', '1l_5l': '1,00,000-5,00,000', '5l_10l': '5,00,000-10,00,000', above_10l: 'Above 10,00,000' };
/** CSV cell: quoted, and protected against spreadsheet formula injection. */
const cell = (v: unknown) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};
r.get('/leads.csv', wrap(async (req, res) => {
  const items = await Lead.find(leadFilter(req.query)).sort({ createdAt: -1 }).limit(50_000).lean();
  const lines = [['Date', 'Name', 'Mobile', 'Trading capital', 'Status', 'Notes', 'Page'].map(cell).join(',')];
  for (const l of items) {
    lines.push([new Date(l.createdAt as any).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), l.name, `+91 ${l.mobile}`, CAPITAL_TEXT[l.capital as keyof typeof CAPITAL_TEXT], l.status, l.notes ?? '', l.page ?? ''].map(cell).join(','));
  }
  await audit(req.user!.id, 'lead.export', undefined, { count: items.length });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="waves4u-leads-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send('﻿' + lines.join('\r\n')); // BOM so Excel reads ₹ and accents correctly
}));

/* ----- Mentorship sessions ----- */
r.post('/sessions', wrap(async (req, res) => {
  const b = z.object({ title: z.string().min(3), description: z.string().optional(), startsAt: z.coerce.date(), joinLink: z.string().url().optional(), capacity: z.number().int().positive().default(50) }).parse(req.body);
  const s = await MentorSession.create(b);
  await audit(req.user!.id, 'session.create', String(s._id));
  res.status(201).json({ session: s });
}));
r.delete('/sessions/:id', wrap(async (req, res) => {
  oid.parse(req.params.id);
  await MentorSession.findByIdAndDelete(req.params.id);
  await audit(req.user!.id, 'session.delete', req.params.id);
  res.json({ ok: true });
}));

/* ----- Audit log ----- */
r.get('/audit', wrap(async (req, res) => {
  const { page, limit } = paging({ ...req.query, limit: req.query.limit ?? 50 });
  const [items, total] = await Promise.all([
    AuditLog.find().sort({ at: -1 }).skip((page - 1) * limit).limit(limit).populate('actor', 'name email').lean(),
    AuditLog.countDocuments(),
  ]);
  res.json({ items, total, page });
}));

export default r;
