import Link from 'next/link';
import { ArrowRight, Crown, Lock, Unlock, Users, Waves } from 'lucide-react';
import type { Access, Analysis, BlogItem } from '@/lib/types';
import { fmtDate } from '@/lib/types';
import WaveSketch from './WaveSketch';

export function AccessPill({ access }: { access?: Access }) {
  if (access === 'premium') return <span className="pill pill-premium"><Crown aria-hidden="true" /> Premium</span>;
  if (access === 'club') return <span className="pill pill-club"><Users aria-hidden="true" /> Club</span>;
  return <span className="pill pill-free"><Unlock aria-hidden="true" /> Free</span>;
}

export function AnalysisCard({ a, big }: { a: Analysis; big?: boolean }) {
  const L = a.levels;
  const levels = L ? ([['Support', L.support], ['Resistance', L.resistance], ['Target', L.target], ['Stop loss', L.stopLoss]] as const).filter(([, v]) => v) : [];
  return (
    <article className={'card acard' + (big ? ' big' : '')}>
      <div className="chart">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {a.chartImageUrl ? <img src={a.chartImageUrl} alt={`${a.market?.name} chart: ${a.waveCount}`} loading="lazy" decoding="async" /> : <WaveSketch bias={a.bias} />}
      </div>
      <div>
        <div className="meta">
          <span className={'pill ' + (a.bias === 'Bearish' ? 'pill-bad' : a.bias === 'Bullish' ? 'pill-ok' : '')}>{a.bias}</span>
          {a.market?.category && <span className="pill">{a.market.category}</span>}
          <AccessPill access={a.access} />
          {a.publishedAt && <time dateTime={a.publishedAt}>{fmtDate(a.publishedAt)}</time>}
        </div>
        <h3>{a.market?.name}{a.timeframe ? ` · ${a.timeframe}` : ''}</h3>
        <p className="count">{a.waveCount}</p>
        {a.summary && <p>{a.summary}</p>}
        {L ? (
          <>
            {levels.length > 0 && <div className="lv">{levels.map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}</div>}
            {L.notes && <p style={{ marginTop: 12, fontSize: '.9rem' }}>{L.notes}</p>}
          </>
        ) : a.locked ? (
          <div className="lockrow"><Lock aria-hidden="true" /> Levels &amp; targets for {a.access === 'club' ? 'club members' : 'members'} <Link href="/plans">Unlock</Link></div>
        ) : null}
      </div>
    </article>
  );
}

export function BlogCard({ b, feat }: { b: BlogItem; feat?: boolean }) {
  return (
    <Link href={`/blogs/${b.slug}`} className={'card lift post' + (feat ? ' feat' : '')}>
      {b.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <div className="cover"><img src={b.coverImageUrl} alt="" loading="lazy" decoding="async" /></div>
      )}
      <div className="meta">
        {b.market && <span className="pill">{b.market}</span>}
        {b.access && b.access !== 'free' && <AccessPill access={b.access} />}
        {b.publishedAt && <time dateTime={b.publishedAt}>{fmtDate(b.publishedAt)}</time>}
      </div>
      <h3>{b.title}</h3>
      <p>{b.teaser}</p>
      <span className="more">Read article <ArrowRight aria-hidden="true" /></span>
    </Link>
  );
}

/** Friendly placeholder for sections with nothing to show yet. */
export const Empty = ({ children }: { children: React.ReactNode }) => (
  <div className="empty">
    <Waves aria-hidden="true" />
    <p>{children}</p>
  </div>
);
