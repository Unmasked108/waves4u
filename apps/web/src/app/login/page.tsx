'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const safeNext = () => {
  const n = new URLSearchParams(window.location.search).get('next');
  return n && n.startsWith('/') && !n.startsWith('//') ? n : null;
};

export default function Login() {
  const { login, login2fa, signedOutElsewhere } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ticket, setTicket] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const go = (admin?: boolean) => router.push(safeNext() ?? (admin ? '/admin' : '/dashboard'));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const r = await login(email, password);
      if (r.twoFactorRequired && r.ticket) { setTicket(r.ticket); setBusy(false); return; }
      go();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  async function submit2fa(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await login2fa(ticket, code); go(true); }
    catch (e: any) { setErr(e.message); if (/start again|log in again/i.test(e.message)) setTicket(''); }
    finally { setBusy(false); }
  }

  return (
    <section className="authwrap">
      {!ticket ? (
        <form className="card authcard" onSubmit={submit} aria-labelledby="login-title">
          <Image className="logo" src="/logo-mark.png" alt="" width={65} height={56} />
          <h1 id="login-title">Welcome back</h1>
          <p className="center small">One login for free members, premium members and admins.</p>
          {signedOutElsewhere && <div className="form-err" role="status">You were signed out because your account was used to log in on another device.</div>}
          {err && <div className="form-err" role="alert">{err}</div>}
          <div className="field">
            <label htmlFor="l-email">Email</label>
            <input id="l-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <div className="row between"><label htmlFor="l-pass">Password</label><Link href="/forgot-password" className="small" style={{ color: 'var(--navy)', textDecoration: 'underline' }}>Forgot password?</Link></div>
            <input id="l-pass" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-lg btn-block" disabled={busy} aria-busy={busy}>{busy ? 'Signing in…' : 'Login'}</button>
          <p className="center" style={{ marginTop: 18, marginBottom: 0 }}>New here? <Link href="/register" className="btn-link">Create a free account</Link></p>
        </form>
      ) : (
        <form className="card authcard" onSubmit={submit2fa} aria-labelledby="mfa-title">
          <div className="status-icon wait"><ShieldCheck aria-hidden="true" /></div>
          <h1 id="mfa-title">Two-factor check</h1>
          <p className="center small">Enter the 6-digit code from your authenticator app.</p>
          {err && <div className="form-err" role="alert">{err}</div>}
          <div className="field">
            <label htmlFor="l-code">Authentication code</label>
            <input id="l-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus value={code} onChange={(e) => setCode(e.target.value)} style={{ letterSpacing: '0.3em', fontSize: '1.3rem', textAlign: 'center' }} />
          </div>
          <button className="btn btn-primary btn-lg btn-block" disabled={busy} aria-busy={busy}>{busy ? 'Checking…' : 'Verify and continue'}</button>
          <p className="center" style={{ marginTop: 14, marginBottom: 0 }}><button type="button" className="btn-link btn" onClick={() => { setTicket(''); setCode(''); setErr(''); }}>Use a different account</button></p>
        </form>
      )}
    </section>
  );
}
