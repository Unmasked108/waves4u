import Link from 'next/link';
import { Youtube } from 'lucide-react';
import { sget } from '@/lib/server';
import { SITE } from '@/lib/site';
import type { Video } from '@/lib/types';
import { Empty } from '@/components/Cards';
import PageHero from '@/components/PageHero';
import Reveal from '@/components/Reveal';
import VideoPlayer from '@/components/VideoPlayer';

export const metadata = {
  title: 'Videos',
  description: 'Market analysis and Elliott Wave education videos from waves4u. Free videos plus member-only sessions.',
  alternates: { canonical: '/videos' },
};

const PER_PAGE = 12;

export default async function VideosPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const d = await sget<{ items: Video[] }>(`/api/videos?limit=${PER_PAGE}&page=${page}`);
  const items = d?.items ?? [];
  return (
    <>
      <PageHero eyebrow="Videos" title="Videos">Watch free market analysis and education right here. Member-only videos unlock with a plan.</PageHero>
      <section className="sec">
        <div className="w">
          <div className="g g3">
            {items.length ? items.map((v, i) => <Reveal key={v._id} delay={(i % 3) * 70}><VideoPlayer v={v} /></Reveal>) : <Empty>Videos will appear here soon.</Empty>}
          </div>
          <nav className="row" style={{ justifyContent: 'center', marginTop: 32 }} aria-label="Pagination">
            {page > 1 && <Link className="btn" href={`/videos?page=${page - 1}`} rel="prev">Newer</Link>}
            {items.length === PER_PAGE && <Link className="btn" href={`/videos?page=${page + 1}`} rel="next">Older</Link>}
            <a className="btn btn-primary" href={SITE.social.youtube} target="_blank" rel="noopener noreferrer"><Youtube aria-hidden="true" /> Subscribe on YouTube</a>
          </nav>
        </div>
      </section>
    </>
  );
}
