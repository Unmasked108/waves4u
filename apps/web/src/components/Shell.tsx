'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import {
  BarChart3, BookOpen, LogOut, CalendarDays, CreditCard, FileText, HelpCircle, LayoutDashboard, LineChart, Lock, MessageSquareQuote,
  PhoneCall, ScrollText, ShieldCheck, Tag, UserCog, Users, Video, Wallet, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { initials } from '@/lib/types';
import { SkeletonCards } from './Skeleton';

export const ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard, analysis: LineChart, blog: BookOpen, video: Video, sessions: CalendarDays, billing: CreditCard,
  profile: UserCog, users: Users, plans: Wallet, coupons: Tag, payments: CreditCard, leads: PhoneCall, reports: BarChart3,
  faqs: HelpCircle, testimonials: MessageSquareQuote, audit: ScrollText, security: ShieldCheck, legal: FileText,
};

/** Sidebar layout for the member and admin panels. The real security is on the API;
 *  this only decides what to show and redirects people who should not be here. */
export default function Shell({ links, admin, children }: { links: [string, string, string][]; admin?: boolean; children: ReactNode }) {
  const { me, loading, logout } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const needs2fa = admin && me?.needs2fa && path !== '/admin/security';

  useEffect(() => {
    if (loading) return;
    if (!me) router.replace('/login?next=' + encodeURIComponent(path));
    else if (admin && me.user.role !== 'admin') router.replace('/dashboard');
    else if (needs2fa) router.replace('/admin/security');
  }, [loading, me, admin, path, router, needs2fa]);

  if (loading || !me || (admin && me.user.role !== 'admin') || needs2fa)
    return <div className="w" style={{ minHeight: '70vh', padding: '48px 0' }}><SkeletonCards n={3} /></div>;

  return (
    <div className="w app">
      <nav className="side" aria-label={admin ? 'Admin panel' : 'Member area'}>
        <div className="card flat who">
          <span className="avatar" aria-hidden="true">{initials(me.user.name)}</span>
          <div>
            <b>{me.user.name}</b>
            <small>{admin ? 'Admin' : me.isClub && me.segments.length ? 'Premium · Club + Trade' : me.isClub ? 'Premium · Club' : me.isPremium ? 'Premium · Trade' : 'Free member'}</small>
          </div>
        </div>
        {links.map(([href, label, icon]) => {
          const Icon = ICONS[icon] ?? LayoutDashboard;
          const on = path === href || (href !== '/admin' && href !== '/dashboard' && path.startsWith(href + '/'));
          return <Link key={href} href={href} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}><Icon aria-hidden="true" />{label}</Link>;
        })}
        <button className="side-out" onClick={logout}><LogOut aria-hidden="true" />Log out</button>
      </nav>
      <div>{children}</div>
    </div>
  );
}

export function Lock_({ children }: { children?: ReactNode }) {
  return (
    <div className="card feature">
      <h3 className="row" style={{ gap: 8 }}><Lock size={20} aria-hidden="true" /> Members only</h3>
      <p>{children ?? 'Upgrade to unlock this section.'}</p>
      <Link href="/plans" className="btn btn-gold">See plans</Link>
    </div>
  );
}
export { Lock_ as Lock };
