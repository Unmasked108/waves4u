'use client';
import Link from 'next/link';
import { useId, useRef, useState, type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

type Tab = { key: string; label: string; href: string; content: ReactNode };

/** Keyboard-operable tabs (arrow keys, Home/End) following the WAI-ARIA tabs pattern. */
export default function ContentTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const base = useId();

  const onKey = (e: React.KeyboardEvent) => {
    const last = tabs.length - 1;
    const next = e.key === 'ArrowRight' ? (active === last ? 0 : active + 1)
      : e.key === 'ArrowLeft' ? (active === 0 ? last : active - 1)
      : e.key === 'Home' ? 0 : e.key === 'End' ? last : null;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    refs.current[next]?.focus();
  };

  return (
    <div>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="tabs" role="tablist" aria-label="Latest content" onKeyDown={onKey}>
          {tabs.map((t, i) => (
            <button key={t.key} ref={(el) => { refs.current[i] = el; }} className="tab" role="tab" id={`${base}-t${i}`}
              aria-selected={active === i} aria-controls={`${base}-p${i}`} tabIndex={active === i ? 0 : -1} onClick={() => setActive(i)}>
              {t.label}
            </button>
          ))}
        </div>
        <Link href={tabs[active].href} className="more" style={{ marginTop: 10 }}>View all {tabs[active].label.toLowerCase()} <ArrowRight aria-hidden="true" /></Link>
      </div>
      {tabs.map((t, i) => (
        <div key={t.key} role="tabpanel" id={`${base}-p${i}`} aria-labelledby={`${base}-t${i}`} hidden={active !== i} tabIndex={0}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
