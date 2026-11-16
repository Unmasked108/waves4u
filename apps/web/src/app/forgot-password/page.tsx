'use client';
import Link from 'next/link';
import { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { api } from '@/lib/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await api('/auth/forgot-password', { method: 'POST', body: { email } }); setSent(true); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <section className="authwrap">
      {sent ? (
        <div className="card authcard center" role="status">
          <div className="status-icon ok"><MailCheck aria-hidden="true" /></div>
          <h1>Check your email</h1>
          <p>If an account exists for <b>{email}</b>, we have sent a link to reset your password. It is valid for 30 minutes.</p>
          <Link href="/login" className="btn btn-primary">Back to login</Link>
        </div>
      ) : (
        <form className="card authcard" onSubmit={submit} aria-labelledby="fp-title">
          <h1 id="fp-title">Forgot your password?</h1>
          <p className="center small">Enter your account email and we will send you a reset link.</p>
          {err && <div className="form-err" role="alert">{err}</div>}
          <div className="field">
            <label htmlFor="fp-email">Email</label>
            <input id="fp-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-lg btn-block" disabled={busy} aria-busy={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
          <p className="center" style={{ marginTop: 18, marginBottom: 0 }}><Link href="/login" className="btn-link">Back to login</Link></p>
        </form>
      )}
    </section>
  );
}
