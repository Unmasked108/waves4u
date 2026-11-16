'use client';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import TwoFactor from '@/components/TwoFactor';

/** Admins land here until their session has passed two-factor authentication. */
export default function Security() {
  const { me } = useAuth();
  if (!me) return null;
  return (
    <>
      <h1>Security <span className="gold">(2FA)</span></h1>
      {me.needs2fa && (
        <div className="banner bad" role="alert">
          <ShieldAlert aria-hidden="true" />
          <p>
            {me.user.totpEnabled
              ? <>Your account has two-factor authentication, but this session did not use it. <Link href="/login" className="btn-link">Log in again</Link> with your code to open the admin panel.</>
              : <>Admin accounts must use two-factor authentication. Set it up below to open the admin panel.</>}
          </p>
        </div>
      )}
      <TwoFactor required />
    </>
  );
}
