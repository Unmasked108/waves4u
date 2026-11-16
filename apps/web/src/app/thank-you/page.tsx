import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { SITE } from '@/lib/site';

export const metadata = { title: 'Thank you', robots: { index: false } };

export default function ThankYou() {
  return (
    <section className="authwrap">
      <div className="card authcard center">
        <div className="status-icon ok"><CheckCircle2 aria-hidden="true" /></div>
        <h1>Thank you!</h1>
        <p>We have received your callback request. Someone from our team will call you shortly during business hours ({SITE.hours}).</p>
        <p className="small">In a hurry? Call us on <a href={SITE.phoneHref} className="btn-link">{SITE.phone}</a>.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link href="/" className="btn btn-primary">Back to home</Link>
          <Link href="/blogs" className="btn">Read our blogs</Link>
        </div>
      </div>
    </section>
  );
}
