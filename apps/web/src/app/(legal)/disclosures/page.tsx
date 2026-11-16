import LegalPage, { TBC } from '@/components/LegalPage';
import { SITE } from '@/lib/site';

export const metadata = { title: 'Research Disclosures', alternates: { canonical: '/disclosures' } };

export default function Page() {
  const s = SITE.sebi;
  return (
    <LegalPage title="Research Disclosures" updated="To be confirmed at launch">
      <div className="callout"><p>Standard Research Analyst disclosures under the SEBI (Research Analysts) Regulations, 2014. Exact wording to be confirmed by the client&apos;s compliance officer.</p></div>
      <h2>Registration details</h2>
      <table>
        <tbody>
          <tr><th scope="row">Registered name</th><td><TBC>waves4u / legal entity name</TBC></td></tr>
          <tr><th scope="row">Registration type</th><td>{s.type}</td></tr>
          <tr><th scope="row">Registration No.</th><td><TBC>{s.regNo}</TBC></td></tr>
          <tr><th scope="row">Research analyst</th><td><TBC>{s.analyst}</TBC></td></tr>
          <tr><th scope="row">BSE enlistment No.</th><td><TBC>{s.bseEnlistment || 'To be confirmed'}</TBC></td></tr>
          <tr><th scope="row">Compliance / grievance officer</th><td><TBC>{s.complianceOfficer}</TBC>, <a href={`mailto:${s.grievanceEmail}`}>{s.grievanceEmail}</a></td></tr>
          <tr><th scope="row">Registered address</th><td><TBC>{SITE.address}</TBC></td></tr>
        </tbody>
      </table>
      <h2>Disclosures</h2>
      <ul>
        <li>The research analyst or relatives <TBC>do / do not</TBC> have a financial interest in, or actual beneficial ownership of 1% or more of, the securities covered.</li>
        <li>The research analyst has not received compensation from the subject companies in the past twelve months.</li>
        <li>The research analyst has not served as an officer, director or employee of the subject companies.</li>
        <li>No material disciplinary action has been taken against the research analyst by any regulator. <TBC>Confirm.</TBC></li>
        <li>Every research call states its rationale, entry range, target, stop-loss and the disclosures applicable to it.</li>
      </ul>
      <h2>Standard warning</h2>
      <p><b>{SITE.disclaimer}</b></p>
      <h2>Investor grievances</h2>
      <p>Write to <a href={`mailto:${s.grievanceEmail}`}>{s.grievanceEmail}</a>. We aim to resolve complaints within <TBC>21 days</TBC>. If unresolved, you can approach SEBI SCORES (scores.sebi.gov.in) or Smart ODR (smartodr.in).</p>
    </LegalPage>
  );
}
