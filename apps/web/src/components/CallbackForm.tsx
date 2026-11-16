'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { AlertCircle, PhoneCall } from 'lucide-react';
import { api, ApiError } from '@/lib/client';
import { track } from '@/lib/analytics';
import { CAPITAL_OPTIONS } from '@/lib/site';
import Turnstile, { TURNSTILE_SITE_KEY } from './Turnstile';

type F = { name: string; mobile: string; capital: string; consent: boolean; website: string };
type Errs = Partial<Record<keyof F | '_', string>>;

/** Same rules as the server (spec section 8), so most mistakes are caught before sending. */
function validate(f: F): Errs {
  const e: Errs = {};
  const name = f.name.trim();
  if (name.length < 2 || name.length > 80) e.name = 'Please enter your name (2 to 80 characters).';
  const digits = f.mobile.replace(/[\s\-().]/g, '');
  if (!/^(\+?91|0)?[6-9]\d{9}$/.test(digits)) e.mobile = 'Enter a valid 10-digit Indian mobile number.';
  if (!f.capital) e.capital = 'Choose your trading capital.';
  if (!f.consent) e.consent = 'Please agree to be contacted.';
  return e;
}

const Err = ({ id, msg }: { id: string; msg?: string }) =>
  msg ? <p className="field-err" id={id}><AlertCircle size={15} aria-hidden="true" /> {msg}</p> : null;

/** "Get a Callback" form. On success: lead saved + team emailed by the API, then redirect to /thank-you. */
export default function CallbackForm() {
  const router = useRouter();
  const pathname = usePathname();
  const [f, setF] = useState<F>({ name: '', mobile: '', capital: '', consent: false, website: '' });
  const [errs, setErrs] = useState<Errs>({});
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState('');
  const [resetKey, setResetKey] = useState(0);
  const onToken = useCallback((t: string) => setToken(t), []);

  const set = <K extends keyof F>(k: K, v: F[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    if (errs[k]) setErrs((e) => ({ ...e, [k]: undefined }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate(f);
    setErrs(v);
    if (Object.keys(v).length) {
      document.getElementById(`cb-${Object.keys(v)[0]}`)?.focus();
      return;
    }
    if (TURNSTILE_SITE_KEY && !token) { setErrs({ _: 'Please wait a moment for the spam check to finish, then try again.' }); return; }
    setBusy(true);
    try {
      await api('/leads', { method: 'POST', body: { ...f, captchaToken: token || undefined, page: pathname } });
      track('generate_lead', { form: 'callback', capital: f.capital });
      router.push('/thank-you');
    } catch (err) {
      // Typed data is kept; only the error is shown.
      const fields = err instanceof ApiError ? err.fields : {};
      setErrs({ ...(fields as Errs), _: (err as Error).message });
      setResetKey((k) => k + 1);
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit} noValidate aria-labelledby="cb-title">
      <h3 id="cb-title" style={{ fontSize: '1.4rem' }}>Get a Callback</h3>
      <p className="small">Share a few details and our team will call you back.</p>
      {errs._ && <div className="form-err" role="alert">{errs._}</div>}

      {/* Honeypot: hidden from people, bots fill it in */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="cb-website">Website</label>
        <input id="cb-website" tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set('website', e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="cb-name">Name <span className="req" aria-hidden="true">*</span></label>
        <input id="cb-name" name="name" autoComplete="name" required minLength={2} maxLength={80} value={f.name}
          onChange={(e) => set('name', e.target.value)} aria-invalid={!!errs.name} aria-describedby={errs.name ? 'cb-name-e' : undefined} />
        <Err id="cb-name-e" msg={errs.name} />
      </div>

      <div className="field">
        <label htmlFor="cb-mobile">Mobile number <span className="req" aria-hidden="true">*</span></label>
        <div className="phone-in">
          <span aria-hidden="true">+91</span>
          <input id="cb-mobile" name="mobile" type="tel" inputMode="tel" autoComplete="tel-national" required placeholder="98765 43210" value={f.mobile}
            onChange={(e) => set('mobile', e.target.value)} aria-invalid={!!errs.mobile} aria-describedby={errs.mobile ? 'cb-mobile-e' : 'cb-mobile-h'} />
        </div>
        {errs.mobile ? <Err id="cb-mobile-e" msg={errs.mobile} /> : <p className="help" id="cb-mobile-h">10-digit Indian mobile number.</p>}
      </div>

      <div className="field">
        <label htmlFor="cb-capital">Trading capital <span className="req" aria-hidden="true">*</span></label>
        <select id="cb-capital" name="capital" required value={f.capital} onChange={(e) => set('capital', e.target.value)}
          aria-invalid={!!errs.capital} aria-describedby={errs.capital ? 'cb-capital-e' : undefined}>
          <option value="">Select…</option>
          {CAPITAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <Err id="cb-capital-e" msg={errs.capital} />
      </div>

      <div className="field">
        <label className="check" htmlFor="cb-consent">
          <input id="cb-consent" type="checkbox" required checked={f.consent} onChange={(e) => set('consent', e.target.checked)}
            aria-invalid={!!errs.consent} aria-describedby={errs.consent ? 'cb-consent-e' : undefined} />
          <span>I agree to be contacted. <Link href="/privacy-policy">Privacy Policy</Link> <span className="req" aria-hidden="true">*</span></span>
        </label>
        <Err id="cb-consent-e" msg={errs.consent} />
      </div>

      <Turnstile onToken={onToken} resetKey={resetKey} />

      <button className="btn btn-primary btn-lg btn-block" disabled={busy} aria-busy={busy}>
        {busy ? <><span className="spinner" aria-hidden="true" /> Sending…</> : <><PhoneCall aria-hidden="true" /> Request a callback</>}
      </button>
    </form>
  );
}
