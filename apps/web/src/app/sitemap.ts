import type { MetadataRoute } from 'next';
import { pget } from '@/lib/server';
import { LEGAL, SITE } from '@/lib/site';

export const dynamic = 'force-dynamic';

/** XML sitemap: public pages + every published blog. Member, admin and checkout pages are excluded. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages = ['/', '/plans', '/blogs', '/analysis', '/videos', ...LEGAL.map((l) => l.href)];
  const d = await pget<{ blogs: { slug: string; updatedAt: string }[] }>('/api/sitemap');
  return [
    ...pages.map((p) => ({
      url: `${SITE.url}${p}`,
      lastModified: now,
      changeFrequency: (p === '/' || p === '/analysis' ? 'daily' : 'weekly') as 'daily' | 'weekly',
      priority: p === '/' ? 1 : 0.7,
    })),
    ...(d?.blogs ?? []).map((b) => ({ url: `${SITE.url}/blogs/${b.slug}`, lastModified: new Date(b.updatedAt), changeFrequency: 'monthly' as const, priority: 0.6 })),
  ];
}
