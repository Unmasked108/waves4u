const API = process.env.API_URL || 'http://localhost:4000';

/** Security headers for every page (spec section 10: HTTPS, security headers). */
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com" "https://api.razorpay.com")' },
];

/** The browser only ever talks to the website (same origin). Next forwards /api/* to the backend,
 *  so login cookies are first-party and no CORS setup is needed. */
export default {
  output: 'standalone',
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'], // spec: images in WebP/AVIF
    remotePatterns: [{ protocol: 'https', hostname: 'i.ytimg.com' }, { protocol: 'https', hostname: 'i.vimeocdn.com' }],
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API}/api/:path*` }];
  },
  async redirects() {
    // Old URLs from the first version, kept so existing links and search results still work.
    return [
      { source: '/pricing', destination: '/plans', permanent: true },
      { source: '/blog', destination: '/blogs', permanent: true },
      { source: '/blog/:slug', destination: '/blogs/:slug', permanent: true },
    ];
  },
  async headers() {
    // SITE_NOINDEX=true on staging: every page tells search engines not to index it.
    const noindex = process.env.SITE_NOINDEX === 'true' ? [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] : [];
    return [{ source: '/:path*', headers: [...securityHeaders, ...noindex] }];
  },
};
