import Shell from '@/components/Shell';

export const metadata = { title: 'Admin', robots: { index: false, follow: false } };

const LINKS: [string, string, string][] = [
  ['/admin', 'Overview', 'overview'],
  ['/admin/reports', 'Reports', 'reports'],
  ['/admin/leads', 'Callback leads', 'leads'],
  ['/admin/users', 'Users', 'users'],
  ['/admin/payments', 'Payments', 'payments'],
  ['/admin/plans', 'Plans & prices', 'plans'],
  ['/admin/coupons', 'Coupons', 'coupons'],
  ['/admin/blog', 'Blogs', 'blog'],
  ['/admin/analysis', 'Market analysis', 'analysis'],
  ['/admin/videos', 'Videos', 'video'],
  ['/admin/faqs', 'FAQs', 'faqs'],
  ['/admin/testimonials', 'Testimonials', 'testimonials'],
  ['/admin/sessions', 'Mentorship sessions', 'sessions'],
  ['/admin/audit', 'Audit log', 'audit'],
  ['/admin/security', 'Security (2FA)', 'security'],
];
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <Shell links={LINKS} admin>{children}</Shell>;
}
