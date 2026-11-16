/**
 * Business details used across the site. Items marked "TO CONFIRM" are open questions for the client
 * (spec section 11): update them here and every page picks them up.
 */
export const SITE = {
  name: 'waves4u',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://waves4u.com',
  tagline: 'RIDE EVERY WAVE',
  subTagline: 'Turning Waves into Wins',
  description:
    'waves4u: market research, advisory, algo advisory, trading community and mentorship based on Elliott Wave, technical, derivatives and fundamental analysis across index F&O, stock F&O, cash equities and MCX commodities.',
  phone: '+91 84694 36766',
  phoneHref: 'tel:+918469436766',
  email: 'support@waves4u.com', // TO CONFIRM: keep the reference site's email or use a waves4u address
  address: 'Office address to be confirmed', // TO CONFIRM
  addressLines: ['Office address', 'City, State PIN', 'India'], // TO CONFIRM
  hours: 'Mon–Fri, 9:00 am – 6:00 pm IST',
  /** Google Maps embed: replace q= with the exact office address or a Maps place link. */
  mapEmbed: 'https://www.google.com/maps?q=India&output=embed', // TO CONFIRM
  social: {
    youtube: 'https://www.youtube.com/@waves4u_1',
    instagram: '', // TO CONFIRM
    x: '', // TO CONFIRM
    linkedin: '', // TO CONFIRM
    telegram: '', // TO CONFIRM
  },
  /** SEBI Research Analyst details (spec section 10, compliance). TO CONFIRM with the client. */
  sebi: {
    type: 'SEBI Registered Research Analyst',
    regNo: 'INH000000000',
    analyst: 'Analyst name',
    analystTitle: 'Founder & Research Analyst',
    bseEnlistment: '',
    complianceOfficer: 'Compliance officer name',
    grievanceEmail: 'grievance@waves4u.com',
  },
  disclaimer:
    'Investments in securities market are subject to market risks. Read all the related documents carefully before investing. Registration granted by SEBI, membership of BASL (in case of IAs) and certification from NISM in no way guarantee performance of the intermediary or provide any assurance of returns to investors.',
};

export const NAV = [
  { href: '/', label: 'Home' },
  { href: '/#about', label: 'About' },
  { href: '/#services', label: 'Services' },
  { href: '/plans', label: 'Plans' },
  { href: '/blogs', label: 'Blogs' },
  { href: '/analysis', label: 'Market Analysis' },
  { href: '/videos', label: 'Videos' },
  { href: '/#contact', label: 'Contact' },
];

export const LEGAL = [
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/disclaimer', label: 'Disclaimer' },
  { href: '/refund-policy', label: 'Refund Policy' },
  { href: '/disclosures', label: 'Research Disclosures' },
];

export type ServiceIcon = 'advisory' | 'club' | 'algo' | 'mentor';
/** Spec section 4. Titles are final; descriptions and checklists are drafts for the client to confirm. */
export const SERVICES: { id: string; icon: ServiceIcon; title: string; desc: string; checks: string[]; href: string }[] = [
  {
    id: 'trade',
    icon: 'advisory',
    title: 'Trade with us (Advisory)',
    desc: 'Real-time research calls across index F&O, stock F&O, MCX and futures, each with defined levels and rationale.',
    checks: ['Real-time research calls', 'Entry, target and stop-loss on every call', 'Rationale and disclosures', 'Segment-wise plans'],
    href: '/plans#trade',
  },
  {
    id: 'club',
    icon: 'club',
    title: 'waves4u club',
    desc: 'Membership community for traders who want ongoing market views and learning.',
    checks: ['Daily market outlook', 'Elliott Wave chart studies', 'Member-only videos', 'Community access'],
    href: '/plans#club',
  },
  {
    id: 'algo',
    icon: 'algo',
    title: 'Algo advisory',
    desc: 'Rule-based strategy research for traders who want systematic, disciplined execution.',
    checks: ['Rule-based strategies', 'Backtest reports', 'Deployment guidance', 'Defined risk parameters'],
    href: '/#contact',
  },
  {
    id: 'mentorship',
    icon: 'mentor',
    title: 'Mentorship (Education)',
    desc: 'Structured learning to build your own analysis and trading process.',
    checks: ['Elliott Wave fundamentals', 'Derivatives and option chain', 'Risk management', 'Live sessions and Q&A'],
    href: '/#contact',
  },
];

/** Spec section 6. */
export const PROCESS = [
  { n: '01', title: 'Market Scan', desc: 'Daily screening of index F&O, stock F&O, cash and MCX instruments for liquidity, trend and volatility conditions.', out: 'Watchlist' },
  { n: '02', title: 'Technical, Elliott Wave, Derivatives & Fundamental Analysis', desc: 'Set-ups validated with price structure, volume, open interest and option-chain data across multiple timeframes.', out: 'Qualified set-ups' },
  { n: '03', title: 'Risk Definition', desc: 'Entry range, target, stop-loss and suggested allocation fixed before release, with reward-to-risk assessed for every call.', out: 'Defined levels' },
  { n: '04', title: 'Research Release', desc: 'Recommendation issued in real time, together with its rationale and applicable disclosures.', out: 'Research call' },
  { n: '05', title: 'Review & Record', desc: 'Every outcome is logged in the member trade log and reviewed periodically to refine the research process.', out: 'Trade log entry' },
];

export const CAPITAL_OPTIONS = [
  { value: 'below_1l', label: 'Below ₹1,00,000' },
  { value: '1l_5l', label: '₹1,00,000 – ₹5,00,000' },
  { value: '5l_10l', label: '₹5,00,000 – ₹10,00,000' },
  { value: 'above_10l', label: 'Above ₹10,00,000' },
];

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Outside India',
];
