import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Lock } from 'lucide-react';
import { sget } from '@/lib/server';
import { SITE } from '@/lib/site';
import { fmtDate, type Access } from '@/lib/types';
import { AccessPill } from '@/components/Cards';
import JsonLd from '@/components/JsonLd';
import PageHero from '@/components/PageHero';

type Res = {
  locked: boolean;
  post: { title: string; slug: string; teaser: string; market?: string; access: Access; coverImageUrl?: string; publishedAt?: string; updatedAt?: string; author: string; body?: string };
};

const load = (slug: string) => sget<Res>(`/api/blog/${encodeURIComponent(slug)}`);

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const d = await load(params.slug);
  if (!d) return { title: 'Article not found' };
  const p = d.post;
  return {
    title: p.title,
    description: p.teaser.slice(0, 160),
    alternates: { canonical: `/blogs/${p.slug}` },
    openGraph: { type: 'article', title: p.title, description: p.teaser.slice(0, 200), url: `/blogs/${p.slug}`, publishedTime: p.publishedAt, images: p.coverImageUrl ? [p.coverImageUrl] : ['/logo.png'] },
    // Members-only articles: the body is never sent to search engines, and the page is kept out of the index.
    robots: p.access !== 'free' ? { index: false, follow: true } : undefined,
  };
}

export default async function PostPage({ params }: { params: { slug: string } }) {
  const d = await load(params.slug);
  if (!d) notFound();
  const { post, locked } = d;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.teaser,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: { '@type': 'Organization', name: post.author || 'waves4u Research' },
    publisher: { '@type': 'Organization', name: 'waves4u', logo: { '@type': 'ImageObject', url: `${SITE.url}/logo.png` } },
    mainEntityOfPage: `${SITE.url}/blogs/${post.slug}`,
    image: post.coverImageUrl ?? `${SITE.url}/logo.png`,
    isAccessibleForFree: post.access === 'free',
  };
  return (
    <>
      <JsonLd data={ld} />
      <PageHero title={post.title} crumbs={[['/blogs', 'Blogs']]} />
      <article className="sec">
        <div className="w">
          <div className="prose" style={{ margin: '0 auto' }}>
            <div className="meta">
              {post.market && <span className="pill">{post.market}</span>}
              <AccessPill access={post.access} />
              {post.publishedAt && <time dateTime={post.publishedAt}>{fmtDate(post.publishedAt)}</time>}
              <span>· {post.author}</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {post.coverImageUrl && <img src={post.coverImageUrl} alt="" style={{ width: '100%', margin: '8px 0 20px' }} />}
            <p className="lead" style={{ color: 'var(--text)' }}>{post.teaser}</p>
            {locked ? (
              <div className="card feature" style={{ marginTop: 16 }}>
                <h2 className="row" style={{ fontSize: '1.3rem', gap: 8 }}><Lock size={20} aria-hidden="true" /> The rest of this article is for {post.access === 'club' ? 'waves4u club members' : 'members'}</h2>
                <p>Join to read the full article and get member-only analysis and videos.</p>
                <div className="row"><Link href="/plans" className="btn btn-gold">See plans</Link><Link href={`/login?next=/blogs/${post.slug}`} className="btn btn-light">Login</Link></div>
              </div>
            ) : (
              // The API sanitized this HTML when the admin saved it.
              <div dangerouslySetInnerHTML={{ __html: post.body ?? '' }} />
            )}
            <div className="callout"><p><b>Disclaimer:</b> {SITE.disclaimer} This article is for education only and is not a recommendation to buy or sell.</p></div>
            <Link href="/blogs" className="more">← All blogs</Link>
          </div>
        </div>
      </article>
    </>
  );
}
