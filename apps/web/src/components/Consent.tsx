'use client';
import Link from 'next/link';
import Script from 'next/script';
import { useEffect, useState } from 'react';
import { CONSENT_KEY, readConsent, type Consent as C } from '@/lib/analytics';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

/**
 * Cookie notice + Google Analytics 4. GA is only loaded after the visitor accepts (spec section 8:
 * "Cookie/consent notice if analytics or marketing pixels are used"). Without NEXT_PUBLIC_GA_ID
 * nothing is tracked and no notice is shown.
 */
export default function Consent() {
  const [consent, setConsent] = useState<C | null | 'unknown'>('unknown');
  useEffect(() => setConsent(readConsent()), []);

  const choose = (v: C) => {
    try { localStorage.setItem(CONSENT_KEY, v); } catch {}
    setConsent(v);
  };

  if (!GA_ID) return null;
  return (
    <>
      {consent === 'granted' && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_ID}',{anonymize_ip:true});`}
          </Script>
        </>
      )}
      {consent === null && (
        <div className="cookie" role="dialog" aria-live="polite" aria-label="Cookie consent">
          <p>We use analytics cookies to understand how the site is used and improve it. See our <Link href="/privacy-policy">Privacy Policy</Link>.</p>
          <div className="row">
            <button className="btn btn-sm" onClick={() => choose('denied')}>Decline</button>
            <button className="btn btn-primary btn-sm" onClick={() => choose('granted')}>Accept</button>
          </div>
        </div>
      )}
    </>
  );
}
