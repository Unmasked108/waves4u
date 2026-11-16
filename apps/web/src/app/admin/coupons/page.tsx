'use client';
import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { api } from '@/lib/client';
import { DURATION_LABEL, fmtDate, inr, PRODUCT_LABEL } from '@/lib/types';
import Notice from '@/components/Notice';
import { SkeletonTable } from '@/components/Skeleton';

type C = {
  _id: string; code: string; description?: string; type: 'percent' | 'flat'; value: number; products: string[]; durations: string[];
  validFrom?: string; validTo?: string; maxUses?: number; usedCount: number; active: boolean;
};
const blank = { code: '', description: '', type: 'percent' as 'percent' | 'flat', value: '', products: [] as string[], durations: [] as string[], validFrom: '', validTo: '', maxUses: '' };

/** Coupon codes and discounts, managed without code changes (spec section 5). */
export default function Coupons() {
  const [items, setItems] = useState<C[] | null>(null);
  const [f, setF] = useState(blank);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const load = () => api<{ items: C[] }>('/admin/coupons').then((d) => setItems(d.items)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const toggle = (k: 'products' | 'durations', v: string) => setF({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] });

  async function create(e: React.FormEvent) {
    e.preventDefault(); setMsg(''); setErr('');
    try {
      await api('/admin/coupons', {
        method: 'POST',
        body: {
          code: f.code, description: f.description || undefined, type: f.type,
          value: f.type === 'percent' ? Number(f.value) : Math.round(Number(f.value) * 100),
          products: f.products, durations: f.durations,
          validFrom: f.validFrom || undefined, validTo: f.validTo ? `${f.validTo}T23:59:59` : undefined, maxUses: f.maxUses ? Number(f.maxUses) : undefined,
        },
      });
      setMsg(`Coupon ${f.code.toUpperCase()} created`); setF(blank); load();
    } catch (e: any) { setErr(e.message); }
  }
  async function patch(c: C, body: object, m: string) {
    setMsg(''); setErr('');
    try { await api(`/admin/coupons/${c._id}`, { method: 'PATCH', body }); setMsg(m); load(); } catch (e: any) { setErr(e.message); }
  }
  async function remove(c: C) {
    setMsg(''); setErr('');
    try { await api(`/admin/coupons/${c._id}`, { method: 'DELETE' }); setMsg(`${c.code} deleted`); load(); } catch (e: any) { setErr(e.message); }
  }

  return (
    <>
      <Notice msg={msg} err={err} />
      <h1><span className="gold">Coupons</span></h1>
      <form className="card" onSubmit={create}>
        <h2 style={{ marginTop: 0, fontSize: '1.15rem' }}>New coupon</h2>
        <div className="g g3" style={{ gap: '0 16px' }}>
          <div className="field"><label htmlFor="c-code">Code</label><input id="c-code" required minLength={3} maxLength={30} pattern="[A-Za-z0-9_\-]+" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="DIWALI20" /></div>
          <div className="field"><label htmlFor="c-type">Discount type</label><select id="c-type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as 'percent' | 'flat' })}><option value="percent">Percentage (%)</option><option value="flat">Flat amount (₹)</option></select></div>
          <div className="field"><label htmlFor="c-val">{f.type === 'percent' ? 'Percent off' : 'Rupees off'}</label><input id="c-val" type="number" required min={1} max={f.type === 'percent' ? 100 : undefined} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></div>
          <div className="field"><label htmlFor="c-from">Valid from (optional)</label><input id="c-from" type="date" value={f.validFrom} onChange={(e) => setF({ ...f, validFrom: e.target.value })} /></div>
          <div className="field"><label htmlFor="c-to">Valid until (optional)</label><input id="c-to" type="date" value={f.validTo} onChange={(e) => setF({ ...f, validTo: e.target.value })} /></div>
          <div className="field"><label htmlFor="c-max">Max uses (optional)</label><input id="c-max" type="number" min={1} value={f.maxUses} onChange={(e) => setF({ ...f, maxUses: e.target.value })} /></div>
        </div>
        <div className="field"><label htmlFor="c-desc">Description (internal)</label><input id="c-desc" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <fieldset className="seg"><legend>Applies to products (none ticked = all)</legend>
          <div className="row">{Object.entries(PRODUCT_LABEL).map(([k, v]) => <label key={k} className="check"><input type="checkbox" checked={f.products.includes(k)} onChange={() => toggle('products', k)} /> {v}</label>)}</div>
        </fieldset>
        <fieldset className="seg"><legend>Applies to durations (none ticked = all)</legend>
          <div className="row">{Object.entries(DURATION_LABEL).map(([k, v]) => <label key={k} className="check"><input type="checkbox" checked={f.durations.includes(k)} onChange={() => toggle('durations', k)} /> {v}</label>)}</div>
        </fieldset>
        <button className="btn btn-primary">Create coupon</button>
      </form>

      <h2>All coupons</h2>
      {!items ? <SkeletonTable /> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Code</th><th>Discount</th><th>Applies to</th><th>Valid</th><th>Used</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {items.map((c) => (
                <tr key={c._id}>
                  <td><b>{c.code}</b>{c.description && <><br /><small className="muted">{c.description}</small></>}</td>
                  <td className="nw">{c.type === 'percent' ? `${c.value}%` : inr(c.value)}</td>
                  <td className="small">{c.products.length ? c.products.map((p) => PRODUCT_LABEL[p]).join(', ') : 'All products'}<br />{c.durations.length ? c.durations.map((d) => DURATION_LABEL[d]).join(', ') : 'All durations'}</td>
                  <td className="nw small">{c.validFrom ? fmtDate(c.validFrom) : 'Now'} – {c.validTo ? fmtDate(c.validTo) : 'No end'}</td>
                  <td>{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                  <td><span className={'pill ' + (c.active ? 'pill-ok' : '')}>{c.active ? 'Active' : 'Paused'}</span></td>
                  <td className="nw">
                    <button className="btn btn-sm" onClick={() => patch(c, { active: !c.active }, c.active ? `${c.code} paused` : `${c.code} active`)}>{c.active ? 'Pause' : 'Activate'}</button>{' '}
                    <button className="btn btn-sm btn-danger" onClick={() => remove(c)} aria-label={`Delete ${c.code}`}><Trash2 aria-hidden="true" /></button>
                  </td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan={7} className="center">No coupons yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
