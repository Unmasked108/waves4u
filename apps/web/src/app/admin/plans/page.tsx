'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { DURATION_LABEL, inr, PRODUCT_LABEL } from '@/lib/types';
import Notice from '@/components/Notice';
import { SkeletonTable } from '@/components/Skeleton';

type Plan = { _id: string; code: string; product: string; duration: string; name: string; pricePaise: number; durationDays: number; active: boolean; sortOrder: number };

/** Admins edit prices and switch plans on/off without code changes (spec section 5). */
export default function Plans() {
  const [items, setItems] = useState<Plan[] | null>(null);
  const [edit, setEdit] = useState<Record<string, { name: string; price: string; days: string }>>({});
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [nw, setNw] = useState({ product: 'club', duration: 'monthly', name: '', price: '', days: '' });
  const load = () => api<{ items: Plan[] }>('/admin/plans').then((d) => {
    setItems(d.items);
    setEdit(Object.fromEntries(d.items.map((p) => [p.code, { name: p.name, price: String(p.pricePaise / 100), days: String(p.durationDays) }])));
  }).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  async function save(p: Plan, patch: Record<string, unknown>, m: string) {
    setMsg(''); setErr('');
    try { await api(`/admin/plans/${p.code}`, { method: 'PATCH', body: patch }); setMsg(m); load(); } catch (e: any) { setErr(e.message); }
  }
  async function create(e: React.FormEvent) {
    e.preventDefault(); setMsg(''); setErr('');
    try {
      await api('/admin/plans', { method: 'POST', body: { product: nw.product, duration: nw.duration, name: nw.name, pricePaise: Math.round(Number(nw.price) * 100), durationDays: nw.days ? Number(nw.days) : undefined } });
      setMsg('Plan created'); setNw({ ...nw, name: '', price: '', days: '' }); load();
    } catch (e: any) { setErr(e.message); }
  }

  const legacy = (p: Plan) => !(p.duration in DURATION_LABEL);
  return (
    <>
      <Notice msg={msg} err={err} />
      <h1>Plans <span className="gold">&amp; prices</span></h1>
      <p>Prices are in rupees and include GST. A change applies to new purchases straight away; existing subscribers keep what they paid for.</p>
      {!items ? <SkeletonTable /> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Product</th><th>Duration</th><th>Name</th><th>Price (₹)</th><th>Days</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {items.map((p) => {
                const e = edit[p.code] ?? { name: p.name, price: '', days: '' };
                const set = (k: keyof typeof e, v: string) => setEdit({ ...edit, [p.code]: { ...e, [k]: v } });
                const dirty = e.name !== p.name || Number(e.price) * 100 !== p.pricePaise || Number(e.days) !== p.durationDays;
                return (
                  <tr key={p.code}>
                    <td>{PRODUCT_LABEL[p.product]}{legacy(p) && <><br /><small className="muted">legacy</small></>}</td>
                    <td>{DURATION_LABEL[p.duration] ?? p.duration}</td>
                    <td><label className="sr-only" htmlFor={`n-${p.code}`}>Name</label><input id={`n-${p.code}`} value={e.name} onChange={(x) => set('name', x.target.value)} style={{ minWidth: 200, minHeight: 36, padding: '4px 8px' }} /></td>
                    <td><label className="sr-only" htmlFor={`p-${p.code}`}>Price</label><input id={`p-${p.code}`} type="number" min={1} step="1" value={e.price} onChange={(x) => set('price', x.target.value)} style={{ width: 110, minHeight: 36, padding: '4px 8px' }} /></td>
                    <td><label className="sr-only" htmlFor={`d-${p.code}`}>Days</label><input id={`d-${p.code}`} type="number" min={1} value={e.days} onChange={(x) => set('days', x.target.value)} style={{ width: 80, minHeight: 36, padding: '4px 8px' }} /></td>
                    <td><span className={'pill ' + (p.active ? 'pill-ok' : '')}>{p.active ? 'On sale' : 'Hidden'}</span></td>
                    <td className="nw">
                      <button className="btn btn-sm btn-primary" disabled={!dirty} onClick={() => save(p, { name: e.name, pricePaise: Math.round(Number(e.price) * 100), durationDays: Number(e.days) }, `${p.name}: saved (${inr(Math.round(Number(e.price) * 100))})`)}>Save</button>{' '}
                      <button className="btn btn-sm" onClick={() => save(p, { active: !p.active }, p.active ? 'Plan hidden' : 'Plan on sale')}>{p.active ? 'Hide' : 'Put on sale'}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2>Add a plan</h2>
      <form className="card row" style={{ alignItems: 'flex-end' }} onSubmit={create}>
        <div style={{ flex: '1 1 150px' }}><label htmlFor="np-prod">Product</label><select id="np-prod" value={nw.product} onChange={(e) => setNw({ ...nw, product: e.target.value })}><option value="trade">Trade with us</option><option value="club">waves4u club</option></select></div>
        <div style={{ flex: '1 1 140px' }}><label htmlFor="np-dur">Duration</label><select id="np-dur" value={nw.duration} onChange={(e) => setNw({ ...nw, duration: e.target.value })}>{Object.entries(DURATION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div style={{ flex: '2 1 200px' }}><label htmlFor="np-name">Name</label><input id="np-name" required value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })} /></div>
        <div style={{ flex: '1 1 110px' }}><label htmlFor="np-price">Price (₹)</label><input id="np-price" type="number" min={1} required value={nw.price} onChange={(e) => setNw({ ...nw, price: e.target.value })} /></div>
        <div style={{ flex: '1 1 90px' }}><label htmlFor="np-days">Days</label><input id="np-days" type="number" min={1} placeholder="auto" value={nw.days} onChange={(e) => setNw({ ...nw, days: e.target.value })} /></div>
        <button className="btn btn-primary">Add plan</button>
      </form>
      <p className="small">Each product can have one plan per duration. To change an existing one, edit it above.</p>
    </>
  );
}
