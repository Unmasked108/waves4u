'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/client';
import type { Analysis, BlogItem } from '@/lib/types';
import { AnalysisCard, BlogCard, Empty } from '@/components/Cards';
import MyPlans from '@/components/MyPlans';
import { SkeletonCards } from '@/components/Skeleton';

export default function Overview() {
  const { me } = useAuth();
  const [analysis, setAnalysis] = useState<Analysis[] | null>(null);
  const [blogs, setBlogs] = useState<BlogItem[] | null>(null);
  useEffect(() => {
    api<{ items: Analysis[] }>('/analysis?limit=2').then((d) => setAnalysis(d.items)).catch(() => setAnalysis([]));
    api<{ items: BlogItem[] }>('/blog?limit=2').then((d) => setBlogs(d.items)).catch(() => setBlogs([]));
  }, []);
  if (!me) return null;
  return (
    <>
      <h1>Welcome, <span className="gold">{me.user.name.split(' ')[0]}</span></h1>
      <p>{me.isPremium ? 'Here is your plan status and the latest from our research team.' : 'You have a free account. Blogs, free analysis and videos are open to you.'}</p>

      <h2>Your plans</h2>
      <MyPlans me={me} />

      <div className="row between" style={{ marginTop: 32 }}><h2 style={{ margin: 0 }}>Latest market analysis</h2><Link href="/dashboard/analysis" className="more">View all <ArrowRight aria-hidden="true" /></Link></div>
      <div style={{ marginTop: 14 }}>
        {analysis === null ? <SkeletonCards n={2} /> : analysis.length ? <div className="g g2">{analysis.map((a) => <AnalysisCard key={a._id} a={a} />)}</div> : <Empty>Nothing published yet.</Empty>}
      </div>

      <div className="row between" style={{ marginTop: 32 }}><h2 style={{ margin: 0 }}>Latest blogs</h2><Link href="/blogs" className="more">View all <ArrowRight aria-hidden="true" /></Link></div>
      <div style={{ marginTop: 14 }}>
        {blogs === null ? <SkeletonCards n={2} /> : blogs.length ? <div className="g g2">{blogs.map((b) => <BlogCard key={b._id} b={b} />)}</div> : <Empty>No articles yet.</Empty>}
      </div>
    </>
  );
}
