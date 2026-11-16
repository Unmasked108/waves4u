'use client';
import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api, ApiError } from '@/lib/client';
import TwoFactor from '@/components/TwoFactor';

export default function Profile() {
  const { me, reload } = useAuth();
  const [p, setP] = useState({ name: '', phone: '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [st, setSt] = useState<{ ok?: string; err?: string; fields?: Record<string, string> }>({});
  const [pst, setPst] = useState<{ ok?: string; err?: string }>({});
  useEffect(() => { if (me) setP({ name: me.user.name, phone: me.user.phone ?? '' }); }, [me]);
  if (!me) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSt({});
    try { await api('/auth/me', { method: 'PATCH', body: p }); await reload(); setSt({ ok: 'Profile saved.' }); }
    catch (e: any) { setSt({ err: e.message, fields: e instanceof ApiError ? e.fields : {} }); }
  }
  async function change(e: React.FormEvent) {
    e.preventDefault(); setPst({});
    try { await api('/auth/change-password', { method: 'POST', body: pw }); setPw({ currentPassword: '', newPassword: '' }); setPst({ ok: 'Password changed. Other devices were signed out.' }); }
    catch (e: any) { setPst({ err: e.message }); }
  }
  async function logoutAll() {
    await api('/auth/logout-all', { method: 'POST' }).catch(() => {});
    window.location.href = '/login';
  }

  return (
    <>
      <h1>Profile <span className="gold">&amp; security</span></h1>
      <div className="g g2" style={{ alignItems: 'start' }}>
        <form className="card" onSubmit={save}>
          <h2 style={{ marginTop: 0, fontSize: '1.2rem' }}>Your details</h2>
          {st.ok && <div className="form-ok" role="status">{st.ok}</div>}
          {st.err && <div className="form-err" role="alert">{st.err}</div>}
          <div className="field"><label htmlFor="p-name">Name</label><input id="p-name" required minLength={2} maxLength={80} value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></div>
          <div className="field"><label htmlFor="p-email">Email</label><input id="p-email" value={me.user.email} disabled /></div>
          <div className="field">
            <label htmlFor="p-phone">Mobile number</label>
            <input id="p-phone" type="tel" inputMode="tel" value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} aria-invalid={!!st.fields?.phone} />
            {st.fields?.phone && <p className="field-err">{st.fields.phone}</p>}
          </div>
          <button className="btn btn-primary">Save</button>
        </form>

        <form className="card" onSubmit={change}>
          <h2 style={{ marginTop: 0, fontSize: '1.2rem' }}>Change password</h2>
          {pst.ok && <div className="form-ok" role="status">{pst.ok}</div>}
          {pst.err && <div className="form-err" role="alert">{pst.err}</div>}
          <div className="field"><label htmlFor="p-cur">Current password</label><input id="p-cur" type="password" autoComplete="current-password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></div>
          <div className="field"><label htmlFor="p-new">New password</label><input id="p-new" type="password" autoComplete="new-password" minLength={8} required value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /><p className="help">At least 8 characters.</p></div>
          <button className="btn btn-primary">Change password</button>
        </form>
      </div>

      <div className="g g2" style={{ alignItems: 'start', marginTop: 20 }}>
        <TwoFactor required={me.user.role === 'admin'} />
        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: '1.2rem' }}>Sessions</h2>
          <p>For account security, your account can be logged in on one device at a time. Logging in elsewhere signs this device out.</p>
          <button className="btn btn-danger" onClick={logoutAll}><LogOut aria-hidden="true" /> Log out of all devices</button>
        </div>
      </div>
    </>
  );
}
