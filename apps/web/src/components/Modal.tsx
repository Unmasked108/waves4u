'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/** Accessible dialog: focus moves in and is restored on close; Esc or clicking outside closes it. */
export default function Modal({ onClose, title, children, wide }: { onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const [out, setOut] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const close = () => { setOut(true); setTimeout(onClose, 180); };
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLElement>('input,select,textarea,button:not(.x)')?.focus();
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab' && box.current) {
        const f = [...box.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])')];
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('keydown', k); prev?.focus?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Rendered into <body> so no animated/transformed parent can trap it under the sticky header.
  return createPortal(
    <div className={'scrim' + (out ? ' out' : '')} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div ref={box} className={'dialog' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-labelledby="dlg-title">
        <div className="row between" style={{ marginBottom: 12, flexWrap: 'nowrap' }}>
          <h2 id="dlg-title" style={{ fontSize: '1.3rem', margin: 0 }}>{title}</h2>
          <button className="icon-btn x" onClick={close} aria-label="Close"><X aria-hidden="true" /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
