import LegalPage, { TBC } from '@/components/LegalPage';
import { SITE } from '@/lib/site';

export const metadata = { title: 'Disclaimer', alternates: { canonical: '/disclaimer' } };

export default function Page() {
  return (
    <LegalPage title="Disclaimer" updated="To be confirmed at launch">
      <div className="callout"><p><b>{SITE.disclaimer}</b></p></div>
      <p>The information on this website, including research calls, market analysis, blogs and videos, is provided by waves4u, a {SITE.sebi.type} (Registration No. <TBC>{SITE.sebi.regNo}</TBC>), for information and education.</p>
      <ul>
        <li>Past performance is not indicative of future results. We do not promise or guarantee any returns.</li>
        <li>Trading in derivatives (F&amp;O) and commodities involves substantial risk and may not be suitable for everyone. You may lose more than your initial capital in some products.</li>
        <li>Levels, targets and stop-losses are research opinions and may not be achieved. Market conditions can change quickly.</li>
        <li>Please consider your financial situation and risk appetite, and consult a SEBI registered investment adviser if you need personalised advice.</li>
        <li>waves4u, its analysts and their relatives may or may not hold positions in the securities discussed. See our research disclosures.</li>
      </ul>
      <p>Free content on this website (blogs, free analysis and videos) is educational and is not a recommendation to buy or sell any security.</p>
    </LegalPage>
  );
}
