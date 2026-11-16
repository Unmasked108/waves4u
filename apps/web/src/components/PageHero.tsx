import Link from 'next/link';
import type { ReactNode } from 'react';

/** Navy banner at the top of inner pages, with breadcrumbs. */
export default function PageHero({ eyebrow, title, children, crumbs = [] }: { eyebrow?: string; title: string; children?: ReactNode; crumbs?: [string, string][] }) {
  return (
    <section className="page-hero">
      <div className="w">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          {crumbs.map(([href, label]) => <span key={href}>/ <Link href={href}>{label}</Link></span>)}
          <span aria-current="page">/ {title.length > 40 ? title.slice(0, 40) + '…' : title}</span>
        </nav>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {children && <p className="lead">{children}</p>}
      </div>
    </section>
  );
}
