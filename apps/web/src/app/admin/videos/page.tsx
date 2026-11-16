'use client';
import { useEffect, useState } from 'react';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { api } from '@/lib/client';
import { fmtDate, type Video } from '@/lib/types';
import AccessSelect from '@/components/AccessSelect';
import Notice from '@/components/Notice';
import { SkeletonTable } from '@/components/Skeleton';

const blank = { url: '', title: '', description: '', access: 'free' };

export default function AdminVideos() {
  const [f, setF] = useState(blank);
  const [items, setItems] = useState<Video[] | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () => api<{ items: Video[] }>('/admin/videos').then((d) => setItems(d.items)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault(); setMsg(''); setErr(''); setBusy(true);
    try { await api('/admin/videos', { method: 'POST', body: { ...f, title: f.title || undefined, description: f.description || undefined } }); setMsg('Video added'); setF(blank); load(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  async function patch(v: Video, body: object, m: string) {
    setMsg(''); setErr('');
    try { await api(`/admin/videos/${v._id}`, { method: 'PATCH', body }); setMsg(m); load(); } catch (e: any) { setErr(e.message); }
  }
  async function remove(v: Video) {
    setMsg(''); setErr('');
    try { await api(`/admin/videos/${v._id}`, { method: 'DELETE' }); setMsg(v.source === 'sync' ? 'Hidden (YouTube-synced videos are hidden, not deleted)' : 'Video deleted'); load(); } catch (e: any) { setErr(e.message); }
  }

  return (
    <>
      <Notice msg={msg} err={err} />
      <h1><span className="gold">Videos</span></h1>
      <p>New uploads on the YouTube channel are added automatically as free videos. Add other YouTube or Vimeo videos here and choose who can watch each one.</p>
      <form className="card" onSubmit={add}>
        <div className="g g2" style={{ gap: '0 16px' }}>
          <div className="field"><label htmlFor="v-url">YouTube or Vimeo link</label><input id="v-url" type="url" required placeholder="https://youtu.be/… or https://vimeo.com/…" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} /></div>
          <AccessSelect id="v-access" value={f.access} onChange={(v) => setF({ ...f, access: v })} />
          <div className="field"><label htmlFor="v-title">Title (optional, read from the video if empty)</label><input id="v-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div className="field"><label htmlFor="v-desc">Short description (optional)</label><input id="v-desc" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        </div>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add video'}</button>
      </form>

      <h2>All videos</h2>
      {!items ? <SkeletonTable /> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Video</th><th>Source</th><th>Who can watch</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            {items.map((v) => (
              <tr key={v._id} style={v.hidden ? { opacity: 0.55 } : undefined}>
                <td><b>{v.title}</b>{v.hidden && <> <span className="pill">Hidden</span></>}</td>
                <td className="nw">{v.provider === 'vimeo' ? 'Vimeo' : 'YouTube'}{v.source === 'sync' ? ' (auto)' : ''}</td>
                <td>
                  <label className="sr-only" htmlFor={`va-${v._id}`}>Access for {v.title}</label>
                  <select id={`va-${v._id}`} value={v.access} onChange={(e) => patch(v, { access: e.target.value }, 'Access updated')} style={{ minHeight: 36, padding: '4px 8px', minWidth: 120 }}>
                    <option value="free">Free</option><option value="premium">Premium</option><option value="club">Club</option>
                  </select>
                </td>
                <td className="nw">{fmtDate(v.publishedAt)}</td>
                <td className="nw">
                  <button className="btn btn-sm" onClick={() => patch(v, { hidden: !v.hidden }, v.hidden ? 'Shown' : 'Hidden')} aria-label={v.hidden ? `Show ${v.title}` : `Hide ${v.title}`}>{v.hidden ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}</button>{' '}
                  {v.source !== 'sync' && <button className="btn btn-sm btn-danger" onClick={() => remove(v)} aria-label={`Delete ${v.title}`}><Trash2 aria-hidden="true" /></button>}
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={5} className="center">No videos yet.</td></tr>}
          </tbody>
        </table></div>
      )}
    </>
  );
}
