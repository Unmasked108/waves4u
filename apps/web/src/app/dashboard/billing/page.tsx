'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/client';
import { fmtDate, inr, SEGMENT_LABEL } from '@/lib/types';
import MyPlans from '@/components/MyPlans';
import { SkeletonTable } from '@/components/Skeleton';

type Pay = { _id: string; invoiceNo: string; amountPaise: number; taxablePaise: number; gstPaise: number; discountPaise?: number; coupon?: string; segment?: string; paidAt: string; plan?: { name: string } };

export default function Billing() {
  const { me } = useAuth();
  const [pays, setPays] = useState<Pay[] | null>(null);
  useEffect(() => { api<{ payments: Pay[] }>('/payments/mine').then((d) => setPays(d.payments)).catch(() => setPays([])); }, []);
  if (!me) return null;
  return (
    <>
      <h1>Subscriptions <span className="gold">&amp; invoices</span></h1>
      <h2>Subscription status</h2>
      <MyPlans me={me} />
      <h2>Invoices</h2>
      {pays === null ? <SkeletonTable /> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Invoice</th><th>Date</th><th>Plan</th><th>Taxable</th><th>GST</th><th>Total</th><th></th></tr></thead>
            <tbody>
              {pays.length ? pays.map((p) => (
                <tr key={p._id}>
                  <td className="nw">{p.invoiceNo}</td>
                  <td className="nw">{fmtDate(p.paidAt)}</td>
                  <td>{p.plan?.name}{p.segment ? ` · ${SEGMENT_LABEL[p.segment]}` : ''}{p.coupon ? <><br /><small className="muted">Coupon {p.coupon}</small></> : null}</td>
                  <td className="nw">{inr(p.taxablePaise)}</td>
                  <td className="nw">{inr(p.gstPaise)}</td>
                  <td className="nw"><b>{inr(p.amountPaise)}</b></td>
                  <td><Link href={`/dashboard/invoices/${p._id}`} className="btn btn-sm"><FileText aria-hidden="true" /> View</Link></td>
                </tr>
              )) : <tr><td colSpan={7}>No payments yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <p className="small" style={{ marginTop: 12 }}>Invoices are also emailed to {me.user.email} after each payment.</p>
    </>
  );
}
