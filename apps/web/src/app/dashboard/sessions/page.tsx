'use client';
import { useEffect, useState } from 'react';
import { CalendarDays, ExternalLink } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/client';
import { fmtDateTime, type Session } from '@/lib/types';
import { Empty } from '@/components/Cards';
import Notice from '@/components/Notice';
import { SkeletonCards } from '@/components/Skeleton';
import { Lock } from '@/components/Shell';

export default function Sessions() {
  const { me } = useAuth();
  const [items, setItems] = useState<Session[] | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const load = () => api<{ items: Session[] }>('/sessions').then((d) => setItems(d.items)).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  async function register(id: string) {
    setMsg(''); setErr('');
    try { await api(`/sessions/${id}/register`, { method: 'POST' }); setMsg('You are registered.'); load(); }
    catch (e: any) { setErr(e.message); }
  }
  return (
    <>
      <h1>Live <span className="gold">sessions</span></h1>
      <Notice msg={msg} err={err} />
      {!me?.isPremium && <Lock>Live mentorship sessions are for members. You can see what is coming up below.</Lock>}
      <div className="g" style={{ marginTop: 16 }}>
        {items === null ? <SkeletonCards n={2} /> : items.length === 0 ? <Empty>No upcoming sessions.</Empty> : items.map((s) => (
          <article key={s._id} className="card">
            <h2 style={{ fontSize: '1.15rem', marginTop: 0 }}>{s.title}</h2>
            <p className="row" style={{ gap: 6 }}><CalendarDays size={16} aria-hidden="true" /> {fmtDateTime(s.startsAt)} · Live online</p>
            {s.description && <p>{s.description}</p>}
            {me?.isPremium && (s.registered
              ? <div className="row"><span className="pill pill-ok">Registered</span>{s.joinLink && <a className="btn btn-primary btn-sm" href={s.joinLink} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true" /> Join link</a>}</div>
              : <button className="btn btn-primary btn-sm" onClick={() => register(s._id)}>Register</button>)}
          </article>
        ))}
      </div>
    </>
  );
}
