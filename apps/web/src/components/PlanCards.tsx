'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { DURATION_LABEL, inr, type Product } from '@/lib/types';
import { Empty } from './Cards';

const INCLUDES: Record<string, string[]> = {
  trade: ['Real-time research calls', 'Entry, target & stop-loss', 'Rationale & disclosures', 'Member trade log', 'Premium analysis & videos'],
  club: ['Daily market outlook', 'Elliott Wave chart studies', 'Member-only videos', 'Community access', 'Mentorship sessions'],
};

/** Spec section 5: price, duration, saving vs monthly, what is included and a Subscribe button.
 *  Trade with us: the user picks a segment first, then a duration. */
export default function PlanCards({ products, headingLevel = 'h3' }: { products: Product[]; headingLevel?: 'h2' | 'h3' }) {
  const { me } = useAuth();
  const [segment, setSegment] = useState<string>('');
  const H = headingLevel;
  if (!products.length) return <Empty>Plans are being updated. Please check back shortly or request a callback.</Empty>;

  return (
    <>
      {products.map((p) => {
        const best = [...p.plans].sort((a, b) => b.savingPercent - a.savingPercent || b.months - a.months)[0]?.code;
        const needsSeg = p.product === 'trade';
        return (
          <div className="product" id={p.product} key={p.product}>
            <div className="product-head">
              <div>
                <H>{p.name}</H>
                <p>{p.tagline}</p>
              </div>
            </div>

            {needsSeg && (
              <fieldset className="seg">
                <legend>1. Choose your segment</legend>
                <div className="seg-opts">
                  {p.segments.map((s) => (
                    <label key={s.code}>
                      <input type="radio" name="segment" value={s.code} checked={segment === s.code} onChange={() => setSegment(s.code)} />
                      <span>{s.label}{me?.segments.includes(s.code) ? ' · Active' : ''}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {needsSeg && <p className="label" style={{ marginBottom: 10 }}>2. Choose a duration</p>}

            <div className="plan-grid">
              {p.plans.map((pl) => {
                const href = `/checkout/${pl.code}${needsSeg && segment ? `?segment=${segment}` : ''}`;
                return (
                  <div key={pl.code} className={'card plan' + (pl.code === best && pl.savingPercent > 0 ? ' best' : '')}>
                    {pl.code === best && pl.savingPercent > 0 && <span className="ribbon">Best value</span>}
                    <div className="dur">{DURATION_LABEL[pl.duration] ?? pl.duration}</div>
                    <div className="price">{inr(pl.pricePaise)}</div>
                    <div className="per">
                      {pl.months > 1 ? <>{inr(pl.perMonthPaise)} / month · {pl.months} months</> : <>per month</>}
                    </div>
                    {pl.savingPercent > 0
                      ? <span className="pill pill-ok save">Save {pl.savingPercent}% vs monthly</span>
                      : <span className="pill save">Billed monthly</span>}
                    <ul className="checks">
                      {INCLUDES[p.product].map((c) => <li key={c}><Check aria-hidden="true" />{c}</li>)}
                    </ul>
                    {needsSeg && !segment ? (
                      <button className="btn btn-primary btn-block" aria-disabled="true" onClick={() => document.querySelector<HTMLInputElement>('.seg input')?.focus()}>
                        Choose a segment first
                      </button>
                    ) : (
                      <Link href={href} className="btn btn-primary btn-block" aria-label={`Subscribe to ${pl.name}`}>Subscribe</Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <p className="plan-note">
        All prices in Indian Rupees and inclusive of GST (to be confirmed). Pay with UPI, cards or net banking; a GST invoice is emailed automatically.
        Renewing early adds the new period after your current one. Read our <Link href="/refund-policy">refund policy</Link>.
      </p>
    </>
  );
}
