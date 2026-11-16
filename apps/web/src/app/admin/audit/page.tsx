'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { fmtDateTime } from '@/lib/types';
import { SkeletonTable } from '@/components/Skeleton';

type Row = { _id: string; action: string; target?: string; at: string; meta?: unknown; actor?: { name: string; email: string } };

/** Every admin action, time-stamped (spec section 10: audit log of admin actions). */
export default function Audit() {
  const [page, setPage] = useState(1);
  const [d, setD] = useState<{ items: Row[]; total: number } | null>(null);
  useEffect(() => { setD(null); api(`/admin/audit?page=${page}&limit=50`).then(setD).catch(() => setD({ items: [], total: 0 })); }, [page]);
  return (
    <>
      <h1>Audit <span className="gold">log</span></h1>
      {!d ? <SkeletonTable /> : (
        <div className="table-wrap"><table>
          <thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
          <tbody>
            {d.items.map((r) => (
              <tr key={r._id}>
                <td className="nw">{fmtDateTime(r.at)}</td><td>{r.actor?.name ?? '—'}</td><td className="nw"><code>{r.action}</code></td>
                <td><small className="muted">{r.target ?? ''}</small></td>
                <td><small className="muted">{r.meta ? JSON.stringify(r.meta).slice(0, 160) : ''}</small></td>
              </tr>
            ))}
            {!d.items.length && <tr><td colSpan={5}>No actions yet.</td></tr>}
          </tbody>
        </table></div>
      )}
      <p className="row" style={{ marginTop: 14 }}>{d?.total ?? 0} entries · page {page}
        <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Newer</button>
        <button className="btn btn-sm" disabled={page * 50 >= (d?.total ?? 0)} onClick={() => setPage(page + 1)}>Older</button></p>
    </>
  );
}
