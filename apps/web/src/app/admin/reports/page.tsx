'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { inr, PRODUCT_LABEL, SEGMENT_LABEL } from '@/lib/types';
import { SkeletonTable } from '@/components/Skeleton';

type R = {
  totals: { signups: number; revenuePaise: number };
  signups: { _id: string; count: number }[];
  revenueByMonth: { _id: string; revenuePaise: number; count: number }[];
  revenueByPlan: { plan: string; product?: string; revenuePaise: number; count: number }[];
  activeByProduct: { product: string; count: number }[];
  activeBySegment: { segment: string; count: number }[];
  renewals: { _id: 'new' | 'renewal'; count: number; revenuePaise: number }[];
  leads: { _id: string; count: number }[];
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const month = (k: string) => new Date(k + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

/** Horizontal bar list: an accessible table with a bar per row (no chart library needed). */
function Bars({ rows, value, label, fmt }: { rows: any[]; value: (r: any) => number; label: (r: any) => string; fmt: (n: number) => string }) {
  const max = Math.max(1, ...rows.map(value));
  if (!rows.length) return <p className="muted">No data for this period.</p>;
  return (
    <div className="table-wrap"><table><tbody>
      {rows.map((r, i) => (
        <tr key={i}>
          <td className="nw" style={{ width: '30%' }}>{label(r)}</td>
          <td style={{ width: '50%' }}><div className="bar" aria-hidden="true"><i style={{ width: `${(value(r) / max) * 100}%` }} /></div></td>
          <td className="nw" style={{ textAlign: 'right' }}><b>{fmt(value(r))}</b></td>
        </tr>
      ))}
    </tbody></table></div>
  );
}

export default function Reports() {
  const [from, setFrom] = useState(iso(new Date(Date.now() - 365 * 864e5)));
  const [to, setTo] = useState(iso(new Date()));
  const [r, setR] = useState<R | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    setR(null);
    api<R>(`/admin/reports?from=${from}&to=${to}T23:59:59`).then(setR).catch((e) => setErr(e.message));
  }, [from, to]);
  const ren = (k: 'new' | 'renewal') => r?.renewals.find((x) => x._id === k) ?? { count: 0, revenuePaise: 0 };
  return (
    <>
      <h1><span className="gold">Reports</span></h1>
      <div className="toolbar">
        <label htmlFor="r-from" className="sr-only">From</label><input id="r-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <label htmlFor="r-to" className="sr-only">To</label><input id="r-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      {err && <div className="form-err">{err}</div>}
      {!r ? <SkeletonTable /> : (
        <>
          <div className="g g4">
            <div className="card"><p className="small" style={{ margin: 0 }}>Sign-ups</p><div className="stat">{r.totals.signups}</div></div>
            <div className="card"><p className="small" style={{ margin: 0 }}>Revenue</p><div className="stat">{inr(r.totals.revenuePaise)}</div></div>
            <div className="card"><p className="small" style={{ margin: 0 }}>New purchases</p><div className="stat">{ren('new').count}</div><small className="muted">{inr(ren('new').revenuePaise)}</small></div>
            <div className="card"><p className="small" style={{ margin: 0 }}>Renewals</p><div className="stat">{ren('renewal').count}</div><small className="muted">{inr(ren('renewal').revenuePaise)}</small></div>
          </div>

          <h2>Active subscribers (today)</h2>
          <div className="g g2">
            <Bars rows={r.activeByProduct} value={(x) => x.count} label={(x) => PRODUCT_LABEL[x.product] ?? x.product} fmt={String} />
            <Bars rows={r.activeBySegment} value={(x) => x.count} label={(x) => `Trade · ${SEGMENT_LABEL[x.segment] ?? x.segment}`} fmt={String} />
          </div>

          <h2>Revenue by plan</h2>
          <Bars rows={r.revenueByPlan} value={(x) => x.revenuePaise} label={(x) => `${x.plan} (${x.count})`} fmt={inr} />

          <h2>Revenue by month</h2>
          <Bars rows={r.revenueByMonth} value={(x) => x.revenuePaise} label={(x) => month(x._id)} fmt={inr} />

          <h2>Sign-ups by month</h2>
          <Bars rows={r.signups} value={(x) => x.count} label={(x) => month(x._id)} fmt={String} />

          <h2>Callback leads by status</h2>
          <Bars rows={r.leads} value={(x) => x.count} label={(x) => x._id} fmt={String} />
        </>
      )}
    </>
  );
}
