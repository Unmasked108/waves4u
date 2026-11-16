export type Access = 'free' | 'premium' | 'club';
export type Market = { _id: string; name: string; slug: string; category: string };
export type Levels = { support?: string; resistance?: string; target?: string; stopLoss?: string; notes?: string };
export type Analysis = {
  _id: string; title: string; market: Market; timeframe?: string; waveCount: string; access?: Access; locked?: boolean;
  bias: 'Bullish' | 'Bearish' | 'Neutral'; chartImageUrl?: string; summary?: string; levels?: Levels; publishedAt?: string;
};
export type BlogItem = {
  _id: string; title: string; slug: string; market?: string; teaser: string; access?: Access; coverImageUrl?: string;
  publishedAt?: string; updatedAt?: string; status?: string; publishAt?: string;
};
export type Video = {
  _id: string; provider: 'youtube' | 'vimeo'; videoId?: string; title: string; description?: string; thumbnail?: string;
  access: Access; locked?: boolean; publishedAt: string; source?: 'sync' | 'manual'; hidden?: boolean;
};
export type PlanItem = {
  code: string; name: string; product: 'trade' | 'club'; duration: string; pricePaise: number; durationDays: number;
  months: number; perMonthPaise: number; savingPercent: number;
};
export type Product = {
  product: 'trade' | 'club'; name: string; tagline: string; segments: { code: string; label: string }[]; plans: PlanItem[];
};
export type PlansResponse = { products: Product[]; plans: PlanItem[] };
export type Faq = { _id: string; question: string; answer: string; order?: number; active?: boolean };
export type Testimonial = { _id: string; firstName: string; city: string; text: string; rating?: number; consent?: boolean; order?: number; active?: boolean };
export type Session = { _id: string; title: string; description?: string; startsAt: string; joinLink?: string; capacity: number; registered?: boolean; registrations?: string[] };
export type MySub = { id: string; plan: { code: string; name: string; product: string; duration: string }; product: 'trade' | 'club'; segment: string | null; startsAt: string; endsAt: string };
export type Me = {
  user: { id: string; name: string; email: string; phone: string; role: 'user' | 'admin'; totpEnabled: boolean };
  isPremium: boolean;
  isClub: boolean;
  segments: string[];
  mfa: boolean;
  needs2fa: boolean;
  subscriptions: MySub[];
  subscription: { plan: { name: string; code: string }; endsAt: string } | null;
};

export const SEGMENT_LABEL: Record<string, string> = {
  index_stock_fno: 'Stock/Index F&O', stock_fno: 'Stock F&O', mcx: 'MCX', futures: 'Futures',
};
export const DURATION_LABEL: Record<string, string> = { monthly: 'Monthly', quarterly: 'Quarterly', half_yearly: 'Half yearly', yearly: 'Yearly' };
export const PRODUCT_LABEL: Record<string, string> = { trade: 'Trade with us', club: 'waves4u club' };

export const inr = (paise: number) =>
  '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 });
export const fmtDate = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
export const fmtDateTime = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
export const daysLeft = (d: string) => Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 864e5));
export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';
