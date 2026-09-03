import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader, SiteFooter } from '../../components/site-chrome';
import {
  InterviewScene,
  PhoneShot,
  READINESS_PILLARS,
  Section,
  TINT_BG,
  TINT_FG,
} from '../../components/site-sections';

export const metadata: Metadata = {
  title: 'Career Readiness',
  description:
    'Measure student preparedness across four core employability pillars — aptitude, technical skills, communication and career readiness — then train, reassess and track improvement.',
  alternates: { canonical: '/readiness' },
};

export default function ReadinessPage() {
  return (
    <div className="min-h-screen bg-app">
      <SiteHeader />

      <section className="bg-[#0B1330] py-16">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-300">Student Career Readiness</span>
          <h1 className="mx-auto mt-2.5 max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Placement Starts Before the First Job Opportunity
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/60">
            A student receiving a placement opportunity does not necessarily mean the student is
            ready for it. CampusGO helps institutions understand student readiness through four core
            employability pillars.
          </p>
        </div>
      </section>

      {/* FOUR PILLARS */}
      <Section>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {READINESS_PILLARS.map((p) => (
            <div key={p.title} className="rounded-card bg-card p-5 shadow-card">
              <div className={`flex h-10 w-10 items-center justify-center rounded-md ${TINT_BG[p.tint]}`}>
                <span className={TINT_FG[p.tint]}>{p.icon}</span>
              </div>
              <p className="mt-3.5 text-sm font-bold text-strong">{p.title}</p>
              <ul className="mt-2 space-y-1">
                {p.items.map((it) => (
                  <li key={it} className="text-xs leading-relaxed text-subtle">{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* ASSESS / DEVELOP / REASSESS */}
      <Section alt>
        <div className="flex flex-col items-center gap-12 lg:flex-row">
          <div className="w-full lg:flex-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-600">Training &amp; Assessments</span>
            <h2 className="mt-2.5 text-3xl font-extrabold tracking-tight text-strong">Assess. Develop. Reassess.</h2>
            <p className="mt-3.5 text-sm leading-relaxed text-subtle">
              Pre- and post-training assessments help institutions measure student improvement across
              these core employability areas — know who participated, how they performed, where skill
              gaps exist, and what needs further development.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'A readiness index and tier for every scored student, private to them.',
                'Pillar-by-pillar breakdown so training targets the real gap.',
                'Pre- vs post-assessment scores, and improvement by pillar, for the cohort.',
              ].map((t) => (
                <li key={t} className="flex gap-3 text-sm leading-relaxed text-body">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" />
                  {t}
                </li>
              ))}
            </ul>
            <Link href="/insights" className="mt-6 inline-flex text-sm font-semibold text-primary-600 hover:text-primary-700">
              See the training reports →
            </Link>
          </div>
          <div className="flex w-full max-w-md flex-col items-center lg:w-[420px] lg:flex-shrink-0">
            <PhoneShot
              src="/screenshots/student-employability.png"
              alt="Student employability view — overall readiness score, tier eligibility and a personalised placement roadmap"
            />
            <p className="mt-3 text-xs text-subtle">
              The student&rsquo;s employability view — readiness score, tier and roadmap, private to them.
            </p>
            <div className="mt-6 w-full overflow-hidden rounded-card bg-card p-4 shadow-card">
              <InterviewScene />
            </div>
            <p className="mt-2 text-xs text-subtle">Mock interviews and assessments feed the readiness score.</p>
          </div>
        </div>
      </Section>

      <Section>
        <div className="rounded-card bg-[#0B1330] px-8 py-12 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            Know Who&rsquo;s Ready — Before the Drive Opens
          </h2>
          <Link
            href="/contact?intent=demo"
            className="mt-6 inline-flex h-12 items-center rounded-md bg-gradient-accent px-6 text-sm font-semibold text-accent-foreground shadow-nav hover:opacity-95"
          >
            Request a Demo
          </Link>
        </div>
      </Section>

      <SiteFooter />
    </div>
  );
}
