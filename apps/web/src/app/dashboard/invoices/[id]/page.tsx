'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { api } from '@/lib/client';
import { inr } from '@/lib/types';
import { SkeletonTable } from '@/components/Skeleton';

type Inv = {
  invoiceNo: string; date: string;
  seller: { name: string; address: string; state: string; gstin: string; sebi: string };
  buyer: { name: string; email: string; phone: string; address: string; state: string; gstin: string };
  item: { description: string; sac: string };
  listPricePaise: number; discountPaise: number; coupon: string; taxablePaise: number; tax: { label: string; paise: number }[]; totalPaise: number; paymentRef: string;
};

/** Printable GST invoice ("Print / Save as PDF" uses the browser's print dialog). */
export default function InvoicePage({ params }: { params: { id: string } }) {
  const [inv, setInv] = useState<Inv | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api<{ invoice: Inv }>(`/payments/${params.id}/invoice`).then((d) => setInv(d.invoice)).catch((e) => setErr(e.message)); }, [params.id]);
  if (err) return <div className="form-err">{err}</div>;
  if (!inv) return <SkeletonTable />;
  return (
    <div className="invoice">
      <div className="row between no-print" style={{ marginBottom: 16 }}>
        <Link href="/dashboard/billing" className="more">← Back to invoices</Link>
        <button className="btn btn-primary" onClick={() => window.print()}><Printer aria-hidden="true" /> Print / Save as PDF</button>
      </div>
      <div className="card">
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', marginBottom: 4 }}>Tax Invoice</h1>
            <p style={{ margin: 0 }}>Invoice No. <b>{inv.invoiceNo}</b><br />Date: {new Date(inv.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="brand" style={{ color: 'var(--navy)' }}>waves<b style={{ color: 'var(--gold-ink)' }}>4u</b></div>
        </div>
        <div className="g g2" style={{ margin: '24px 0' }}>
          <div>
            <p className="label">From</p>
            <p style={{ color: 'var(--text)' }}><b>{inv.seller.name}</b><br />{inv.seller.address}<br />State: {inv.seller.state}{inv.seller.gstin && <><br />GSTIN: {inv.seller.gstin}</>}{inv.seller.sebi && <><br />SEBI Reg. No.: {inv.seller.sebi}</>}</p>
          </div>
          <div>
            <p className="label">Billed to</p>
            <p style={{ color: 'var(--text)' }}><b>{inv.buyer.name}</b><br />{inv.buyer.email}{inv.buyer.phone && <><br />+91 {inv.buyer.phone}</>}{inv.buyer.address && <><br />{inv.buyer.address}</>}{inv.buyer.state && <><br />State (place of supply): {inv.buyer.state}</>}{inv.buyer.gstin && <><br />GSTIN: {inv.buyer.gstin}</>}</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Description</th><th>SAC</th><th className="amt">Amount</th></tr></thead>
            <tbody>
              <tr><td>{inv.item.description}</td><td>{inv.item.sac}</td><td className="amt">{inr(inv.listPricePaise)}</td></tr>
              {inv.discountPaise > 0 && <tr><td colSpan={2}>Discount{inv.coupon ? ` (${inv.coupon})` : ''}</td><td className="amt">− {inr(inv.discountPaise)}</td></tr>}
              <tr><td colSpan={2}>Taxable value</td><td className="amt">{inr(inv.taxablePaise)}</td></tr>
              {inv.tax.map((t) => <tr key={t.label}><td colSpan={2}>{t.label}</td><td className="amt">{inr(t.paise)}</td></tr>)}
              <tr><td colSpan={2}><b>Total paid (GST inclusive)</b></td><td className="amt"><b>{inr(inv.totalPaise)}</b></td></tr>
            </tbody>
          </table>
        </div>
        <p className="small" style={{ marginTop: 16, marginBottom: 0 }}>Payment reference: {inv.paymentRef}. This is a computer-generated invoice and does not need a signature.</p>
      </div>
    </div>
  );
}
