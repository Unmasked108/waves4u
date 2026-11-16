/**
 * Google Analytics 4 events (spec: track callbacks, sign-ups, purchases, WhatsApp clicks).
 * GA only loads after the visitor accepts the cookie notice (components/Consent.tsx),
 * so before that these calls do nothing.
 */
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: unknown[];
  }
}

export function track(event: string, params: Record<string, unknown> = {}) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') window.gtag('event', event, params);
}

export const CONSENT_KEY = 'w4u-consent';
export type Consent = 'granted' | 'denied';
export function readConsent(): Consent | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}
