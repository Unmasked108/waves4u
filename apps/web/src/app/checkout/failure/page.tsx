'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { XCircle } from 'lucide-react';
import { SITE } from '@/lib/site';

export default function CheckoutFailure() {
  const [q, setQ] = useState({ plan: '', segment: '', reason: '' });
  useEffect(() => {
    const s = new URLSearchParams(window.location.search);
    setQ({ plan: s.get('plan') ?? '', segment: s.get('segment') ?? '', reason: s.get('reason') ?? '' });
  }, []);
  return (
    <section className="authwrap">
      <div className="card authcard center" role="alert">
        <div className="status-icon bad"><XCircle aria-hidden="true" /></div>
        <h1>Payment failed</h1>
        <p>{q.reason || 'The payment could not be completed.'} If money was debited, your bank will reverse it automatically within 5–7 working days.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          {q.plan && <Link href={`/checkout/${q.plan}${q.segment ? `?segment=${q.segment}` : ''}`} className="btn btn-primary">Try again</Link>}
          <Link href="/plans" className="btn">See plans</Link>
        </div>
        <p className="small" style={{ marginTop: 16, marginBottom: 0 }}>Need help? Call <a href={SITE.phoneHref} className="btn-link">{SITE.phone}</a>.</p>
      </div>
    </section>
  );
}
