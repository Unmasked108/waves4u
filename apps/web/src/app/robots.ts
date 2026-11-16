import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  // Staging / client-review deployments must never appear in search results.
  if (process.env.SITE_NOINDEX === 'true') return { rules: [{ userAgent: '*', disallow: '/' }] };
  return {
    // Member-only, account and payment pages are never indexed.
    rules: [{ userAgent: '*', allow: '/', disallow: ['/dashboard', '/admin', '/checkout', '/api/', '/login', '/register', '/forgot-password', '/reset-password', '/thank-you'] }],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
