import type { ReactNode } from 'react';
import Reveal from './Reveal';

/** The wave motif used under section headings. */
export const WaveRule = () => (
  <svg className="wave-rule" viewBox="0 0 120 12" fill="none" aria-hidden="true">
    <path d="M1 6c7.5-6 15-6 22.5 0S38.5 12 46 6s15-6 22.5 0S83.5 12 91 6s15-6 22.5 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default function SectionHead({ eyebrow, title, accent, children, center, as: H = 'h2', id }: {
  eyebrow?: string; title: string; accent?: string; children?: ReactNode; center?: boolean; as?: 'h1' | 'h2'; id?: string;
}) {
  return (
    <Reveal>
      <div className={'sh' + (center ? ' center' : '')}>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <H id={id}>{title}{accent && <> <span className="gold">{accent}</span></>}</H>
        {children && <p className="lead">{children}</p>}
        <WaveRule />
      </div>
    </Reveal>
  );
}
