import Link from 'next/link';
import { sget } from '@/lib/server';
import type { PlansResponse } from '@/lib/types';
import PageHero from '@/components/PageHero';
import PlanCards from '@/components/PlanCards';

export const metadata = {
  title: 'Plans & Pricing',
  description: 'Trade with us (Advisory) and waves4u club plans: monthly, quarterly, half-yearly and yearly. Pay online with UPI, cards or net banking.',
  alternates: { canonical: '/plans' },
};

export default async function PlansPage() {
  const d = await sget<PlansResponse>('/api/plans');
  return (
    <>
      <PageHero eyebrow="Plans & pricing" title="Plans & Pricing">
        Choose Trade with us for segment-wise research calls, or join the waves4u club for daily outlooks, chart studies and learning.
      </PageHero>
      <section className="sec">
        <div className="w">
          <PlanCards products={d?.products ?? []} headingLevel="h2" />
          <div className="card flat" style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: '1.3rem' }}>Algo advisory &amp; Mentorship</h2>
            <p>Pricing for Algo advisory and Mentorship is shared on a call, based on your goals and experience.</p>
            <Link href="/#contact" className="btn btn-primary">Get a Callback</Link>
          </div>
        </div>
      </section>
    </>
  );
}
