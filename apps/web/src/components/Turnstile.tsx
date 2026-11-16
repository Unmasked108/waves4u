'use client';
import Script from 'next/script';
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, o: Record<string, unknown>) => string; reset: (id?: string) => void; remove: (id: string) => void };
  }
}

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** Cloudflare Turnstile spam check (invisible for most visitors). Renders nothing without a site key. */
export default function Turnstile({ onToken, resetKey }: { onToken: (t: string) => void; resetKey?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const id = useRef<string>();

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let cancelled = false;
    const mount = () => {
      if (cancelled || !box.current || !window.turnstile || id.current) return;
      id.current = window.turnstile.render(box.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: onToken,
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
        appearance: 'interaction-only',
      });
    };
    const t = setInterval(() => { if (window.turnstile) { mount(); clearInterval(t); } }, 200);
    return () => { cancelled = true; clearInterval(t); if (id.current) window.turnstile?.remove(id.current); id.current = undefined; };
  }, [onToken]);

  useEffect(() => { if (resetKey && id.current) window.turnstile?.reset(id.current); }, [resetKey]);

  if (!TURNSTILE_SITE_KEY) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="lazyOnload" />
      <div ref={box} />
    </>
  );
}
