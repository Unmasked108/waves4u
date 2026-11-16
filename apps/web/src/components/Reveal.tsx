'use client';
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

/** Fades and lifts its content into view once, when it scrolls onto the screen.
 *  `delay` (ms) staggers siblings. `as` keeps lists valid (e.g. as="li"). Honors prefers-reduced-motion. */
export default function Reveal({ children, className = '', delay = 0, as: Tag = 'div' }: { children: ReactNode; className?: string; delay?: number; as?: 'div' | 'li' }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('in');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { el.classList.add('in'); io.disconnect(); } }),
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref as any} className={`reveal ${className}`} style={{ '--d': `${delay}ms` } as CSSProperties}>{children}</Tag>;
}
