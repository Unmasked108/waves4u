import Link from 'next/link';
import { sget } from '@/lib/server';
import type { BlogItem } from '@/lib/types';
import { BlogCard, Empty } from '@/components/Cards';
import PageHero from '@/components/PageHero';
import Reveal from '@/components/Reveal';

export const metadata = {
  title: 'Blogs',
  description: 'Free articles on Elliott Wave, technical analysis, derivatives and market structure from the waves4u research team.',
  alternates: { canonical: '/blogs' },
};

const PER_PAGE = 12;

export default async function BlogsPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const d = await sget<{ items: BlogItem[]; total: number }>(`/api/blog?limit=${PER_PAGE}&page=${page}`);
  const items = d?.items ?? [];
  const pages = Math.max(1, Math.ceil((d?.total ?? 0) / PER_PAGE));
  return (
    <>
      <PageHero eyebrow="Blogs" title="Blogs">Free to read: market structure, Elliott Wave, derivatives and risk management.</PageHero>
      <section className="sec">
        <div className="w">
          <div className="g g3">
            {items.length ? items.map((b, i) => <Reveal key={b._id} delay={(i % 3) * 70}><BlogCard b={b} /></Reveal>) : <Empty>No articles yet.</Empty>}
          </div>
          {pages > 1 && (
            <nav className="row" style={{ justifyContent: 'center', marginTop: 32 }} aria-label="Pagination">
              {page > 1 && <Link className="btn" href={`/blogs?page=${page - 1}`} rel="prev">Newer</Link>}
              <span className="muted">Page {page} of {pages}</span>
              {page < pages && <Link className="btn" href={`/blogs?page=${page + 1}`} rel="next">Older</Link>}
            </nav>
          )}
        </div>
      </section>
    </>
  );
}
