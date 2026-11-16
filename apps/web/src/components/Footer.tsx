import Image from 'next/image';
import Link from 'next/link';
import { Instagram, Linkedin, Send, Twitter, Youtube } from 'lucide-react';
import { LEGAL, SERVICES, SITE } from '@/lib/site';

const SOCIAL = [
  { href: SITE.social.youtube, label: 'YouTube', Icon: Youtube },
  { href: SITE.social.instagram, label: 'Instagram', Icon: Instagram },
  { href: SITE.social.x, label: 'X (Twitter)', Icon: Twitter },
  { href: SITE.social.linkedin, label: 'LinkedIn', Icon: Linkedin },
  { href: SITE.social.telegram, label: 'Telegram', Icon: Send },
].filter((s) => s.href);

/** Spec section 3.11: about line, Services / Plans / Content / Company links, social icons,
 *  research disclosures and disclaimer, © current year, legal page links. */
export default function Footer() {
  return (
    <footer className="site">
      <div className="w">
        <div className="foot-grid">
          <div>
            <Link href="/" className="brand" aria-label="waves4u home">
              <Image src="/logo-mark.png" alt="" width={47} height={40} />
              <span>waves<b>4u</b></span>
            </Link>
            <p style={{ marginTop: 14, maxWidth: '38ch' }}>
              {SITE.tagline} · {SITE.subTagline}. Disciplined market research and education based on Elliott Wave, technical, derivatives and fundamental analysis.
            </p>
            {SOCIAL.length > 0 && (
              <div className="social">
                {SOCIAL.map(({ href, label, Icon }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}><Icon aria-hidden="true" /></a>
                ))}
              </div>
            )}
          </div>

          <nav aria-labelledby="f-services">
            <h2 id="f-services">Services</h2>
            <ul>{SERVICES.map((s) => <li key={s.id}><Link href={s.href}>{s.title}</Link></li>)}</ul>
          </nav>
          <nav aria-labelledby="f-plans">
            <h2 id="f-plans">Plans</h2>
            <ul>
              <li><Link href="/plans#trade">Trade with us</Link></li>
              <li><Link href="/plans#club">waves4u club</Link></li>
              <li><Link href="/register">Free account</Link></li>
              <li><Link href="/login">Member login</Link></li>
            </ul>
          </nav>
          <nav aria-labelledby="f-content">
            <h2 id="f-content">Content</h2>
            <ul>
              <li><Link href="/blogs">Blogs</Link></li>
              <li><Link href="/analysis">Market Analysis</Link></li>
              <li><Link href="/videos">Videos</Link></li>
            </ul>
          </nav>
          <nav aria-labelledby="f-company">
            <h2 id="f-company">Company</h2>
            <ul>
              <li><Link href="/#about">About us</Link></li>
              <li><Link href="/#process">Our process</Link></li>
              <li><Link href="/#faq">FAQ</Link></li>
              <li><Link href="/#contact">Contact</Link></li>
              <li><a href={SITE.phoneHref}>{SITE.phone}</a></li>
            </ul>
          </nav>
        </div>

        <div className="foot-legal">
          <p>
            <b>{SITE.sebi.type}</b> · Registration No. <b>{SITE.sebi.regNo}</b> · Analyst: {SITE.sebi.analyst}
            {SITE.sebi.bseEnlistment && <> · BSE Enlistment No. {SITE.sebi.bseEnlistment}</>} · Grievances:{' '}
            <a href={`mailto:${SITE.sebi.grievanceEmail}`}>{SITE.sebi.grievanceEmail}</a>
          </p>
          <p>
            <b>Disclaimer:</b> {SITE.disclaimer} Research is for information only and is not a promise of returns. Please read our{' '}
            <Link href="/disclosures">research disclosures</Link> before acting on any research.
          </p>
          <div className="foot-bottom">
            <span>© {new Date().getFullYear()} waves4u. All rights reserved.</span>
            <ul aria-label="Legal">{LEGAL.map((l) => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}</ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
