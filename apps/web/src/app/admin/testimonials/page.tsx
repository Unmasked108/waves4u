'use client';
import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/client';
import type { Testimonial } from '@/lib/types';
import Notice from '@/components/Notice';
import { SkeletonTable } from '@/components/Skeleton';

const blank = { firstName: '', city: '', text: '', rating: '5', consent: false };

/** Testimonials appear on the home page only when the client gave consent (spec section 3.8). */
export default function AdminTestimonials() {
  const [items, setItems] = useState<Testimonial[] | null>(null);
  const [f, setF] = useState(blank);
  const [editId, setEditId] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const load = () => api<{ items: Testimonial[] }>('/admin/testimonials').then((d) => setItems(d.items)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const run = async (fn: () => Promise<unknown>, m: string) => { setMsg(''); setErr(''); try { await fn(); setMsg(m); load(); return true; } catch (e: any) { setErr(e.message); return false; } };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = { firstName: f.firstName, city: f.city, text: f.text, rating: f.rating ? Number(f.rating) : null, consent: f.consent };
    const ok = await run(() => (editId ? api(`/admin/testimonials/${editId}`, { method: 'PATCH', body }) : api('/admin/testimonials', { method: 'POST', body })), editId ? 'Testimonial updated' : 'Testimonial added');
    if (ok) { setF(blank); setEditId(''); }
  }

  return (
    <>
      <Notice msg={msg} err={err} />
      <h1><span className="gold">Testimonials</span></h1>
      <form className="card" onSubmit={submit}>
        <h2 style={{ marginTop: 0, fontSize: '1.15rem' }}>{editId ? 'Edit testimonial' : 'Add a testimonial'}</h2>
        <div className="g g3" style={{ gap: '0 16px' }}>
          <div className="field"><label htmlFor="t-name">First name</label><input id="t-name" required minLength={2} maxLength={40} value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} /></div>
          <div className="field"><label htmlFor="t-city">City</label><input id="t-city" required minLength={2} maxLength={60} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
          <div className="field"><label htmlFor="t-rating">Rating</label><select id="t-rating" value={f.rating} onChange={(e) => setF({ ...f, rating: e.target.value })}><option value="">No rating</option>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}</select></div>
        </div>
        <div className="field"><label htmlFor="t-text">Testimonial</label><textarea id="t-text" rows={3} required minLength={10} maxLength={800} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} /></div>
        <div className="field"><label className="check" htmlFor="t-consent"><input id="t-consent" type="checkbox" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} /> The client has given written consent to publish this (required for it to appear on the site)</label></div>
        <p className="small">Avoid testimonials that mention returns or profits; SEBI guidelines discourage them.</p>
        <div className="row"><button className="btn btn-primary">{editId ? 'Save' : 'Add testimonial'}</button>{editId && <button type="button" className="btn" onClick={() => { setEditId(''); setF(blank); }}>Cancel</button>}</div>
      </form>
      <h2>All testimonials</h2>
      {!items ? <SkeletonTable /> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Client</th><th>Testimonial</th><th>Consent</th><th>Shown</th><th>Actions</th></tr></thead>
          <tbody>
            {items.map((t) => (
              <tr key={t._id}>
                <td className="nw"><b>{t.firstName}</b><br /><small className="muted">{t.city}</small></td>
                <td><small>{t.text}</small></td>
                <td><span className={'pill ' + (t.consent ? 'pill-ok' : 'pill-bad')}>{t.consent ? 'Yes' : 'No'}</span></td>
                <td><button className={'btn btn-sm ' + (t.active ? '' : 'btn-danger')} onClick={() => run(() => api(`/admin/testimonials/${t._id}`, { method: 'PATCH', body: { active: !t.active } }), t.active ? 'Hidden' : 'Shown')}>{t.active ? 'Yes' : 'Hidden'}</button></td>
                <td className="nw">
                  <button className="btn btn-sm" onClick={() => { setEditId(t._id); setF({ firstName: t.firstName, city: t.city, text: t.text, rating: t.rating ? String(t.rating) : '', consent: !!t.consent }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-label="Edit"><Pencil aria-hidden="true" /></button>{' '}
                  <button className="btn btn-sm btn-danger" onClick={() => run(() => api(`/admin/testimonials/${t._id}`, { method: 'DELETE' }), 'Deleted')} aria-label="Delete"><Trash2 aria-hidden="true" /></button>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={5} className="center">No testimonials yet. The section is hidden on the website until one is shown.</td></tr>}
          </tbody>
        </table></div>
      )}
    </>
  );
}
