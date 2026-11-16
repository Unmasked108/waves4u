import Link from 'next/link';
import {
  ArrowRight, Briefcase, Building2, CalendarCheck, Check, Clock, Cpu, Flag, GraduationCap, Mail, MapPin, Phone, Target, TrendingUp, UserRound, Users,
} from 'lucide-react';
import { sget } from '@/lib/server';
import { PROCESS, SERVICES, SITE, type ServiceIcon } from '@/lib/site';
import type { Analysis, BlogItem, Faq, PlansResponse, Testimonial, Video } from '@/lib/types';
import { AnalysisCard, BlogCard, Empty } from '@/components/Cards';
import CallbackForm from '@/components/CallbackForm';
import ContentTabs from '@/components/ContentTabs';
import FaqList from '@/components/FaqList';
import HeroArt from '@/components/HeroArt';
import JsonLd from '@/components/JsonLd';
import PlanCards from '@/components/PlanCards';
import Reveal from '@/components/Reveal';
import SectionHead from '@/components/SectionHead';
import Testimonials from '@/components/Testimonials';
import VideoPlayer from '@/components/VideoPlayer';

const SERVICE_ICON: Record<ServiceIcon, typeof TrendingUp> = { advisory: TrendingUp, club: Users, algo: Cpu, mentor: GraduationCap };

export default async function Home() {
  const [plans, blog, analysis, videos, faqs, testimonials] = await Promise.all([
    sget<PlansResponse>('/api/plans'),
    sget<{ items: BlogItem[] }>('/api/blog?limit=3'),
    sget<{ items: Analysis[] }>('/api/analysis?limit=3'),
    sget<{ items: Video[] }>('/api/videos?limit=3'),
    sget<{ items: Faq[] }>('/api/faqs'),
    sget<{ items: Testimonial[] }>('/api/testimonials'),
  ]);
  const B = blog?.items ?? [];
  const A = analysis?.items.slice(0, 3) ?? [];
  const V = videos?.items.slice(0, 3) ?? [];
  const F = faqs?.items ?? [];
  const T = testimonials?.items ?? [];

  const faqLd = F.length
    ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: F.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) }
    : null;

  return (
    <>
      {faqLd && <JsonLd data={faqLd} />}

      {/* ---------- 2. Hero ---------- */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="w">
          <div className="hero-grid">
            <div>
              <span className="eyebrow rise">Market research · Advisory · Education</span>
              <h1 id="hero-title" className="rise" style={{ ['--d' as string]: '60ms' }}>{SITE.tagline}</h1>
              <p className="sub rise" style={{ ['--d' as string]: '120ms' }}>{SITE.subTagline}</p>
              <ul className="for rise" style={{ ['--d' as string]: '160ms' }} aria-label="Who it is for">
                <li><UserRound aria-hidden="true" /> Individuals</li>
                <li><Users aria-hidden="true" /> Families</li>
                <li><Building2 aria-hidden="true" /> Businesses</li>
              </ul>
              <p className="lead rise" style={{ ['--d' as string]: '200ms' }}>
                Research-led views on index F&amp;O, stock F&amp;O, cash equities and MCX commodities, built on Elliott Wave, technical,
                derivatives and fundamental analysis, with clearly defined risk on every idea. For traders and investors in India and abroad.
              </p>
              <div className="cta rise" style={{ ['--d' as string]: '260ms' }}>
                <Link href="/#contact" className="btn btn-gold btn-lg"><CalendarCheck aria-hidden="true" /> Book a Free Consultation</Link>
                <Link href="/#services" className="btn btn-light btn-lg">Explore Our Services <ArrowRight aria-hidden="true" /></Link>
              </div>
            </div>
            <div className="hero-art rise" style={{ ['--d' as string]: '180ms' }}><HeroArt /></div>
          </div>

          <div className="hl-cards">
            {SERVICES.slice(0, 3).map((s, i) => {
              const Icon = SERVICE_ICON[s.icon];
              return (
                <Reveal key={s.id} delay={i * 80}>
                  <Link href={s.href} className="hl">
                    <span className="icon-badge"><Icon aria-hidden="true" /></span>
                    <div>
                      <h3>{s.title}</h3>
                      <p>{s.desc}</p>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- 3. About ---------- */}
      <section className="sec" id="about" aria-labelledby="about-title">
        <div className="w">
          <SectionHead eyebrow="About waves4u" title="Research you can" accent="act on with clarity" id="about-title" />
          <div className="about-grid">
            <Reveal>
              <blockquote className="about-quote">
                At waves4u, disciplined research and complete transparency form the foundation of everything we do. Markets move in waves,
                and navigating them calls for thorough analysis, clearly defined risk and a plan made before you trade. Our research across
                index F&amp;O, stock F&amp;O, cash equities and MCX commodities helps you approach the market with clarity and confidence.
              </blockquote>
              <div className="values">
                <div><b>Disciplined</b><span>A repeatable five-stage research process</span></div>
                <div><b>Transparent</b><span>Rationale and disclosures with every call</span></div>
                <div><b>Risk first</b><span>Entry, target and stop-loss before release</span></div>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <aside className="card founder" aria-label="Founder and research analyst">
                <div className="photo" aria-hidden="true"><UserRound /></div>
                <h3 style={{ marginBottom: 2 }}>{SITE.sebi.analyst}</h3>
                <p className="small" style={{ margin: 0 }}>{SITE.sebi.analystTitle}</p>
                <dl>
                  <dt>Registration</dt><dd>{SITE.sebi.type}</dd>
                  <dt>Reg. No.</dt><dd>{SITE.sebi.regNo}</dd>
                  {SITE.sebi.bseEnlistment && <><dt>BSE Enlistment</dt><dd>{SITE.sebi.bseEnlistment}</dd></>}
                </dl>
              </aside>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- 4. Services ---------- */}
      <section className="sec alt" id="services" aria-labelledby="services-title">
        <div className="w">
          <SectionHead eyebrow="Services" title="Four ways to" accent="ride the waves" id="services-title">
            From real-time research calls to structured learning, choose the support that fits how you trade.
          </SectionHead>
          <div className="g g4">
            {SERVICES.map((s, i) => {
              const Icon = SERVICE_ICON[s.icon];
              return (
                <Reveal key={s.id} delay={i * 70}>
                  <article className="card svc">
                    <span className="icon-badge"><Icon aria-hidden="true" /></span>
                    <h3>{s.title}</h3>
                    <p>{s.desc}</p>
                    <ul className="checks">{s.checks.map((c) => <li key={c}><Check aria-hidden="true" />{c}</li>)}</ul>
                    <Link href={s.href} className="more" style={{ marginTop: 16 }} aria-label={`Learn more about ${s.title}`}>Learn more <ArrowRight aria-hidden="true" /></Link>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- 5. Plans ---------- */}
      <section className="sec" id="plans" aria-labelledby="plans-title">
        <div className="w">
          <SectionHead eyebrow="Plans & pricing" title="Choose your" accent="plan" id="plans-title">
            Simple plans in Indian Rupees. Longer plans save more versus paying monthly.
          </SectionHead>
          <PlanCards products={plans?.products ?? []} />
        </div>
      </section>

      {/* ---------- 6. Process ---------- */}
      <section className="sec alt" id="process" aria-labelledby="process-title">
        <div className="w">
          <SectionHead eyebrow="Our process" title="From market scan to" accent="trade log" id="process-title">
            Every research call goes through the same five stages, and each stage produces a clear output.
          </SectionHead>
          <ol className="timeline">
            {PROCESS.map((p, i) => (
              <Reveal as="li" className="step" key={p.n} delay={i * 80}>
                <span className="step-num" aria-hidden="true">{p.n}</span>
                <h3><span className="sr-only">Stage {p.n}: </span>{p.title}</h3>
                <p>{p.desc}</p>
                <span className="step-out"><Flag aria-hidden="true" /> Output: {p.out}</span>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- 7. Content ---------- */}
      <section className="sec" id="content" aria-labelledby="content-title">
        <div className="w">
          <SectionHead eyebrow="Insights" title="Latest" accent="research & learning" id="content-title">
            Blogs and free market analysis are open to everyone. Some analysis and videos are for members.
          </SectionHead>
          <ContentTabs
            tabs={[
              { key: 'blogs', label: 'Blogs', href: '/blogs', content: B.length ? <div className="g g3">{B.map((b) => <BlogCard key={b._id} b={b} />)}</div> : <Empty>The first articles are on their way.</Empty> },
              { key: 'analysis', label: 'Market Analysis', href: '/analysis', content: A.length ? <div className="g g3">{A.map((a) => <AnalysisCard key={a._id} a={a} />)}</div> : <Empty>Market analysis will appear here once published.</Empty> },
              { key: 'videos', label: 'Videos', href: '/videos', content: V.length ? <div className="g g3">{V.map((v) => <VideoPlayer key={v._id} v={v} compact />)}</div> : <Empty>Videos will appear here soon.</Empty> },
            ]}
          />
        </div>
      </section>

      {/* ---------- 8. Testimonials ---------- */}
      {T.length > 0 && (
        <section className="sec alt" id="testimonials" aria-labelledby="t-title">
          <div className="w">
            <SectionHead eyebrow="Testimonials" title="What our" accent="members say" id="t-title">
              Shared with each client’s consent. Individual experiences; past performance does not guarantee future results.
            </SectionHead>
            <Testimonials items={T} />
          </div>
        </section>
      )}

      {/* ---------- 9. FAQ ---------- */}
      {F.length > 0 && (
        <section className={'sec' + (T.length ? '' : ' alt')} id="faq" aria-labelledby="faq-title">
          <div className="w">
            <SectionHead eyebrow="FAQ" title="Frequently asked" accent="questions" id="faq-title" center />
            <FaqList items={F} />
          </div>
        </section>
      )}

      {/* ---------- 10. Contact ---------- */}
      <section className="sec alt" id="contact" aria-labelledby="contact-title">
        <div className="w">
          <SectionHead eyebrow="Contact" title="Talk to" accent="our team" id="contact-title">
            Call us, write to us, or request a callback and we will reach out.
          </SectionHead>
          <div className="contact-grid">
            <div>
              <ul className="contact-list">
                <li><span className="icon-badge"><Phone aria-hidden="true" /></span><span><small>Call us</small><a href={SITE.phoneHref}>{SITE.phone}</a></span></li>
                <li><span className="icon-badge"><Mail aria-hidden="true" /></span><span><small>Email</small><a href={`mailto:${SITE.email}`}>{SITE.email}</a></span></li>
                <li><span className="icon-badge"><MapPin aria-hidden="true" /></span><span><small>Office</small><b>{SITE.address}</b></span></li>
                <li><span className="icon-badge"><Clock aria-hidden="true" /></span><span><small>Hours</small><b>{SITE.hours}</b></span></li>
              </ul>
              <div className="map">
                <iframe src={SITE.mapEmbed} title="Map showing the waves4u office" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </div>
            </div>
            <Reveal><CallbackForm /></Reveal>
          </div>
        </div>
      </section>

      <section className="sec dark" aria-labelledby="cta-title">
        <div className="w center">
          <h2 id="cta-title">Ready to ride the next wave?</h2>
          <p className="lead" style={{ margin: '0 auto 24px' }}>Start with a free account or pick a plan that fits your trading.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link href="/plans" className="btn btn-gold btn-lg"><Target aria-hidden="true" /> See plans</Link>
            <Link href="/register" className="btn btn-light btn-lg"><Briefcase aria-hidden="true" /> Create a free account</Link>
          </div>
        </div>
      </section>
    </>
  );
}
