import { cookies } from 'next/headers';

const API = process.env.API_URL || 'http://localhost:4000';
/** Marks these server-side requests so the API does not rate-limit all visitors as one address. */
const internal: Record<string, string> = process.env.INTERNAL_API_KEY ? { 'x-internal-key': process.env.INTERNAL_API_KEY } : {};

/** Server-side GET to the backend. Forwards the visitor's login cookie, so the API decides
 *  whether this person is a visitor, free or premium. Returns null if the API is unreachable. */
export async function sget<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(API + path, { headers: { ...internal, cookie: cookies().toString() }, cache: 'no-store' });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Public, cookie-free GET (for sitemap etc.). */
export async function pget<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(API + path, { headers: internal, cache: 'no-store' });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}
