'use client';
import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { api } from '@/lib/client';
import { fmtDateTime, type Session } from '@/lib/types';
import Notice from '@/components/Notice';

const blank = { title: '', description: '', startsAt: '', joinLink: '', capacity: 50 };

export default function AdminSessions() {
  const [f, setF] = useState(blank);
  const [items, setItems] = useState<Session[]>([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const load = () => api<{ items: Session[] }>('/sessions').then((d) => setItems(d.items)).catch(() => {});
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg(''); setErr('');
    try {
      await api('/admin/sessions', { method: 'POST', body: { title: f.title, description: f.description || undefined, startsAt: new Date(f.startsAt).toISOString(), joinLink: f.joinLink || undefined, capacity: Number(f.capacity) } });
      setMsg('Session created'); setF(blank); load();
    } catch (e: any) { setErr(e.message); }
  }
  async function remove(s: Session) {
    setMsg(''); setErr('');
    try { await api(`/admin/sessions/${s._id}`, { method: 'DELETE' }); setMsg('Session deleted'); load(); } catch (e: any) { setErr(e.message); }
  }
  return (
    <>
      <Notice msg={msg} err={err} />
      <h1>Mentorship <span className="gold">sessions</span></h1>
      <form className="card" onSubmit={submit}>
        <div className="field"><label htmlFor="s-title">Title</label><input id="s-title" required minLength={3} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div className="field"><label htmlFor="s-desc">Description (optional)</label><textarea id="s-desc" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div className="g g3" style={{ gap: '0 16px' }}>
          <div className="field"><label htmlFor="s-at">Starts at</label><input id="s-at" type="datetime-local" required value={f.startsAt} onChange={(e) => setF({ ...f, startsAt: e.target.value })} /></div>
          <div className="field"><label htmlFor="s-link">Join link (Zoom/Meet, members only)</label><input id="s-link" type="url" value={f.joinLink} onChange={(e) => setF({ ...f, joinLink: e.target.value })} /></div>
          <div className="field"><label htmlFor="s-cap">Capacity</label><input id="s-cap" type="number" min={1} value={f.capacity} onChange={(e) => setF({ ...f, capacity: Number(e.target.value) })} /></div>
        </div>
        <button className="btn btn-primary">Create session</button>
      </form>
      <h2>Upcoming</h2>
      <div className="table-wrap"><table>
        <thead><tr><th>Title</th><th>When</th><th>Registered</th><th></th></tr></thead>
        <tbody>
          {items.map((s) => <tr key={s._id}><td><b>{s.title}</b></td><td className="nw">{fmtDateTime(s.startsAt)}</td><td>{s.registrations?.length ?? 0} / {s.capacity}</td>
            <td><button className="btn btn-sm btn-danger" onClick={() => remove(s)} aria-label={`Delete ${s.title}`}><Trash2 aria-hidden="true" /></button></td></tr>)}
          {!items.length && <tr><td colSpan={4}>None yet.</td></tr>}
        </tbody>
      </table></div>
    </>
  );
}
