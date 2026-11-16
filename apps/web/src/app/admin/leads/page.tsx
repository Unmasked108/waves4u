'use client';
import { useCallback, useEffect, useState } from 'react';
import { Download, Phone } from 'lucide-react';
import { api } from '@/lib/client';
import { CAPITAL_OPTIONS } from '@/lib/site';
import { fmtDateTime } from '@/lib/types';
import Notice from '@/components/Notice';
import { SkeletonTable } from '@/components/Skeleton';

type Lead = { _id: string; name: string; mobile: string; capital: string; status: 'new' | 'contacted' | 'converted'; notes?: string; page?: string; createdAt: string };
const CAP = Object.fromEntries(CAPITAL_OPTIONS.map((o) => [o.value, o.label]));
const STATUS_PILL = { new: 'pill-warn', contacted: 'pill-club', converted: 'pill-ok' } as const;

export default function Leads() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [d, setD] = useState<{ items: Lead[]; total: number; counts: Record<string, number> } | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const qs = () => { const p = new URLSearchParams(); if (status) p.set('status', status); if (q) p.set('q', q); return p; };

  const load = useCallback(() => {
    const p = qs(); p.set('page', String(page));
    api(`/admin/leads?${p}`).then(setD).catch((e) => setErr(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, q, page]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  async function update(l: Lead, patch: Partial<Lead>) {
    setMsg(''); setErr('');
    try { await api(`/admin/leads/${l._id}`, { method: 'PATCH', body: patch }); setMsg('Lead updated'); load(); } catch (e: any) { setErr(e.message); }
  }

  return (
    <>
      <Notice msg={msg} err={err} />
      <div className="row between"><h1 style={{ margin: 0 }}>Callback <span className="gold">leads</span></h1>
        <a className="btn btn-primary" href={`/api/admin/leads.csv?${qs()}`} download><Download aria-hidden="true" /> Export CSV</a>
      </div>
      <div className="toolbar">
        <label htmlFor="l-q" className="sr-only">Search</label>
        <input id="l-q" placeholder="Search name or mobile" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <label htmlFor="l-s" className="sr-only">Status</label>
        <select id="l-s" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses ({Object.values(d?.counts ?? {}).reduce((a, b) => a + b, 0)})</option>
          {(['new', 'contacted', 'converted'] as const).map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)} ({d?.counts[s] ?? 0})</option>)}
        </select>
      </div>
      {!d ? <SkeletonTable /> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Received</th><th>Name</th><th>Mobile</th><th>Capital</th><th>Status</th><th>Notes</th></tr></thead>
            <tbody>
              {d.items.map((l) => (
                <tr key={l._id}>
                  <td className="nw">{fmtDateTime(l.createdAt)}</td>
                  <td><b>{l.name}</b></td>
                  <td className="nw"><a href={`tel:+91${l.mobile}`} className="btn-link"><Phone size={14} aria-hidden="true" /> +91 {l.mobile}</a></td>
                  <td className="nw">{CAP[l.capital] ?? l.capital}</td>
                  <td>
                    <label className="sr-only" htmlFor={`st-${l._id}`}>Status for {l.name}</label>
                    <select id={`st-${l._id}`} value={l.status} onChange={(e) => update(l, { status: e.target.value as Lead['status'] })} style={{ minWidth: 130, minHeight: 36, padding: '4px 8px' }}>
                      <option value="new">New</option><option value="contacted">Contacted</option><option value="converted">Converted</option>
                    </select>
                    <span className={`pill ${STATUS_PILL[l.status]} sr-only`}>{l.status}</span>
                  </td>
                  <td style={{ minWidth: 220 }}>
                    <label className="sr-only" htmlFor={`n-${l._id}`}>Notes for {l.name}</label>
                    <input id={`n-${l._id}`} defaultValue={l.notes ?? ''} placeholder="Add a note…" onBlur={(e) => e.target.value !== (l.notes ?? '') && update(l, { notes: e.target.value })} style={{ minHeight: 36, padding: '4px 8px' }} />
                  </td>
                </tr>
              ))}
              {!d.items.length && <tr><td colSpan={6} className="center">No leads found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <p className="row" style={{ marginTop: 14 }}>{d?.total ?? 0} leads · page {page}
        <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
        <button className="btn btn-sm" disabled={page * 20 >= (d?.total ?? 0)} onClick={() => setPage(page + 1)}>Next</button></p>
    </>
  );
}
