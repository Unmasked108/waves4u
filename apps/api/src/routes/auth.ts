import crypto from 'node:crypto';
import { Router, type Response } from 'express';
import argon2 from 'argon2';
import rateLimit from 'express-rate-limit';
import QRCode from 'qrcode';
import { z } from 'zod';
import { env } from '../config.js';
import { Subscription, User } from '../models/index.js';
import { authenticate, entitlements, resolveUser, sessionStillValid } from '../middleware/auth.js';
import { audit } from '../services/audit.js';
import { clearAuthCookies, newSid, setAuthCookies, signMfaTicket, verifyMfaTicket, verifyRefresh } from '../services/token.js';
import { notify } from '../services/notifications.js';
import { AppError, wrap } from '../utils/errors.js';
import { indianMobile } from '../utils/phone.js';
import { newTotpSecret, otpauthUrl, verifyTotp } from '../utils/totp.js';

const r = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, validate: { trustProxy: false } });

const password = z.string().min(8, 'Password must be at least 8 characters').max(128);
const phone = z.literal('').or(indianMobile).optional();
const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  phone,
  password,
});
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1) });

const publicUser = (u: any) => ({ id: String(u._id), name: u.name, email: u.email, phone: u.phone ?? '', role: u.role, totpEnabled: !!u.totpEnabled });
const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const normPhone = (p?: string) => p || undefined;

/** Starts a fresh login session. With SINGLE_SESSION on, this signs out any other device. */
async function startSession(res: Response, u: any, mfa: boolean) {
  const sid = newSid();
  await User.updateOne({ _id: u._id }, { activeSid: sid, lastLoginAt: new Date() });
  setAuthCookies(res, { sub: String(u._id), sid, tv: u.tokenVersion ?? 0, mfa });
}

/** The logged-in user's details, plans and what they can access. */
async function sessionPayload(userId: string, mfa: boolean) {
  const u = await User.findById(userId).lean();
  const subs = await Subscription.find({ user: userId, status: 'active', endsAt: { $gt: new Date() } })
    .sort({ endsAt: -1 }).populate('plan', 'code name product duration').lean();
  const ent = await entitlements(userId, u!.role);
  return {
    user: publicUser(u!),
    ...ent,
    mfa,
    needs2fa: u!.role === 'admin' && env.ADMIN_2FA_REQUIRED && !mfa,
    subscriptions: subs.map((s) => ({ id: String(s._id), plan: s.plan, product: s.product, segment: s.segment ?? null, startsAt: s.startsAt, endsAt: s.endsAt })),
    // Kept for older UI code: the plan that expires last.
    subscription: subs[0] ? { plan: subs[0].plan, endsAt: subs[0].endsAt } : null,
  };
}

r.post('/register', limiter, wrap(async (req, res) => {
  const b = registerSchema.parse(req.body);
  if (await User.exists({ email: b.email.toLowerCase() })) throw new AppError(409, 'Email already registered');
  const u = await User.create({ name: b.name, email: b.email, phone: normPhone(b.phone), passwordHash: await argon2.hash(b.password) });
  await notify(u._id, 'email', 'welcome', { name: u.name });
  await startSession(res, u, false);
  res.status(201).json({ user: publicUser(u) });
}));

r.post('/login', limiter, wrap(async (req, res) => {
  const b = loginSchema.parse(req.body);
  const u = await User.findOne({ email: b.email.toLowerCase() });
  // Same message for unknown email and wrong password
  if (!u || !(await argon2.verify(u.passwordHash, b.password))) throw new AppError(401, 'Invalid email or password');
  if (u.status !== 'active') throw new AppError(403, 'Account is blocked. Please contact support.');
  if (u.totpEnabled) return res.json({ twoFactorRequired: true, ticket: signMfaTicket(String(u._id)) });
  await startSession(res, u, false);
  res.json({ user: publicUser(u) });
}));

/** Step 2 of login for accounts with two-factor authentication. */
r.post('/login/2fa', limiter, wrap(async (req, res) => {
  const b = z.object({ ticket: z.string(), code: z.string() }).parse(req.body);
  let userId: string;
  try { userId = verifyMfaTicket(b.ticket); } catch { throw new AppError(401, 'Your login took too long. Please start again.'); }
  const u = await User.findById(userId);
  if (!u || u.status !== 'active' || !u.totpEnabled || !u.totpSecret) throw new AppError(401, 'Please log in again');
  if (!verifyTotp(u.totpSecret, b.code)) throw new AppError(401, 'That code is not correct');
  await startSession(res, u, true);
  res.json({ user: publicUser(u) });
}));

r.post('/refresh', wrap(async (req, res) => {
  const token = req.cookies?.rt;
  if (!token) throw new AppError(401, 'Please log in');
  let p;
  try { p = verifyRefresh(token); } catch { throw new AppError(401, 'Please log in'); }
  const u = await User.findById(p.sub).select('status tokenVersion activeSid');
  if (!u || !sessionStillValid(u, p)) throw new AppError(401, 'Please log in');
  setAuthCookies(res, { sub: p.sub, sid: p.sid, tv: p.tv, mfa: !!p.mfa });
  res.json({ ok: true });
}));

r.post('/logout', wrap(async (req, res) => {
  const me = await resolveUser(req);
  if (me && env.SINGLE_SESSION) await User.updateOne({ _id: me.id }, { activeSid: '' });
  clearAuthCookies(res);
  res.json({ ok: true });
}));

/** Logs the user out of every device. */
r.post('/logout-all', authenticate, wrap(async (req, res) => {
  await User.updateOne({ _id: req.user!.id }, { $inc: { tokenVersion: 1 }, activeSid: '' });
  clearAuthCookies(res);
  res.json({ ok: true });
}));

/** Strict version: 401 if not logged in. */
r.get('/me', authenticate, wrap(async (req, res) => {
  res.json(await sessionPayload(req.user!.id, req.user!.mfa));
}));

/**
 * What the website asks on every page load: "who is logged in?"
 * It ALWAYS answers 200, with { user: null } for visitors, so the browser console stays free of red 401 errors.
 * If the 15-minute access token expired but the refresh cookie is still valid, the login is renewed right here.
 */
r.get('/session', wrap(async (req, res) => {
  const me = await resolveUser(req);
  let userId = me?.id;
  let mfa = !!me?.mfa;
  let refreshed = false;

  if (!userId && req.cookies?.rt) {
    try {
      const p = verifyRefresh(req.cookies.rt);
      const u = await User.findById(p.sub).select('status tokenVersion activeSid');
      if (u && sessionStillValid(u, p)) {
        setAuthCookies(res, { sub: p.sub, sid: p.sid, tv: p.tv, mfa: !!p.mfa });
        userId = p.sub;
        mfa = !!p.mfa;
        refreshed = true;
      } else if (u && env.SINGLE_SESSION && u.activeSid && u.activeSid !== p.sid) {
        clearAuthCookies(res);
        return res.json({ user: null, isPremium: false, subscription: null, subscriptions: [], signedOutElsewhere: true });
      }
    } catch {
      // invalid or expired refresh token: treat as a visitor
    }
  }

  if (!userId) return res.json({ user: null, isPremium: false, subscription: null, subscriptions: [] });
  res.json({ ...(await sessionPayload(userId, mfa)), refreshed });
}));

/* ----- Profile ----- */
r.patch('/me', authenticate, wrap(async (req, res) => {
  const b = z.object({ name: z.string().trim().min(2).max(80).optional(), phone }).parse(req.body);
  const patch: any = {};
  if (b.name) patch.name = b.name;
  if (b.phone !== undefined) patch.phone = normPhone(b.phone) ?? '';
  const u = await User.findByIdAndUpdate(req.user!.id, patch, { new: true });
  res.json({ user: publicUser(u) });
}));

r.post('/change-password', limiter, authenticate, wrap(async (req, res) => {
  const b = z.object({ currentPassword: z.string().min(1), newPassword: password }).parse(req.body);
  const u = await User.findById(req.user!.id);
  if (!u || !(await argon2.verify(u.passwordHash, b.currentPassword))) throw new AppError(400, 'Your current password is not correct');
  u.passwordHash = await argon2.hash(b.newPassword);
  u.tokenVersion += 1; // signs out every other device
  await u.save();
  await notify(u._id, 'email', 'password_changed');
  await startSession(res, u, req.user!.mfa);
  res.json({ ok: true });
}));

/* ----- Forgot / reset password ----- */
r.post('/forgot-password', limiter, wrap(async (req, res) => {
  const { email } = z.object({ email: z.string().trim().email() }).parse(req.body);
  const u = await User.findOne({ email: email.toLowerCase(), status: 'active' });
  if (u) {
    const token = crypto.randomBytes(32).toString('hex');
    u.resetTokenHash = sha256(token);
    u.resetTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await u.save();
    await notify(u._id, 'email', 'password_reset', { url: `${env.CLIENT_URL}/reset-password?token=${token}` });
  }
  // Same answer whether or not the email exists, so accounts cannot be discovered.
  res.json({ ok: true });
}));

r.post('/reset-password', limiter, wrap(async (req, res) => {
  const b = z.object({ token: z.string().min(20), password }).parse(req.body);
  const u = await User.findOne({ resetTokenHash: sha256(b.token), resetTokenExpiresAt: { $gt: new Date() } });
  if (!u) throw new AppError(400, 'This reset link is invalid or has expired. Please request a new one.');
  u.passwordHash = await argon2.hash(b.password);
  u.resetTokenHash = undefined;
  u.resetTokenExpiresAt = undefined;
  u.tokenVersion += 1;
  u.activeSid = '';
  await u.save();
  await notify(u._id, 'email', 'password_changed');
  res.json({ ok: true });
}));

/* ----- Two-factor authentication (TOTP) ----- */
r.post('/2fa/setup', authenticate, wrap(async (req, res) => {
  const u = await User.findById(req.user!.id);
  if (!u) throw new AppError(404, 'User not found');
  if (u.totpEnabled) throw new AppError(400, 'Two-factor authentication is already on');
  const secret = newTotpSecret();
  u.totpPendingSecret = secret;
  await u.save();
  const url = otpauthUrl(secret, u.email);
  res.json({ secret, otpauthUrl: url, qr: await QRCode.toDataURL(url, { margin: 1, width: 220 }) });
}));

r.post('/2fa/enable', limiter, authenticate, wrap(async (req, res) => {
  const { code } = z.object({ code: z.string() }).parse(req.body);
  const u = await User.findById(req.user!.id);
  if (!u?.totpPendingSecret) throw new AppError(400, 'Start the setup again');
  if (!verifyTotp(u.totpPendingSecret, code)) throw new AppError(400, 'That code is not correct. Check the time on your phone and try again.');
  u.totpSecret = u.totpPendingSecret;
  u.totpPendingSecret = undefined;
  u.totpEnabled = true;
  await u.save();
  await audit(String(u._id), '2fa.enable', String(u._id));
  await startSession(res, u, true); // this session has now passed 2FA
  res.json({ ok: true });
}));

r.post('/2fa/disable', limiter, authenticate, wrap(async (req, res) => {
  const { code } = z.object({ code: z.string() }).parse(req.body);
  const u = await User.findById(req.user!.id);
  if (!u?.totpEnabled || !u.totpSecret) throw new AppError(400, 'Two-factor authentication is not on');
  if (u.role === 'admin' && env.ADMIN_2FA_REQUIRED) throw new AppError(400, 'Admins must keep two-factor authentication on');
  if (!verifyTotp(u.totpSecret, code)) throw new AppError(400, 'That code is not correct');
  u.totpEnabled = false;
  u.totpSecret = undefined;
  await u.save();
  await audit(String(u._id), '2fa.disable', String(u._id));
  res.json({ ok: true });
}));

export default r;
