import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import { env, isProd } from '../config.js';

/** sid = login session id (single-session rule), tv = token version (logout everywhere), mfa = passed 2FA. */
export type Claims = { sub: string; sid: string; tv: number; mfa: boolean };

export const newSid = () => crypto.randomBytes(12).toString('hex');

export const signAccess = (c: Claims) => jwt.sign(c, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
export const signRefresh = (c: Claims) => jwt.sign(c, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
export const verifyAccess = (t: string) => jwt.verify(t, env.JWT_ACCESS_SECRET) as Claims;
export const verifyRefresh = (t: string) => jwt.verify(t, env.JWT_REFRESH_SECRET) as Claims;

/** Short-lived ticket between "password OK" and "2FA code OK". */
export const signMfaTicket = (userId: string) =>
  jwt.sign({ sub: userId, purpose: 'mfa' }, env.JWT_ACCESS_SECRET, { expiresIn: '5m' });
export function verifyMfaTicket(t: string) {
  const p = jwt.verify(t, env.JWT_ACCESS_SECRET) as { sub: string; purpose?: string };
  if (p.purpose !== 'mfa') throw new Error('wrong token');
  return p.sub;
}

const base = { httpOnly: true, secure: isProd, sameSite: 'lax' as const };

export function setAuthCookies(res: Response, c: Claims) {
  res.cookie('at', signAccess(c), { ...base, maxAge: 15 * 60 * 1000, path: '/' });
  res.cookie('rt', signRefresh(c), { ...base, maxAge: 7 * 864e5, path: '/api/auth' });
}
export function clearAuthCookies(res: Response) {
  res.clearCookie('at', { ...base, path: '/' });
  res.clearCookie('rt', { ...base, path: '/api/auth' });
}
