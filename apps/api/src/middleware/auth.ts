import type { Request, RequestHandler } from 'express';
import { env } from '../config.js';
import { Subscription, User, type Access } from '../models/index.js';
import { verifyAccess, type Claims } from '../services/token.js';
import { AppError, wrap } from '../utils/errors.js';

/** Checks that a token's session is still the user's live session. Shared by access and refresh checks. */
export function sessionStillValid(u: { status?: string | null; tokenVersion?: number | null; activeSid?: string | null }, c: Claims) {
  if (u.status !== 'active') return false;
  if ((u.tokenVersion ?? 0) !== c.tv) return false;
  if (env.SINGLE_SESSION && u.activeSid && u.activeSid !== c.sid) return false;
  return true;
}

/** What a user is entitled to right now, based on their active subscriptions. */
export async function entitlements(userId: unknown, role: string) {
  const subs = await Subscription.find({ user: userId, status: 'active', endsAt: { $gt: new Date() } })
    .select('product segment').lean();
  const admin = role === 'admin';
  return {
    isPremium: admin || subs.length > 0,
    isClub: admin || subs.some((s) => s.product === 'club'),
    segments: [...new Set(subs.filter((s) => s.product === 'trade' && s.segment).map((s) => s.segment as string))],
  };
}

export async function resolveUser(req: Request): Promise<Express.Request['user'] | null> {
  const token = req.cookies?.at;
  if (!token) return null;
  let c: Claims;
  try {
    c = verifyAccess(token);
  } catch {
    return null;
  }
  const u = await User.findById(c.sub).select('role status tokenVersion activeSid').lean();
  if (!u || !sessionStillValid(u, c)) return null;
  return { id: String(u._id), role: u.role as 'user' | 'admin', mfa: !!c.mfa, ...(await entitlements(u._id, u.role)) };
}

/** Requires a logged-in user. */
export const authenticate: RequestHandler = wrap(async (req, _res, next) => {
  const u = await resolveUser(req);
  if (!u) throw new AppError(401, 'Please log in');
  req.user = u;
  next();
});

/** Attaches the user if logged in, but allows visitors too (used for teaser vs full content). */
export const optionalAuth: RequestHandler = wrap(async (req, _res, next) => {
  const u = await resolveUser(req);
  if (u) req.user = u;
  next();
});

export const requireRole =
  (role: 'admin'): RequestHandler =>
  (req, _res, next) =>
    req.user?.role === role ? next() : next(new AppError(403, 'Forbidden'));

/** Admin API needs a session that passed two-factor authentication. */
export const requireMfa: RequestHandler = (req, _res, next) =>
  !env.ADMIN_2FA_REQUIRED || req.user?.mfa ? next() : next(new AppError(403, 'Two-factor authentication required'));

export const requirePremium: RequestHandler = (req, _res, next) =>
  req.user?.isPremium ? next() : next(new AppError(403, 'Premium membership required'));

/** Can this request's user see content marked with `access`? */
export function canSee(user: Express.Request['user'] | undefined, access: Access | string | undefined | null) {
  if (!access || access === 'free') return true;
  if (access === 'premium') return !!user?.isPremium;
  if (access === 'club') return !!user?.isClub;
  return false;
}
