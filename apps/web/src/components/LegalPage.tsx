import type { ReactNode } from 'react';
import PageHero from './PageHero';

/** Layout for legal pages. The texts are drafts: they must be reviewed by the client's legal/compliance adviser. */
export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <>
      <PageHero eyebrow="Legal" title={title}>Last updated: {updated}</PageHero>
      <section className="sec">
        <div className="w">
          <div className="prose">{children}</div>
        </div>
      </section>
    </>
  );
}

/** Highlights a value the client still has to confirm. */
export const TBC = ({ children }: { children: ReactNode }) => <mark className="tbc">{children}</mark>;
