'use client';
import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/client';

/** Turn two-factor authentication (authenticator app) on or off. Required for admins. */
export default function TwoFactor({ required }: { required?: boolean }) {
  const { me, reload } = useAuth();
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  if (!me) return null;

  async function start() {
    setErr(''); setBusy(true);
    try { setSetup(await api('/auth/2fa/setup', { method: 'POST' })); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  async function enable(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await api('/auth/2fa/enable', { method: 'POST', body: { code } }); setSetup(null); setCode(''); setMsg('Two-factor authentication is on.'); await reload(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  async function disable(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await api('/auth/2fa/disable', { method: 'POST', body: { code } }); setCode(''); setMsg('Two-factor authentication is off.'); await reload(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="card">
      <h2 className="row" style={{ gap: 8, marginTop: 0, fontSize: '1.2rem' }}><ShieldCheck size={20} aria-hidden="true" /> Two-factor authentication</h2>
      {msg && <div className="form-ok" role="status">{msg}</div>}
      {err && <div className="form-err" role="alert">{err}</div>}
      {me.user.totpEnabled ? (
        <>
          <p><span className="pill pill-ok">On</span> A 6-digit code from your authenticator app is needed every time you log in.</p>
          {!required && (
            <form onSubmit={disable} className="row" style={{ alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 200px' }}><label htmlFor="tf-off">Current code to turn it off</label><input id="tf-off" inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} required /></div>
              <button className="btn btn-danger" disabled={busy}>Turn off</button>
            </form>
          )}
        </>
      ) : setup ? (
        <form onSubmit={enable}>
          <ol style={{ paddingLeft: 20 }}>
            <li><p>Install an authenticator app (Google Authenticator, Microsoft Authenticator, Authy or 1Password).</p></li>
            <li>
              <p>Scan this QR code, or type the key by hand:</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={setup.qr} alt="QR code to add waves4u to your authenticator app" width={180} height={180} style={{ border: '1px solid var(--line)', borderRadius: 8 }} />
              <p className="small" style={{ wordBreak: 'break-all' }}>Key: <code>{setup.secret}</code></p>
            </li>
            <li>
              <label htmlFor="tf-on">Enter the 6-digit code shown in the app</label>
              <input id="tf-on" inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} required style={{ maxWidth: 220 }} />
            </li>
          </ol>
          <button className="btn btn-primary" disabled={busy}>Verify and turn on</button>
        </form>
      ) : (
        <>
          <p>{required ? 'Admin accounts must use two-factor authentication. Set it up to open the admin panel.' : 'Add a second step to your login with an authenticator app.'}</p>
          <button className="btn btn-primary" onClick={start} disabled={busy}>Set up two-factor authentication</button>
        </>
      )}
    </div>
  );
}
