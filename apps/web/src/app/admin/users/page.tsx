'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { fmtDate, inr, PRODUCT_LABEL, SEGMENT_LABEL, type PlansResponse } from '@/lib/types';
import Modal from '@/components/Modal';
import Notice from '@/components/Notice';
import { SkeletonTable } from '@/components/Skeleton';

type U = {
  _id: string; name: string; email: string; phone?: string; role: 'user' | 'admin'; status: 'active' | 'blocked'; createdAt: string; lastLoginAt?: string;
  totpEnabled?: boolean; premiumUntil: string | null; plans: { product: string; segment?: string; endsAt: string }[];
};
type Sub = { _id: string; plan: { name: string; code: string }; product: string; segment?: string; startsAt: string; endsAt: string; status: string; source: string };
type Pay = { _id: string; invoiceNo?: string; amountPaise: number; status: string; createdAt: string; plan?: { name: string }; coupon?: string };

function UserDetail({ u, plans, onClose, onChanged }: { u: U; plans: PlansResponse | null; onClose: () => void; onChanged: (m: string) => void }) {
  const [d, setD] = useState<{ subscriptions: Sub[]; payments: Pay[] } | null>(null);
  const [grant, setGrant] = useState({ planCode: '', segment: '', days: '' });
  const [extendDays, setExtendDays] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const load = useCallback(() => { api(`/admin/users/${u._id}`).then(setD).catch((e) => setErr(e.message)); }, [u._id]);
  useEffect(load, [load]);
  const plan = plans?.plans.find((p) => p.code === grant.planCode);

  const act = async (fn: () => Promise<unknown>, m: string) => {
    setErr('');
    try { await fn(); load(); onChanged(m); } catch (e: any) { setErr(e.message); }
  };
  return (
    <Modal title={u.name} onClose={onClose} wide>
      <p className="small" style={{ marginTop: 0 }}>{u.email}{u.phone ? ` · +91 ${u.phone}` : ''} · joined {fmtDate(u.createdAt)}{u.lastLoginAt ? ` · last login ${fmtDate(u.lastLoginAt)}` : ''}</p>
      {err && <div className="form-err" role="alert">{err}</div>}

      <h3>Subscriptions</h3>
      {!d ? <SkeletonTable rows={2} /> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Plan</th><th>Segment</th><th>Ends</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {d.subscriptions.map((s) => (
              <tr key={s._id}>
                <td>{s.plan?.name}<br /><small className="muted">{s.source === 'admin' ? 'Granted by admin' : 'Paid'}</small></td>
                <td>{s.segment ? SEGMENT_LABEL[s.segment] : '—'}</td>
                <td className="nw">{fmtDate(s.endsAt)}</td>
                <td><span className={'pill ' + (s.status === 'active' && new Date(s.endsAt) > new Date() ? 'pill-ok' : s.status === 'cancelled' ? 'pill-bad' : '')}>{s.status}</span></td>
                <td className="nw">
                  <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                    <label className="sr-only" htmlFor={`ext-${s._id}`}>Days to extend</label>
                    <input id={`ext-${s._id}`} type="number" min={1} placeholder="days" value={extendDays[s._id] ?? ''} onChange={(e) => setExtendDays({ ...extendDays, [s._id]: e.target.value })} style={{ width: 80, minHeight: 36, padding: '4px 8px' }} />
                    <button className="btn btn-sm" disabled={!Number(extendDays[s._id])} onClick={() => act(() => api(`/admin/subscriptions/${s._id}/extend`, { method: 'POST', body: { days: Number(extendDays[s._id]) } }), 'Plan extended')}>Extend</button>
                    {s.status === 'active' && <button className="btn btn-sm btn-danger" onClick={() => act(() => api(`/admin/subscriptions/${s._id}/cancel`, { method: 'POST' }), 'Plan cancelled')}>Cancel</button>}
                  </span>
                </td>
              </tr>
            ))}
            {!d.subscriptions.length && <tr><td colSpan={5}>No subscriptions.</td></tr>}
          </tbody>
        </table></div>
      )}

      <h3>Grant a plan (no payment)</h3>
      <form className="row" style={{ alignItems: 'flex-end' }} onSubmit={(e) => { e.preventDefault(); act(() => api(`/admin/users/${u._id}/grant`, { method: 'POST', body: { planCode: grant.planCode, segment: grant.segment || undefined, days: grant.days ? Number(grant.days) : undefined } }), 'Plan granted'); }}>
        <div style={{ flex: '2 1 200px' }}><label htmlFor="g-plan">Plan</label>
          <select id="g-plan" required value={grant.planCode} onChange={(e) => setGrant({ ...grant, planCode: e.target.value })}>
            <option value="">Choose…</option>
            {plans?.plans.map((p) => <option key={p.code} value={p.code}>{p.name} ({p.durationDays} days)</option>)}
          </select></div>
        {plan?.product === 'trade' && (
          <div style={{ flex: '1 1 150px' }}><label htmlFor="g-seg">Segment</label>
            <select id="g-seg" required value={grant.segment} onChange={(e) => setGrant({ ...grant, segment: e.target.value })}>
              <option value="">Choose…</option>{Object.entries(SEGMENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
        )}
        <div style={{ flex: '1 1 110px' }}><label htmlFor="g-days">Days (optional)</label><input id="g-days" type="number" min={1} value={grant.days} onChange={(e) => setGrant({ ...grant, days: e.target.value })} /></div>
        <button className="btn btn-primary">Grant</button>
      </form>

      <h3>Payments</h3>
      {d && (
        <div className="table-wrap"><table>
          <thead><tr><th>Date</th><th>Plan</th><th>Amount</th><th>Status</th><th>Invoice</th></tr></thead>
          <tbody>
            {d.payments.map((p) => (
              <tr key={p._id}><td className="nw">{fmtDate(p.createdAt)}</td><td>{p.plan?.name}{p.coupon ? ` · ${p.coupon}` : ''}</td><td>{inr(p.amountPaise)}</td>
                <td><span className={'pill ' + (p.status === 'paid' ? 'pill-ok' : p.status === 'failed' ? 'pill-bad' : '')}>{p.status}</span></td>
                <td>{p.invoiceNo ? <Link className="btn-link" href={`/dashboard/invoices/${p._id}`}>{p.invoiceNo}</Link> : '—'}</td></tr>
            ))}
            {!d.payments.length && <tr><td colSpan={5}>No payments.</td></tr>}
          </tbody>
        </table></div>
      )}
    </Modal>
  );
}

export default function Users() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [plan, setPlan] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; items: U[] } | null>(null);
  const [plans, setPlans] = useState<PlansResponse | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<U | null>(null);

  const load = useCallback(() => {
    const p = new URLSearchParams({ page: String(page) });
    if (q) p.set('q', q); if (status) p.set('status', status); if (plan) p.set('plan', plan); if (role) p.set('role', role);
    api<{ total: number; items: U[] }>('/admin/users?' + p).then(setData).catch((e) => { setErr(e.message); setData({ total: 0, items: [] }); });
  }, [q, status, plan, role, page]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { api<PlansResponse>('/plans').then(setPlans).catch(() => {}); }, []);

  async function act(path: string, body: unknown, m: string) {
    setMsg(''); setErr('');
    try { await api(path, { method: 'PATCH', body }); setMsg(m); load(); } catch (e: any) { setErr(e.message); }
  }

  const items = data?.items ?? [];
  return (
    <>
      <Notice msg={msg} err={err} />
      <h1><span className="gold">Users</span></h1>
      <div className="toolbar">
        <label htmlFor="u-q" className="sr-only">Search</label>
        <input id="u-q" placeholder="Search name, email or mobile" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <label htmlFor="u-plan" className="sr-only">Plan</label>
        <select id="u-plan" value={plan} onChange={(e) => { setPlan(e.target.value); setPage(1); }}><option value="">All plans</option><option value="premium">Any paid plan</option><option value="trade">Trade with us</option><option value="club">waves4u club</option><option value="free">Free</option></select>
        <label htmlFor="u-role" className="sr-only">Role</label>
        <select id="u-role" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}><option value="">Any role</option><option value="user">Users</option><option value="admin">Admins</option></select>
        <label htmlFor="u-status" className="sr-only">Status</label>
        <select id="u-status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">Any status</option><option value="active">Active</option><option value="blocked">Blocked</option></select>
      </div>
      {data === null ? <SkeletonTable /> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Plans</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map((u) => (
                <tr key={u._id}>
                  <td><b>{u.name}</b><br /><small className="muted">{u.email}</small></td>
                  <td>{u.plans.length ? u.plans.map((p, i) => <div key={i} className="small">{PRODUCT_LABEL[p.product]}{p.segment ? ` · ${SEGMENT_LABEL[p.segment]}` : ''} <span className="muted">to {fmtDate(p.endsAt)}</span></div>) : <span className="pill">Free</span>}</td>
                  <td>
                    <label className="sr-only" htmlFor={`r-${u._id}`}>Role for {u.name}</label>
                    <select id={`r-${u._id}`} value={u.role} onChange={(e) => act(`/admin/users/${u._id}/role`, { role: e.target.value }, `${u.name} is now ${e.target.value}`)} style={{ minHeight: 36, padding: '4px 8px', minWidth: 100 }}>
                      <option value="user">User</option><option value="admin">Admin</option>
                    </select>
                    {u.role === 'admin' && <div><small className={u.totpEnabled ? 'bull' : 'bear'}>{u.totpEnabled ? '2FA on' : '2FA not set up'}</small></div>}
                  </td>
                  <td><span className={'pill ' + (u.status === 'blocked' ? 'pill-bad' : 'pill-ok')}>{u.status}</span></td>
                  <td className="nw">{fmtDate(u.createdAt)}</td>
                  <td className="nw">
                    <button className="btn btn-sm btn-primary" onClick={() => setOpen(u)}>Plans & payments</button>{' '}
                    <button className="btn btn-sm" onClick={() => act(`/admin/users/${u._id}/status`, { status: u.status === 'blocked' ? 'active' : 'blocked' }, u.status === 'blocked' ? `${u.name} unblocked` : `${u.name} blocked`)}>{u.status === 'blocked' ? 'Unblock' : 'Block'}</button>
                  </td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan={6} className="center">No users found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <p className="row" style={{ marginTop: 14 }}>{data?.total ?? 0} users · page {page}
        <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
        <button className="btn btn-sm" disabled={page * 20 >= (data?.total ?? 0)} onClick={() => setPage(page + 1)}>Next</button></p>
      {open && <UserDetail u={open} plans={plans} onClose={() => setOpen(null)} onChanged={(m) => { setMsg(m); load(); }} />}
    </>
  );
}
