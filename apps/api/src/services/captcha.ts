import { env } from '../config.js';

/** Verifies a Cloudflare Turnstile token. Skipped when TURNSTILE_SECRET is not set (local development). */
export async function verifyCaptcha(token: string | undefined, ip?: string) {
  if (!env.TURNSTILE_SECRET) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token });
    if (ip) body.set('remoteip', ip);
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const d = (await r.json()) as { success?: boolean };
    return !!d.success;
  } catch {
    return false;
  }
}
