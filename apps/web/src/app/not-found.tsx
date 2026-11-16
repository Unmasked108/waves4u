import Link from 'next/link';
import { WaveRule } from '@/components/SectionHead';

export const metadata = { title: 'Page not found', robots: { index: false } };

/** Custom 404 (spec: /404 page). */
export default function NotFound() {
  return (
    <section className="authwrap">
      <div className="center" style={{ maxWidth: 520 }}>
        <p className="eyebrow" style={{ justifyContent: 'center' }}>Error 404</p>
        <h1>This wave has passed</h1>
        <WaveRule />
        <p style={{ marginTop: 16 }}>The page you are looking for does not exist or has moved.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link href="/" className="btn btn-primary">Go to home</Link>
          <Link href="/plans" className="btn">See plans</Link>
          <Link href="/#contact" className="btn">Contact us</Link>
        </div>
      </div>
    </section>
  );
}
