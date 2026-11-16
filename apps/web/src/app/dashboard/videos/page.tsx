'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import type { Video } from '@/lib/types';
import { Empty } from '@/components/Cards';
import { SkeletonCards } from '@/components/Skeleton';
import VideoPlayer from '@/components/VideoPlayer';

export default function MemberVideos() {
  const [items, setItems] = useState<Video[] | null>(null);
  useEffect(() => { api<{ items: Video[] }>('/videos?limit=30').then((d) => setItems(d.items)).catch(() => setItems([])); }, []);
  return (
    <>
      <h1><span className="gold">Videos</span></h1>
      <p>Free videos plus member-only videos for your plan.</p>
      {items === null ? <SkeletonCards n={3} /> : items.length ? <div className="g g2">{items.map((v) => <VideoPlayer key={v._id} v={v} />)}</div> : <Empty>No videos yet.</Empty>}
    </>
  );
}
