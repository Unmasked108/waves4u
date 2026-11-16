'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import type { BlogItem } from '@/lib/types';
import { BlogCard, Empty } from '@/components/Cards';
import { SkeletonCards } from '@/components/Skeleton';

export default function MemberBlog() {
  const [items, setItems] = useState<BlogItem[] | null>(null);
  useEffect(() => { api<{ items: BlogItem[] }>('/blog?limit=30').then((d) => setItems(d.items)).catch(() => setItems([])); }, []);
  return (
    <>
      <h1><span className="gold">Blogs</span></h1>
      {items === null ? <SkeletonCards n={3} /> : items.length ? <div className="g g2">{items.map((b) => <BlogCard key={b._id} b={b} />)}</div> : <Empty>No articles yet.</Empty>}
    </>
  );
}
