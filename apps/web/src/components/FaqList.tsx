'use client';
import { useId, useState } from 'react';
import { Plus } from 'lucide-react';
import type { Faq } from '@/lib/types';

/** Accordion with one question open at a time (spec section 3.9). Questions come from the admin panel. */
export default function FaqList({ items }: { items: Faq[] }) {
  const [open, setOpen] = useState<number>(0);
  const base = useId();
  return (
    <div className="faq">
      {items.map((f, i) => {
        const isOpen = open === i;
        return (
          <div className="faq-item" key={f._id}>
            <h3>
              <button className="faq-q" id={`${base}-q${i}`} aria-expanded={isOpen} aria-controls={`${base}-a${i}`} onClick={() => setOpen(isOpen ? -1 : i)}>
                {f.question}
                <Plus aria-hidden="true" />
              </button>
            </h3>
            <div className={'faq-a' + (isOpen ? ' open' : '')} id={`${base}-a${i}`} role="region" aria-labelledby={`${base}-q${i}`}>
              <div><p>{f.answer}</p></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
