'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, LogIn, LogOut, Menu, PhoneCall, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { NAV } from '@/lib/site';
import { initials } from '@/lib/types';

/** True once the page has been scrolled down a little. */
function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > threshold);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [threshold]);
  return scrolled;
}

function isActive(href: string, pathname: string) {
  if (href.includes('#')) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

/** Spec section 3.1: logo, menu, Login and "Get a Callback". Sticky; hamburger below 768 px;
 *  after login the user's name and a Dashboard link replace Login. */
export default function Header() {
  const { me, loading, logout } = useAuth();
  const pathname = usePathname();
  const scrolled = useScrolled();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const panel = me?.user.role === 'admin' ? '/admin' : '/dashboard';

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const actions = (cls: string) => (
    <div className={`nav-actions ${cls}`}>
      {loading ? null : me ? (
        <>
          <Link href={panel} className="nav-user" onClick={close} title={`${me.user.name}: open your ${me.user.role === 'admin' ? 'admin panel' : 'dashboard'}`}>
            <span className="avatar" aria-hidden="true">{initials(me.user.name)}</span>
            <span>{me.user.name.split(' ')[0]}</span>
          </Link>
          <Link href={panel} className="btn btn-light btn-sm" onClick={close}>
            <LayoutDashboard aria-hidden="true" /> {me.user.role === 'admin' ? 'Admin' : 'Dashboard'}
          </Link>
          {cls === 'mob' && (
            <button className="btn btn-light btn-sm" onClick={() => { close(); logout(); }}>
              <LogOut aria-hidden="true" /> Log out
            </button>
          )}
        </>
      ) : (
        <Link href="/login" className="btn btn-light btn-sm" onClick={close}>
          <LogIn aria-hidden="true" /> Login
        </Link>
      )}
      <Link href="/#contact" className="btn btn-gold btn-sm" onClick={close}>
        <PhoneCall aria-hidden="true" /> Get a Callback
      </Link>
    </div>
  );

  return (
    <header className={'top' + (scrolled ? ' scrolled' : '') + (me ? ' authed' : '')}>
      <div className="w nav">
        <Link href="/" className="brand" onClick={close} aria-label="waves4u home">
          <Image src="/logo-mark.png" alt="" width={47} height={40} priority />
          <span>waves<b>4u</b></span>
        </Link>

        <button className="menu-btn" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="site-menu">
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>

        <nav id="site-menu" className={'links' + (open ? ' open' : '')} aria-label="Main">
          {NAV.map(({ href, label }) => (
            <Link key={href} href={href} className={'nl' + (isActive(href, pathname) ? ' active' : '')} aria-current={isActive(href, pathname) ? 'page' : undefined} onClick={close}>
              {label}
            </Link>
          ))}
          {actions('mob')}
        </nav>
        {actions('desk')}
      </div>
    </header>
  );
}
