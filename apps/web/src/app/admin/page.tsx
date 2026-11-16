'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { api } from '@/lib/client';
import { inr } from '@/lib/types';
import { SkeletonCards } from '@/components/Skeleton';

type S = { users: number; activePremium: number; publishedPosts: number; revenuePaise: number; newLeads: number; monthRevenuePaise: number };

export default function AdminHome() {
  const [s, setS] = useState<S | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api<S>('/admin/stats').then(setS).catch((e) => setErr(e.message)); }, []);
  const tiles: [string, string | number, string?][] = s ? [
    ['Revenue this month', inr(s.monthRevenuePaise), '/admin/reports'],
    ['Total revenue', inr(s.revenuePaise), '/admin/payments'],
    ['New callback leads', s.newLeads, '/admin/leads'],
    ['Active subscribers', s.activePremium, '/admin/users'],
    ['Registered users', s.users, '/admin/users'],
    ['Published blogs', s.publishedPosts, '/admin/blog'],
  ] : [];
  return (
    <>
      <h1>Admin <span className="gold">overview</span></h1>
      {err && <div className="form-err">{err}</div>}
      {!s ? <SkeletonCards n={3} /> : (
        <div className="g g3">
          {tiles.map(([label, value, href]) => (
            <Link key={label} href={href!} className="card lift">
              <p className="small" style={{ margin: 0 }}>{label}</p>
              <div className="stat">{value}</div>
              <span className="more small">Open <ArrowRight aria-hidden="true" /></span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
