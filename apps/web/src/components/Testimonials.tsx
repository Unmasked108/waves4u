'use client';
import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import type { Testimonial } from '@/lib/types';
import { initials } from '@/lib/types';

/** Testimonial slider: first name, city and initials avatar, only for clients who gave consent (filtered by the API). */
export default function Testimonials({ items }: { items: Testimonial[] }) {
  const track = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: reduce ? 'auto' : 'smooth' });
  };
  return (
    <div>
      <div className="t-track" ref={track} tabIndex={0} role="region" aria-label="Client testimonials (scroll sideways)">
        {items.map((t) => (
          <figure className="card t-card" key={t._id} style={{ margin: 0 }}>
            {t.rating ? (
              <div className="stars" role="img" aria-label={`${t.rating} out of 5 stars`}>
                {Array.from({ length: t.rating }, (_, i) => <Star key={i} aria-hidden="true" />)}
              </div>
            ) : null}
            <blockquote>“{t.text}”</blockquote>
            <figcaption className="who">
              <span className="avatar" aria-hidden="true">{initials(t.firstName)}</span>
              <span><b>{t.firstName}</b><span>{t.city}</span></span>
            </figcaption>
          </figure>
        ))}
      </div>
      {items.length > 3 && (
        <div className="t-nav">
          <button className="icon-btn" onClick={() => scroll(-1)} aria-label="Previous testimonials"><ChevronLeft aria-hidden="true" /></button>
          <button className="icon-btn" onClick={() => scroll(1)} aria-label="Next testimonials"><ChevronRight aria-hidden="true" /></button>
        </div>
      )}
    </div>
  );
}
