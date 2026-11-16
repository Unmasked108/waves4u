import { sget } from '@/lib/server';
import type { Analysis } from '@/lib/types';
import { AnalysisCard, Empty } from '@/components/Cards';
import PageHero from '@/components/PageHero';
import Reveal from '@/components/Reveal';
import { SITE } from '@/lib/site';

export const metadata = {
  title: 'Market Analysis',
  description: 'Daily and weekly Elliott Wave market analysis on indices, derivatives, commodities and currencies.',
  alternates: { canonical: '/analysis' },
};

export default async function AnalysisPage() {
  const d = await sget<{ items: Analysis[]; locked: boolean }>('/api/analysis');
  const items = d?.items ?? [];
  return (
    <>
      <PageHero eyebrow="Market analysis" title="Market Analysis">
        Daily and weekly Elliott Wave views. Everyone sees the wave count; levels on member posts are for subscribers.
      </PageHero>
      <section className="sec">
        <div className="w">
          <div className="g g2">
            {items.length ? items.map((a, i) => <Reveal key={a._id} delay={(i % 2) * 80}><AnalysisCard a={a} /></Reveal>) : <Empty>No analysis published yet.</Empty>}
          </div>
          <p className="small muted" style={{ marginTop: 28 }}>{SITE.disclaimer}</p>
        </div>
      </section>
    </>
  );
}
