'use client';
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/client';
import type { Faq } from '@/lib/types';
import Notice from '@/components/Notice';
import { SkeletonTable } from '@/components/Skeleton';

const blank = { question: '', answer: '' };

/** FAQs shown on the home page (with FAQPage structured data). */
export default function AdminFaqs() {
  const [items, setItems] = useState<Faq[] | null>(null);
  const [f, setF] = useState(blank);
  const [editId, setEditId] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const load = () => api<{ items: Faq[] }>('/admin/faqs').then((d) => setItems(d.items)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const run = async (fn: () => Promise<unknown>, m: string) => {
    setMsg(''); setErr('');
    try { await fn(); setMsg(m); load(); } catch (e: any) { setErr(e.message); }
  };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await run(() => editId
      ? api(`/admin/faqs/${editId}`, { method: 'PATCH', body: f })
      : api('/admin/faqs', { method: 'POST', body: { ...f, order: (items?.length ?? 0) } }), editId ? 'FAQ updated' : 'FAQ added');
    setF(blank); setEditId('');
  }
  async function move(i: number, dir: -1 | 1) {
    if (!items) return;
    const a = items[i], b = items[i + dir];
    if (!b) return;
    await run(async () => {
      // Re-number everything so the order is always clean.
      const next = [...items];
      next[i] = b; next[i + dir] = a;
      await Promise.all(next.map((x, n) => (x.order !== n ? api(`/admin/faqs/${x._id}`, { method: 'PATCH', body: { order: n } }) : null)));
    }, 'Order saved');
  }

  return (
    <>
      <Notice msg={msg} err={err} />
      <h1><span className="gold">FAQs</span></h1>
      <form className="card" onSubmit={submit}>
        <h2 style={{ marginTop: 0, fontSize: '1.15rem' }}>{editId ? 'Edit question' : 'Add a question'}</h2>
        <div className="field"><label htmlFor="f-q">Question</label><input id="f-q" required minLength={5} maxLength={300} value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} /></div>
        <div className="field"><label htmlFor="f-a">Answer</label><textarea id="f-a" rows={4} required minLength={5} maxLength={3000} value={f.answer} onChange={(e) => setF({ ...f, answer: e.target.value })} /></div>
        <div className="row"><button className="btn btn-primary">{editId ? 'Save' : 'Add FAQ'}</button>{editId && <button type="button" className="btn" onClick={() => { setEditId(''); setF(blank); }}>Cancel</button>}</div>
      </form>
      <h2>Questions (in display order)</h2>
      {!items ? <SkeletonTable /> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Question</th><th>Shown</th><th>Actions</th></tr></thead>
          <tbody>
            {items.map((x, i) => (
              <tr key={x._id}>
                <td><b>{x.question}</b><br /><small className="muted">{x.answer.slice(0, 140)}{x.answer.length > 140 ? '…' : ''}</small></td>
                <td><button className={'btn btn-sm ' + (x.active ? '' : 'btn-danger')} onClick={() => run(() => api(`/admin/faqs/${x._id}`, { method: 'PATCH', body: { active: !x.active } }), x.active ? 'Hidden' : 'Shown')}>{x.active ? 'Yes' : 'Hidden'}</button></td>
                <td className="nw">
                  <button className="btn btn-sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp aria-hidden="true" /></button>{' '}
                  <button className="btn btn-sm" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown aria-hidden="true" /></button>{' '}
                  <button className="btn btn-sm" onClick={() => { setEditId(x._id); setF({ question: x.question, answer: x.answer }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-label="Edit"><Pencil aria-hidden="true" /></button>{' '}
                  <button className="btn btn-sm btn-danger" onClick={() => run(() => api(`/admin/faqs/${x._id}`, { method: 'DELETE' }), 'Deleted')} aria-label="Delete"><Trash2 aria-hidden="true" /></button>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={3} className="center">No FAQs yet. The FAQ section is hidden on the website until you add one.</td></tr>}
          </tbody>
        </table></div>
      )}
    </>
  );
}
