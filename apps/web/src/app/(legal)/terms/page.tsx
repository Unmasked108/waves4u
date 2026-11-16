import Link from 'next/link';
import LegalPage, { TBC } from '@/components/LegalPage';
import { SITE } from '@/lib/site';

export const metadata = { title: 'Terms & Conditions', alternates: { canonical: '/terms' } };

export default function Page() {
  return (
    <LegalPage title="Terms & Conditions" updated="To be confirmed at launch">
      <div className="callout"><p>Draft for review by waves4u&apos;s legal / compliance adviser before go-live.</p></div>
      <h2>1. About the service</h2>
      <p>waves4u provides market research, research calls, educational content and mentorship. waves4u is a {SITE.sebi.type} (Registration No. <TBC>{SITE.sebi.regNo}</TBC>). We do not place trades on your behalf and do not handle your funds or securities.</p>
      <h2>2. Your account</h2>
      <ul>
        <li>Accounts are personal. To protect member content, only one active login per account is allowed; logging in on a new device signs out the previous one.</li>
        <li>You must not share, copy, resell or redistribute research calls, analysis, videos or any member content.</li>
        <li>We may suspend accounts that breach these terms.</li>
      </ul>
      <h2>3. Plans and payments</h2>
      <ul>
        <li>Prices are in Indian Rupees and <TBC>inclusive of GST</TBC>. A GST invoice is emailed after each payment.</li>
        <li>A plan gives access to the product (and, for Trade with us, the segment) you purchased until its expiry date. Renewing early adds the new period after the current one.</li>
        <li>Plans do not auto-renew. We send reminders 7 days and 1 day before expiry.</li>
        <li>Refunds are governed by our <Link href="/refund-policy">Refund Policy</Link>.</li>
      </ul>
      <h2>4. No guarantee of returns</h2>
      <p>{SITE.disclaimer} Research calls and analysis are opinions based on our methodology and carry risk. You are responsible for your own trading decisions, position sizing and compliance with applicable law.</p>
      <h2>5. Intellectual property</h2>
      <p>All content on this website is owned by waves4u and protected by copyright. Personal, non-commercial use only.</p>
      <h2>6. Limitation of liability</h2>
      <p>To the extent permitted by law, waves4u is not liable for trading losses or indirect losses arising from the use of the service.</p>
      <h2>7. Governing law</h2>
      <p>These terms are governed by the laws of India. Courts at <TBC>city to be confirmed</TBC> have exclusive jurisdiction.</p>
      <h2>8. Contact</h2>
      <p><a href={`mailto:${SITE.email}`}>{SITE.email}</a> · <a href={SITE.phoneHref}>{SITE.phone}</a></p>
    </LegalPage>
  );
}
