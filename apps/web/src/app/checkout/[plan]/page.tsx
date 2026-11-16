'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Lock, ShieldCheck, Tag, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api, ApiError } from '@/lib/client';
import { track } from '@/lib/analytics';
import { INDIAN_STATES } from '@/lib/site';
import { DURATION_LABEL, inr, SEGMENT_LABEL, type PlansResponse } from '@/lib/types';
import { SkeletonCards } from '@/components/Skeleton';

declare global { interface Window { Razorpay?: any } }

type Quote = { listPricePaise: number; discountPaise: number; amountPaise: number; taxablePaise: number; gstPaise: number; coupon: string | null };

function loadRazorpay() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load the payment window. Check your connection and try again.'));
    document.body.appendChild(s);
  });
}

export default function Checkout({ params }: { params: { plan: string } }) {
  const { me, loading, reload } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<PlansResponse | null>(null);
  const [segment, setSegment] = useState('');
  const [bill, setBill] = useState({ name: '', phone: '', state: '', address: '', gstin: '' });
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [couponErr, setCouponErr] = useState('');
  const [err, setErr] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const plan = useMemo(() => plans?.plans.find((p) => p.code === params.plan), [plans, params.plan]);
  const product = useMemo(() => plans?.products.find((p) => p.product === plan?.product), [plans, plan]);

  useEffect(() => {
    if (!loading && !me) router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  }, [loading, me, router]);
  useEffect(() => {
    setSegment(new URLSearchParams(window.location.search).get('segment') ?? '');
    api<PlansResponse>('/plans').then(setPlans).catch(() => setPlans({ products: [], plans: [] }));
  }, []);
  useEffect(() => { if (me) setBill((b) => ({ ...b, name: b.name || me.user.name, phone: b.phone || me.user.phone || '' })); }, [me]);
  useEffect(() => {
    if (!plan) return;
    api<Quote>('/payments/quote', { method: 'POST', body: { planCode: plan.code, coupon: coupon || undefined } })
      .then((q) => { setQuote(q); setCouponErr(''); })
      .catch((e) => { setCouponErr(e.message); setCoupon(''); });
  }, [plan, coupon]);
  useEffect(() => { if (plan && quote) track('begin_checkout', { currency: 'INR', value: quote.amountPaise / 100, items: [{ item_id: plan.code, item_name: plan.name }] }); }, [plan, quote]);

  if (loading || !me || !plans) return <div className="w sec"><SkeletonCards n={2} /></div>;
  if (!plan || !product)
    return (
      <section className="sec"><div className="w center">
        <h1>Plan not found</h1><p>This plan is not available any more.</p><Link href="/plans" className="btn btn-primary">See current plans</Link>
      </div></section>
    );

  const needsSeg = plan.product === 'trade';
  const renewing = me.subscriptions.find((s) => s.product === plan.product && (!needsSeg || s.segment === segment));

  async function pay(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setFields({});
    if (needsSeg && !segment) { setErr('Choose a segment.'); return; }
    setBusy(true);
    try {
      const o = await api<{ orderId: string; paymentId: string; amount: number; currency: string; keyId: string }>('/payments/order', {
        method: 'POST', body: { planCode: plan!.code, segment: needsSeg ? segment : undefined, coupon: coupon || undefined, billing: bill },
      });
      await loadRazorpay();
      const rzp = new window.Razorpay({
        key: o.keyId, amount: o.amount, currency: o.currency, order_id: o.orderId, name: 'waves4u',
        description: `${plan!.name}${needsSeg ? ` · ${SEGMENT_LABEL[segment]}` : ''}`,
        prefill: { name: bill.name, email: me!.user.email, contact: bill.phone }, theme: { color: '#0F2A4A' },
        handler: async (resp: any) => {
          try { await api('/payments/verify', { method: 'POST', body: resp }); } catch { /* the webhook still confirms it; the success page waits for it */ }
          track('purchase', { transaction_id: resp.razorpay_payment_id, currency: 'INR', value: o.amount / 100, coupon: coupon || undefined, items: [{ item_id: plan!.code, item_name: plan!.name, item_variant: segment || undefined }] });
          await reload();
          router.push(`/checkout/success?pid=${o.paymentId}`);
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.on('payment.failed', async (resp: any) => {
        const reason = resp?.error?.description || 'The payment was not completed.';
        await api('/payments/failed', { method: 'POST', body: { orderId: o.orderId, reason } }).catch(() => {});
        rzp.close?.();
        router.push(`/checkout/failure?plan=${plan!.code}${segment ? `&segment=${segment}` : ''}&reason=${encodeURIComponent(reason)}`);
      });
      rzp.open();
    } catch (e: any) {
      setErr(e.message);
      if (e instanceof ApiError) setFields(e.fields);
      setBusy(false);
    }
  }

  const f = (k: keyof typeof bill) => fields[`billing.${k}`];
  return (
    <>
      <section className="page-hero">
        <div className="w">
          <span className="eyebrow">Checkout</span>
          <h1>{renewing ? 'Renew' : 'Subscribe to'} {product.name}</h1>
          <p>{DURATION_LABEL[plan.duration]} plan · {plan.durationDays} days{renewing ? ` · adds after your current plan ends` : ''}</p>
        </div>
      </section>
      <section className="sec alt">
        <form className="w checkout" onSubmit={pay} noValidate>
          <div className="stack">
            {err && <div className="form-err" role="alert">{err}</div>}
            {needsSeg && (
              <div className="card">
                <fieldset className="seg" style={{ margin: 0 }}>
                  <legend><h2 style={{ fontSize: '1.15rem', margin: 0 }}>Segment</h2></legend>
                  <div className="seg-opts">
                    {product.segments.map((s) => (
                      <label key={s.code}><input type="radio" name="segment" value={s.code} checked={segment === s.code} onChange={() => setSegment(s.code)} /><span>{s.label}</span></label>
                    ))}
                  </div>
                </fieldset>
              </div>
            )}
            <div className="card">
              <h2 style={{ fontSize: '1.15rem' }}>Billing details</h2>
              <p className="small">Used for your GST invoice.</p>
              <div className="g g2" style={{ gap: '0 16px' }}>
                <div className="field">
                  <label htmlFor="b-name">Name on invoice <span className="req" aria-hidden="true">*</span></label>
                  <input id="b-name" required autoComplete="name" value={bill.name} onChange={(e) => setBill({ ...bill, name: e.target.value })} aria-invalid={!!f('name')} />
                  {f('name') && <p className="field-err">{f('name')}</p>}
                </div>
                <div className="field">
                  <label htmlFor="b-phone">Mobile number <span className="req" aria-hidden="true">*</span></label>
                  <input id="b-phone" type="tel" inputMode="tel" required autoComplete="tel-national" placeholder="98765 43210" value={bill.phone} onChange={(e) => setBill({ ...bill, phone: e.target.value })} aria-invalid={!!f('phone')} />
                  {f('phone') && <p className="field-err">{f('phone')}</p>}
                </div>
                <div className="field">
                  <label htmlFor="b-state">State <span className="req" aria-hidden="true">*</span></label>
                  <select id="b-state" required value={bill.state} onChange={(e) => setBill({ ...bill, state: e.target.value })} aria-invalid={!!f('state')}>
                    <option value="">Select your state…</option>
                    {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  {f('state') && <p className="field-err">{f('state')}</p>}
                </div>
                <div className="field">
                  <label htmlFor="b-gstin">GSTIN (optional, for businesses)</label>
                  <input id="b-gstin" value={bill.gstin} onChange={(e) => setBill({ ...bill, gstin: e.target.value.toUpperCase() })} maxLength={15} aria-invalid={!!f('gstin')} />
                  {f('gstin') && <p className="field-err">{f('gstin')}</p>}
                </div>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="b-addr">Address (optional)</label>
                <textarea id="b-addr" rows={2} autoComplete="street-address" value={bill.address} onChange={(e) => setBill({ ...bill, address: e.target.value })} />
              </div>
            </div>
          </div>

          <aside className="card summary" aria-labelledby="sum-title">
            <h2 id="sum-title" style={{ fontSize: '1.15rem' }}>Order summary</h2>
            <p style={{ margin: '0 0 12px', color: 'var(--text)' }}><b>{plan.name}</b>{needsSeg && segment ? <><br />Segment: {SEGMENT_LABEL[segment]}</> : null}</p>
            <div className="field">
              <label htmlFor="c-code">Coupon code</label>
              {coupon && quote?.coupon === coupon ? (
                <div className="row between pill pill-ok" style={{ padding: '8px 12px', width: '100%' }}>
                  <span className="row" style={{ gap: 6 }}><Tag size={14} aria-hidden="true" /> {coupon} applied</span>
                  <button type="button" className="btn-link btn" onClick={() => { setCoupon(''); setCouponInput(''); }} aria-label="Remove coupon"><X size={14} aria-hidden="true" /></button>
                </div>
              ) : (
                <div className="coupon-row">
                  <input id="c-code" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Enter code" aria-invalid={!!couponErr} aria-describedby={couponErr ? 'c-err' : undefined} />
                  <button type="button" className="btn" disabled={!!coupon && quote?.coupon !== coupon} onClick={() => couponInput.trim() && setCoupon(couponInput.trim().toUpperCase())}>
                    {coupon && quote?.coupon !== coupon ? 'Checking…' : 'Apply'}
                  </button>
                </div>
              )}
              {couponErr && <p className="field-err" id="c-err">{couponErr}</p>}
            </div>
            {quote ? (
              <table>
                <tbody>
                  <tr><td>Plan price</td><td>{inr(quote.listPricePaise)}</td></tr>
                  {quote.discountPaise > 0 && <tr><td>Discount ({quote.coupon})</td><td className="bull">− {inr(quote.discountPaise)}</td></tr>}
                  <tr><td className="muted small">Taxable value</td><td className="muted small">{inr(quote.taxablePaise)}</td></tr>
                  <tr><td className="muted small">GST 18% (included)</td><td className="muted small">{inr(quote.gstPaise)}</td></tr>
                  <tr className="total"><td>Total</td><td>{inr(quote.amountPaise)}</td></tr>
                </tbody>
              </table>
            ) : <div className="sk" style={{ height: 120 }} />}
            <button className="btn btn-gold btn-lg btn-block" style={{ marginTop: 16 }} disabled={busy || !quote} aria-busy={busy}>
              <Lock aria-hidden="true" /> {busy ? 'Opening secure payment…' : `Pay ${quote ? inr(quote.amountPaise) : ''}`}
            </button>
            <div className="trust">
              <span><ShieldCheck aria-hidden="true" /> Secured by Razorpay</span>
              <span><ShieldCheck aria-hidden="true" /> UPI · Cards · Net banking</span>
            </div>
            <p className="small" style={{ marginTop: 12, marginBottom: 0 }}>
              By paying you agree to our <Link href="/terms" className="btn-link">Terms</Link>, <Link href="/refund-policy" className="btn-link">Refund Policy</Link> and <Link href="/disclosures" className="btn-link">Research Disclosures</Link>.
            </p>
          </aside>
        </form>
      </section>
    </>
  );
}
