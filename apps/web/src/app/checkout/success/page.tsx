'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { api } from '@/lib/client';
import { useAuth } from '@/lib/auth';
import { inr, SEGMENT_LABEL } from '@/lib/types';

type P = { _id: string; status: 'created' | 'paid' | 'failed'; plan: { name: string; code: string }; segment?: string; amountPaise: number; invoiceNo?: string };

/** Waits for the payment to be confirmed (browser verify or Razorpay webhook), then shows the receipt. */
export default function CheckoutSuccess() {
  const { reload } = useAuth();
  const [p, setP] = useState<P | null>(null);
  const [tries, setTries] = useState(0);

  useEffect(() => {
    const pid = new URLSearchParams(window.location.search).get('pid');
    if (!pid) return;
    let stop = false;
    const poll = async (n: number) => {
      const d = await api<{ payment: P }>(`/payments/${pid}/status`).catch(() => null);
      if (stop) return;
      if (d) setP(d.payment);
      setTries(n);
      if (d?.payment.status === 'paid') { reload(); return; }
      if (n < 20) setTimeout(() => poll(n + 1), 3000);
    };
    poll(1);
    return () => { stop = true; };
  }, [reload]);

  const paid = p?.status === 'paid';
  return (
    <section className="authwrap">
      <div className="card authcard center" role="status" aria-live="polite">
        <div className={'status-icon ' + (paid ? 'ok' : 'wait')}>{paid ? <CheckCircle2 aria-hidden="true" /> : <Clock aria-hidden="true" />}</div>
        {paid ? (
          <>
            <h1>Payment successful</h1>
            <p>Your <b>{p!.plan.name}</b>{p!.segment ? ` (${SEGMENT_LABEL[p!.segment]})` : ''} plan is active. We have emailed your GST invoice <b>{p!.invoiceNo}</b> for {inr(p!.amountPaise)}.</p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <Link href="/dashboard" className="btn btn-primary">Go to dashboard</Link>
              <Link href={`/dashboard/invoices/${p!._id}`} className="btn">View invoice</Link>
            </div>
          </>
        ) : p?.status === 'failed' ? (
          <>
            <h1>Payment not completed</h1>
            <p>No money was taken, or any amount debited will be refunded by your bank automatically.</p>
            <Link href={`/checkout/${p.plan.code}${p.segment ? `?segment=${p.segment}` : ''}`} className="btn btn-primary">Try again</Link>
          </>
        ) : (
          <>
            <h1>Confirming your payment…</h1>
            <p>This usually takes a few seconds. Please do not pay again.</p>
            {tries >= 20 && <p className="small">Still waiting for the bank. We will email you as soon as it is confirmed; you can also check <Link href="/dashboard/billing" className="btn-link">your subscriptions</Link>.</p>}
          </>
        )}
      </div>
    </section>
  );
}
