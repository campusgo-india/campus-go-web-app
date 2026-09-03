import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader, SiteFooter } from '../../components/site-chrome';
import {
  ADVANTAGE_FLOW,
  BrowserFrame,
  PhoneShot,
  REPORT_CATEGORIES,
  Section,
  Shot,
  STUDENT_SHOTS,
  TINT_BG,
  TINT_FG,
} from '../../components/site-sections';

export const metadata: Metadata = {
  title: 'Reports & Institutional Insights',
  description:
    'Turn everyday placement, training, internship, recruitment and alumni activity into structured data — ready for institutional review and accreditation reporting (NAAC, NIRF, UGC).',
  alternates: { canonical: '/insights' },
};

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-app">
      <SiteHeader />

      <section className="bg-[#0B1330] py-16">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-300">Reports &amp; Institutional Insights</span>
          <h1 className="mx-auto mt-2.5 max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Turn Placement Activity Into Meaningful Data
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/60">
            CampusGO brings placement, training, internship, recruitment and alumni information into
            a structured digital environment — from data collection to institutional insight.
          </p>
        </div>
      </section>

      {/* CATEGORIES */}
      <Section>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {REPORT_CATEGORIES.map((c) => (
            <div key={c.title} className="rounded-card bg-card p-5 shadow-card">
              <p className={`text-sm font-extrabold ${TINT_FG[c.tint]}`}>{c.title}</p>
              <ul className="mt-2.5 space-y-1.5">
                {c.items.map((it) => (
                  <li key={it} className="text-xs leading-relaxed text-subtle">{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* SCREENSHOT + NARRATIVE */}
      <Section alt>
        <div className="flex flex-col items-center gap-12 lg:flex-row">
          <div className="w-full max-w-md lg:w-[440px] lg:flex-shrink-0">
            <div className="flex items-end gap-4">
              <div className="min-w-0 flex-1">
                <BrowserFrame>
                  <Shot
                    src="/screenshots/officer-dashboard.png"
                    alt="Analytics dashboard — placement percentage, package stats, offers per student and drive trend"
                  />
                </BrowserFrame>
              </div>
              <div className="hidden w-[130px] flex-shrink-0 sm:block">
                <PhoneShot src={STUDENT_SHOTS.tracker.src} alt={STUDENT_SHOTS.tracker.alt} compact />
              </div>
            </div>
            <p className="mt-2 text-xs text-subtle">
              The same activity, aggregated for the institution and mirrored back to each student.
            </p>
          </div>
          <div className="w-full lg:flex-1">
            <h2 className="text-2xl font-extrabold tracking-tight text-strong">
              Capture Once. Organize Continuously. Report When Required.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-subtle">
              Every application, round result, offer, assessment score and internship is recorded as
              it happens. The reports are a view over that data, not a separate spreadsheet exercise
              at the end of the season.
            </p>
            <div className="mt-6 rounded-card border border-tint-cream bg-tint-cream/60 p-6">
              <p className="text-sm leading-relaxed text-body">
                The structured data and reports generated through CampusGO can support institutional
                documentation and reporting relevant to{' '}
                <span className="font-bold text-strong">NAAC, NIRF, UGC</span> and other academic and
                accreditation-related requirements.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ADVANTAGE CLOSE */}
      <section className="bg-[#0B1330] py-16">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="mx-auto max-w-2xl text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            From Readiness to Alumni — One Continuous Record
          </h2>
          <div className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-2.5">
            {ADVANTAGE_FLOW.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2.5">
                <span className={`rounded-pill px-3.5 py-1.5 text-xs font-semibold ${TINT_BG[step.tint]} ${TINT_FG[step.tint]}`}>
                  {step.label}
                </span>
                {i < ADVANTAGE_FLOW.length - 1 && <span className="text-white/30">→</span>}
              </div>
            ))}
          </div>
          <Link
            href="/contact?intent=demo"
            className="mt-10 inline-flex h-12 items-center rounded-md bg-gradient-accent px-6 text-sm font-semibold text-accent-foreground shadow-nav hover:opacity-95"
          >
            Request a Demo
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
