'use client';
import { useEffect, useState } from 'react';

/** Toast notification. Shows when `msg` or `err` changes to a non-empty value, then fades out by itself. */
export default function Notice({ msg, err }: { msg?: string; err?: string }) {
  const [state, setState] = useState<'hidden' | 'in' | 'out'>('hidden');
  useEffect(() => {
    if (!msg && !err) { setState('hidden'); return; }
    setState('in');
    const t1 = setTimeout(() => setState('out'), 4200);
    const t2 = setTimeout(() => setState('hidden'), 4500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [msg, err]);
  if (state === 'hidden' || (!msg && !err)) return null;
  return <div className={'toast' + (err ? ' err' : '') + (state === 'out' ? ' out' : '')} role="status" aria-live="polite">{err || msg}</div>;
}
