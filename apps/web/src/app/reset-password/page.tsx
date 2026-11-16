'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/client';

export default function ResetPassword() {
  const [token, setToken] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => setToken(new URLSearchParams(window.location.search).get('token') ?? ''), []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    if (pw !== pw2) { setErr('The two passwords do not match.'); return; }
    setBusy(true);
    try { await api('/auth/reset-password', { method: 'POST', body: { token, password: pw } }); setDone(true); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <section className="authwrap">
      {done ? (
        <div className="card authcard center" role="status">
          <div className="status-icon ok"><CheckCircle2 aria-hidden="true" /></div>
          <h1>Password updated</h1>
          <p>You can now log in with your new password. For your security, other devices were signed out.</p>
          <Link href="/login" className="btn btn-primary">Login</Link>
        </div>
      ) : (
        <form className="card authcard" onSubmit={submit} aria-labelledby="rp-title">
          <h1 id="rp-title">Choose a new password</h1>
          {!token && <div className="form-err" role="alert">This page needs the link from your reset email. <Link href="/forgot-password" className="btn-link">Request a new link</Link>.</div>}
          {err && <div className="form-err" role="alert">{err} {/expired|invalid/i.test(err) && <Link href="/forgot-password" className="btn-link">Request a new link</Link>}</div>}
          <div className="field">
            <label htmlFor="rp-1">New password</label>
            <input id="rp-1" type="password" required minLength={8} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} aria-describedby="rp-1-h" />
            <p className="help" id="rp-1-h">At least 8 characters.</p>
          </div>
          <div className="field">
            <label htmlFor="rp-2">Confirm new password</label>
            <input id="rp-2" type="password" required minLength={8} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-lg btn-block" disabled={busy || !token} aria-busy={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
        </form>
      )}
    </section>
  );
}
