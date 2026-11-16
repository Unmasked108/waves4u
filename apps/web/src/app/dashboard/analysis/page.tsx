'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import type { Analysis } from '@/lib/types';
import { AnalysisCard, Empty } from '@/components/Cards';
import { SkeletonCards } from '@/components/Skeleton';

export default function MemberAnalysis() {
  const [items, setItems] = useState<Analysis[] | null>(null);
  useEffect(() => { api<{ items: Analysis[] }>('/analysis').then((d) => setItems(d.items)).catch(() => setItems([])); }, []);
  return (
    <>
      <h1>Market <span className="gold">analysis</span></h1>
      {items === null ? <SkeletonCards n={3} /> : items.length ? <div className="g g2">{items.map((a) => <AnalysisCard key={a._id} a={a} />)}</div> : <Empty>Nothing published yet.</Empty>}
    </>
  );
}
