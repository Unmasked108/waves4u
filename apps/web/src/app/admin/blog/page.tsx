'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/client';
import { fmtDate, type BlogItem } from '@/lib/types';
import { AccessPill } from '@/components/Cards';
import AccessSelect from '@/components/AccessSelect';
import Modal from '@/components/Modal';
import Notice from '@/components/Notice';
import { SkeletonTable } from '@/components/Skeleton';

const blank = { title: '', market: 'Index', teaser: '', body: '', access: 'free', coverImageUrl: '', status: 'published', publishAt: '' };
const toLocal = (d?: string) => (d ? new Date(new Date(d).getTime() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : '');

export default function AdminBlog() {
  const [f, setF] = useState(blank);
  const [editId, setEditId] = useState('');
  const [items, setItems] = useState<BlogItem[] | null>(null);
  const [del, setDel] = useState<BlogItem | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const load = () => api<{ items: BlogItem[] }>('/admin/blog').then((d) => setItems(d.items)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  async function startEdit(id: string) {
    setErr('');
    try {
      const { post } = await api(`/admin/blog/${id}`);
      setEditId(id);
      setF({ title: post.title, market: post.market ?? 'Index', teaser: post.teaser, body: post.body, access: post.access ?? 'free', coverImageUrl: post.coverImageUrl ?? '', status: post.status, publishAt: toLocal(post.publishAt) });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) { setErr(e.message); }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg(''); setErr('');
    const body = { ...f, coverImageUrl: f.coverImageUrl || '', publishAt: f.status === 'scheduled' && f.publishAt ? new Date(f.publishAt).toISOString() : undefined };
    try {
      if (editId) await api(`/admin/blog/${editId}`, { method: 'PATCH', body });
      else await api('/admin/blog', { method: 'POST', body });
      setMsg(editId ? 'Blog updated' : 'Blog saved'); setF(blank); setEditId(''); load();
    } catch (e: any) { setErr(e.message); }
  }
  async function quick(id: string, patch: object, m: string) {
    setMsg(''); setErr('');
    try { await api(`/admin/blog/${id}`, { method: 'PATCH', body: patch }); setMsg(m); load(); } catch (e: any) { setErr(e.message); }
  }
  async function remove() {
    if (!del) return;
    try { await api(`/admin/blog/${del._id}`, { method: 'DELETE' }); setMsg('Blog deleted'); setDel(null); load(); } catch (e: any) { setErr(e.message); setDel(null); }
  }

  return (
    <>
      <Notice msg={msg} err={err} />
      <h1><span className="gold">Blogs</span></h1>
      <form className="card" onSubmit={submit}>
        <h2 style={{ marginTop: 0, fontSize: '1.15rem' }}>{editId ? 'Edit blog' : 'Write a new blog'}</h2>
        <div className="field"><label htmlFor="b-title">Title</label><input id="b-title" required minLength={3} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div className="g g3" style={{ gap: '0 16px' }}>
          <div className="field"><label htmlFor="b-mkt">Topic</label><select id="b-mkt" value={f.market} onChange={(e) => setF({ ...f, market: e.target.value })}>{['Index', 'Derivatives', 'Commodity', 'Forex', 'Stock', 'Education'].map((m) => <option key={m}>{m}</option>)}</select></div>
          <AccessSelect id="b-acc" value={f.access} onChange={(v) => setF({ ...f, access: v })} />
          <div className="field"><label htmlFor="b-cover">Cover image URL (optional)</label><input id="b-cover" type="url" value={f.coverImageUrl} onChange={(e) => setF({ ...f, coverImageUrl: e.target.value })} /></div>
        </div>
        <div className="field"><label htmlFor="b-teaser">Summary (always public, used for SEO)</label><textarea id="b-teaser" rows={3} required minLength={10} maxLength={600} value={f.teaser} onChange={(e) => setF({ ...f, teaser: e.target.value })} /></div>
        <div className="field"><label htmlFor="b-body">Article (HTML allowed: &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;img&gt;, &lt;a&gt;…)</label><textarea id="b-body" rows={12} required minLength={10} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></div>
        <div className="g g3" style={{ gap: '0 16px' }}>
          <div className="field"><label htmlFor="b-status">Status</label><select id="b-status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="published">Published</option><option value="draft">Draft</option><option value="scheduled">Scheduled</option></select></div>
          {f.status === 'scheduled' && <div className="field"><label htmlFor="b-at">Publish at</label><input id="b-at" type="datetime-local" required value={f.publishAt} onChange={(e) => setF({ ...f, publishAt: e.target.value })} /></div>}
        </div>
        <div className="row">
          <button className="btn btn-primary">{editId ? 'Save changes' : 'Save blog'}</button>
          {editId && <button type="button" className="btn" onClick={() => { setEditId(''); setF(blank); }}>Cancel edit</button>}
        </div>
      </form>

      <h2>All blogs</h2>
      {!items ? <SkeletonTable /> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Title</th><th>Access</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            {items.map((b) => (
              <tr key={b._id}>
                <td><b>{b.title}</b></td>
                <td><AccessPill access={b.access} /></td>
                <td>{b.status}{b.status === 'scheduled' && b.publishAt ? <><br /><small className="muted">{fmtDate(b.publishAt)}</small></> : null}</td>
                <td className="nw">{fmtDate(b.publishedAt)}</td>
                <td className="nw">
                  <button className="btn btn-sm" onClick={() => startEdit(b._id)} aria-label={`Edit ${b.title}`}><Pencil aria-hidden="true" /></button>{' '}
                  {b.status !== 'published' ? <button className="btn btn-sm" onClick={() => quick(b._id, { status: 'published' }, 'Published')}>Publish</button>
                    : <Link className="btn btn-sm" href={`/blogs/${b.slug}`} target="_blank" aria-label={`View ${b.title}`}><ExternalLink aria-hidden="true" /></Link>}{' '}
                  <button className="btn btn-sm btn-danger" onClick={() => setDel(b)} aria-label={`Delete ${b.title}`}><Trash2 aria-hidden="true" /></button>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={5} className="center">No blogs yet.</td></tr>}
          </tbody>
        </table></div>
      )}
      {del && (
        <Modal title="Delete blog?" onClose={() => setDel(null)}>
          <p>“{del.title}” will be removed from the website permanently.</p>
          <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn" onClick={() => setDel(null)}>Keep it</button><button className="btn btn-danger" onClick={remove}>Delete</button></div>
        </Modal>
      )}
    </>
  );
}
