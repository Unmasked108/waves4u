import Shell from '@/components/Shell';

export const metadata = { title: 'Dashboard', robots: { index: false, follow: false } };

const LINKS: [string, string, string][] = [
  ['/dashboard', 'Overview', 'overview'],
  ['/dashboard/analysis', 'Market analysis', 'analysis'],
  ['/dashboard/blog', 'Blogs', 'blog'],
  ['/dashboard/videos', 'Videos', 'video'],
  ['/dashboard/sessions', 'Mentorship', 'sessions'],
  ['/dashboard/billing', 'Subscriptions & invoices', 'billing'],
  ['/dashboard/profile', 'Profile & security', 'profile'],
];
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <Shell links={LINKS}>{children}</Shell>;
}
