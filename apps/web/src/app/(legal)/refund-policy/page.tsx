import LegalPage, { TBC } from '@/components/LegalPage';
import { SITE } from '@/lib/site';

export const metadata = { title: 'Refund Policy', alternates: { canonical: '/refund-policy' } };

export default function Page() {
  return (
    <LegalPage title="Refund Policy" updated="To be confirmed at launch">
      <div className="callout"><p>The refund terms below are a placeholder. The client must confirm the final policy (spec open question: &quot;Refund policy?&quot;).</p></div>
      <h2>Subscriptions</h2>
      <p><TBC>Fees once paid are non-refundable, as research is delivered from the moment the plan is activated. / OR: a pro-rata refund is available within N days of purchase.</TBC></p>
      <h2>Failed or duplicate payments</h2>
      <p>If money was debited but your plan was not activated, or you were charged twice, contact us with your payment reference. Verified amounts are refunded to the original payment method within <TBC>5–7 working days</TBC>.</p>
      <h2>How to request</h2>
      <p>Email <a href={`mailto:${SITE.email}`}>{SITE.email}</a> from your registered email address with your invoice number.</p>
      <h2>Grievances</h2>
      <p>If you are not satisfied with our response, write to our grievance officer at <a href={`mailto:${SITE.sebi.grievanceEmail}`}>{SITE.sebi.grievanceEmail}</a>. You may also lodge a complaint on SEBI SCORES (scores.sebi.gov.in) or the Smart ODR portal (smartodr.in).</p>
    </LegalPage>
  );
}
