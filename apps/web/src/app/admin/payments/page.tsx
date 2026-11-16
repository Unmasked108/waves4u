'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { fmtDateTime, inr, SEGMENT_LABEL } from '@/lib/types';
import { SkeletonTable } from '@/components/Skeleton';

type P = {
  _id: string; user?: { name: string; email: string }; plan?: { name: string }; segment?: string; amountPaise: number; discountPaise?: number; coupon?: string;
  status: 'created' | 'paid' | 'failed'; invoiceNo?: string; razorpayOrderId: string; razorpayPaymentId?: string; isRenewal?: boolean; failedReason?: string; createdAt: string;
};

export default function Payments() {
  const [status, setStatus] = useState('paid');
  const [product, setProduct] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [d, setD] = useState<{ items: P[]; total: number } | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => {
    const p = new URLSearchParams({ page: String(page) });
    if (status) p.set('status', status); if (product) p.set('product', product); if (q) p.set('q', q);
    api(`/admin/payments?${p}`).then(setD).catch((e) => setErr(e.message));
  }, [status, product, q, page]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  return (
    <>
      <h1><span className="gold">Payments</span></h1>
      {err && <div className="form-err">{err}</div>}
      <div className="toolbar">
        <label htmlFor="p-q" className="sr-only">Search</label>
        <input id="p-q" placeholder="Search user, invoice, order or payment id" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <label htmlFor="p-s" className="sr-only">Status</label>
        <select id="p-s" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option><option value="paid">Paid</option><option value="created">Started (not paid)</option><option value="failed">Failed</option></select>
        <label htmlFor="p-p" className="sr-only">Product</label>
        <select id="p-p" value={product} onChange={(e) => { setProduct(e.target.value); setPage(1); }}><option value="">All products</option><option value="trade">Trade with us</option><option value="club">waves4u club</option></select>
      </div>
      {!d ? <SkeletonTable /> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>User</th><th>Plan</th><th>Amount</th><th>Status</th><th>Invoice</th><th>Razorpay</th></tr></thead>
            <tbody>
              {d.items.map((p) => (
                <tr key={p._id}>
                  <td className="nw">{fmtDateTime(p.createdAt)}</td>
                  <td>{p.user?.name}<br /><small className="muted">{p.user?.email}</small></td>
                  <td>{p.plan?.name}{p.segment ? ` · ${SEGMENT_LABEL[p.segment]}` : ''}{p.isRenewal && <> <span className="pill pill-club">Renewal</span></>}</td>
                  <td className="nw"><b>{inr(p.amountPaise)}</b>{p.coupon && <><br /><small className="muted">{p.coupon} −{inr(p.discountPaise ?? 0)}</small></>}</td>
                  <td><span className={'pill ' + (p.status === 'paid' ? 'pill-ok' : p.status === 'failed' ? 'pill-bad' : 'pill-warn')} title={p.failedReason}>{p.status === 'created' ? 'started' : p.status}</span></td>
                  <td className="nw">{p.invoiceNo ? <Link href={`/dashboard/invoices/${p._id}`} className="btn-link">{p.invoiceNo}</Link> : '—'}</td>
                  <td><small className="muted">{p.razorpayPaymentId ?? p.razorpayOrderId}</small></td>
                </tr>
              ))}
              {!d.items.length && <tr><td colSpan={7} className="center">No payments found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <p className="row" style={{ marginTop: 14 }}>{d?.total ?? 0} payments · page {page}
        <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
        <button className="btn btn-sm" disabled={page * 20 >= (d?.total ?? 0)} onClick={() => setPage(page + 1)}>Next</button></p>
    </>
  );
}
