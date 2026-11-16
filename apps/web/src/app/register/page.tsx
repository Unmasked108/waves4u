'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/client';

export default function Register() {
  const { register } = useAuth();
  const router = useRouter();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [err, setErr] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setFields({}); setBusy(true);
    try {
      await register(f);
      const n = new URLSearchParams(window.location.search).get('next');
      router.push(n && n.startsWith('/') && !n.startsWith('//') ? n : '/dashboard');
    } catch (e: any) { setErr(e.message); if (e instanceof ApiError) setFields(e.fields); } finally { setBusy(false); }
  }
  const input = (k: keyof typeof f, label: string, props: React.InputHTMLAttributes<HTMLInputElement>, help?: string) => (
    <div className="field">
      <label htmlFor={`r-${k}`}>{label}</label>
      <input id={`r-${k}`} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} aria-invalid={!!fields[k]} aria-describedby={`r-${k}-h`} {...props} />
      {(fields[k] || help) && <p className={fields[k] ? 'field-err' : 'help'} id={`r-${k}-h`}>{fields[k] || help}</p>}
    </div>
  );
  return (
    <section className="authwrap">
      <form className="card authcard" onSubmit={submit} aria-labelledby="reg-title">
        <Image className="logo" src="/logo-mark.png" alt="" width={65} height={56} />
        <h1 id="reg-title">Create your free account</h1>
        <p className="center small">Read blogs, free analysis and videos. Upgrade any time.</p>
        {err && <div className="form-err" role="alert">{err}</div>}
        {input('name', 'Full name', { required: true, minLength: 2, maxLength: 80, autoComplete: 'name' })}
        {input('email', 'Email', { type: 'email', required: true, autoComplete: 'email' })}
        {input('phone', 'Mobile number (optional)', { type: 'tel', inputMode: 'tel', autoComplete: 'tel-national', placeholder: '98765 43210' }, '10-digit Indian mobile number.')}
        {input('password', 'Password', { type: 'password', required: true, minLength: 8, autoComplete: 'new-password' }, 'At least 8 characters.')}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy} aria-busy={busy}>{busy ? 'Creating…' : 'Sign up'}</button>
        <p className="small center" style={{ marginTop: 14 }}>By signing up you agree to our <Link href="/terms" className="btn-link">Terms</Link> and <Link href="/privacy-policy" className="btn-link">Privacy Policy</Link>.</p>
        <p className="center" style={{ marginBottom: 0 }}>Already a member? <Link href="/login" className="btn-link">Login</Link></p>
      </form>
    </section>
  );
}
