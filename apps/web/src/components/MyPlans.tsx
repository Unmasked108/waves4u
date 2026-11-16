'use client';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';
import type { Me } from '@/lib/types';
import { daysLeft, fmtDate, PRODUCT_LABEL, SEGMENT_LABEL } from '@/lib/types';

/** The user's active plans with expiry, plus renew / upgrade actions (spec: renewal and upgrade options in the dashboard). */
export default function MyPlans({ me }: { me: Me }) {
  const subs = me.subscriptions;
  const soon = subs.filter((s) => daysLeft(s.endsAt) <= 7);
  const renewHref = (s: Me['subscriptions'][number]) => `/checkout/${s.plan.code}${s.segment ? `?segment=${s.segment}` : ''}`;
  return (
    <>
      {soon.map((s) => (
        <div className="banner" role="status" key={'w' + s.id}>
          <AlertTriangle aria-hidden="true" />
          <p>
            Your <b>{PRODUCT_LABEL[s.product]}{s.segment ? ` (${SEGMENT_LABEL[s.segment]})` : ''}</b> plan ends on <b>{fmtDate(s.endsAt)}</b>
            {' '}({daysLeft(s.endsAt) <= 1 ? 'within a day' : `in ${daysLeft(s.endsAt)} days`}). <Link href={renewHref(s)} className="btn-link">Renew now</Link>
          </p>
        </div>
      ))}
      {subs.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Plan</th><th>Segment</th><th>Valid until</th><th>Days left</th><th></th></tr></thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id}>
                  <td><b>{s.plan.name}</b></td>
                  <td>{s.segment ? SEGMENT_LABEL[s.segment] : '—'}</td>
                  <td className="nw">{fmtDate(s.endsAt)}</td>
                  <td><span className={'pill ' + (daysLeft(s.endsAt) <= 7 ? 'pill-warn' : 'pill-ok')}>{daysLeft(s.endsAt)}</span></td>
                  <td className="nw"><Link href={renewHref(s)} className="btn btn-sm"><RefreshCw aria-hidden="true" /> Renew</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card feature">
          <h3 className="row" style={{ gap: 8 }}><Sparkles size={20} aria-hidden="true" /> You are on the free plan</h3>
          <p>Upgrade for research calls in your segment (Trade with us) or daily outlooks, chart studies and member videos (waves4u club).</p>
          <Link href="/plans" className="btn btn-gold">See plans</Link>
        </div>
      )}
      {subs.length > 0 && (
        <p className="small" style={{ marginTop: 12 }}>
          Want more? {!me.isClub && <>Add the <Link href="/plans#club" className="btn-link">waves4u club</Link>. </>}
          {me.segments.length < 4 && <>Add another <Link href="/plans#trade" className="btn-link">Trade with us segment</Link>. </>}
          Upgrading to a longer plan saves up to 25% versus monthly.
        </p>
      )}
    </>
  );
}
