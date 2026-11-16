import Link from 'next/link';
import LegalPage, { TBC } from '@/components/LegalPage';
import { SITE } from '@/lib/site';

export const metadata = { title: 'Privacy Policy', alternates: { canonical: '/privacy-policy' } };

export default function Page() {
  return (
    <LegalPage title="Privacy Policy" updated="To be confirmed at launch">
      <div className="callout"><p>Draft for review by waves4u&apos;s legal / compliance adviser before go-live.</p></div>
      <p>This policy explains how waves4u (&quot;we&quot;, &quot;us&quot;) collects, uses and protects your personal information when you use {SITE.url.replace('https://', '')}.</p>
      <h2>Information we collect</h2>
      <ul>
        <li><b>Account details:</b> name, email address, mobile number and password (stored only as a secure hash).</li>
        <li><b>Callback requests:</b> name, mobile number, trading capital range and your consent to be contacted.</li>
        <li><b>Billing details:</b> name, mobile number, state, address and GSTIN (if provided) for GST invoices. Card, UPI and bank details are handled by our payment partner Razorpay and never reach our servers.</li>
        <li><b>Usage data:</b> if you accept analytics cookies, Google Analytics collects pages visited and device information in aggregated form.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To create and secure your account and give you access to your plan.</li>
        <li>To call you back when you ask us to, and to send service emails (invoices, renewal reminders, password resets).</li>
        <li>To meet legal, tax and SEBI record-keeping obligations.</li>
        <li>To improve the website (only with your analytics consent).</li>
      </ul>
      <p>We do not sell your personal information.</p>
      <h2>Sharing</h2>
      <p>We share data only with service providers who help us run the service (hosting, email delivery, payments, analytics), under confidentiality obligations, or when required by law or a regulator.</p>
      <h2>Retention</h2>
      <p>We keep account and billing records for as long as required by law (for example, tax and SEBI rules: <TBC>period to be confirmed</TBC>). Callback leads are kept for <TBC>12 months</TBC> unless you become a client.</p>
      <h2>Your choices and rights</h2>
      <ul>
        <li>Update your name and mobile number from your dashboard profile.</li>
        <li>Ask us for a copy of your data, a correction, or deletion where the law allows.</li>
        <li>Withdraw analytics consent at any time by clearing this site&apos;s cookies / local storage.</li>
      </ul>
      <h2>Security</h2>
      <p>We use HTTPS, hashed passwords, role-based access checked on our servers, two-factor authentication for staff and daily backups.</p>
      <h2>Contact</h2>
      <p>Email <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or call <a href={SITE.phoneHref}>{SITE.phone}</a>. Grievance officer: <TBC>{SITE.sebi.complianceOfficer}</TBC>, <a href={`mailto:${SITE.sebi.grievanceEmail}`}>{SITE.sebi.grievanceEmail}</a>.</p>
      <p>See also our <Link href="/terms">Terms &amp; Conditions</Link>.</p>
    </LegalPage>
  );
}
