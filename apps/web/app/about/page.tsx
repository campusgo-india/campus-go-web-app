import Link from 'next/link';
import { SiteHeader, SiteFooter } from '../../components/site-chrome';

export const metadata = {
  title: 'About CampusGo',
  description:
    'CampusGo is a placement automation and student career readiness platform designed for colleges and universities — connecting campuses to careers.',
};

type Tint = 'lavender' | 'mint' | 'cream' | 'rose';
const TINT_BG: Record<Tint, string> = {
  lavender: 'bg-tint-lavender',
  mint: 'bg-tint-mint',
  cream: 'bg-tint-cream',
  rose: 'bg-tint-rose',
};
const TINT_FG: Record<Tint, string> = {
  lavender: 'text-tint-lavender-fg',
  mint: 'text-tint-mint-fg',
  cream: 'text-tint-cream-fg',
  rose: 'text-tint-rose-fg',
};

const JOURNEY = [
  'Student Profile',
  'Career Readiness',
  'Training & Development',
  'Job Opportunities',
  'Applications',
  'Recruitment',
  'Placement',
  'Alumni',
];

const MISSION_ITEMS = [
  'Reduce manual placement administration',
  'Centralize student and placement information',
  'Improve student career readiness',
  'Connect students with relevant opportunities',
  'Track recruitment journeys from application to selection',
  'Measure the impact of training and assessments',
  'Preserve institutional data across graduating batches',
  'Build stronger and continuously growing alumni networks',
  'Generate structured data for institutional reporting and analysis',
];

const WHY_CAMPUSGO: { title: string; body: string; accent: string }[] = [
  { title: 'Connected', body: 'Bring student, training, opportunity, recruitment, placement and alumni information together.', accent: '#3B6EF5' },
  { title: 'Student-Centric', body: 'Give students greater visibility into their career readiness and placement journey.', accent: '#1F9D6B' },
  { title: 'Data-Driven', body: 'Use structured and historical information to understand placement performance.', accent: '#C98A1B' },
  { title: 'Measurable', body: 'Connect training and assessments with measurable development.', accent: '#E5484D' },
  { title: 'Scalable', body: 'Designed for colleges and universities with multiple programmes and batches.', accent: '#E28040' },
  { title: 'Built for Continuity', body: 'Preserve institutional knowledge and grow the alumni ecosystem year after year.', accent: '#7C8BFF' },
];

const HIERARCHY = [
  { label: 'Institution', gradient: 'bg-gradient-primary' },
  { label: 'School / Department', gradient: 'bg-gradient-ocean' },
  { label: 'Programme', gradient: 'bg-gradient-violet' },
  { label: 'Batch', gradient: 'bg-gradient-sunset' },
  { label: 'Student', gradient: 'bg-gradient-accent' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-app">
      <SiteHeader />

      {/* HERO */}
      <section className="bg-[#0B1330] py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-300">About CampusGo</span>
          <h1 className="mt-2.5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Connecting Campuses to Careers
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/60">
            CampusGo is a placement automation and student career readiness platform designed for
            colleges and universities. We believe placement is not a single event at the end of a
            student&rsquo;s academic journey — it is a continuous process that begins with career
            readiness, skill development and meaningful opportunities, and continues through
            recruitment, placement and alumni engagement. CampusGo brings this entire journey
            together in one connected platform.
          </p>
        </div>
      </section>

      {/* FROM STUDENT DATA TO CAREER OUTCOMES */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-strong sm:text-3xl">
            From Student Data to Career Outcomes
          </h2>
          <p className="mt-3.5 text-sm leading-relaxed text-subtle">
            Colleges manage a large amount of information every year — student profiles, academic
            records, training, assessments, companies, job opportunities, applications, interviews,
            placements, internships and alumni. When this information is spread across
            spreadsheets, emails and disconnected systems, it becomes difficult to track progress,
            measure outcomes and make informed decisions. <span className="font-semibold text-strong">CampusGo brings it together.</span>
          </p>
        </div>
        <div className="mt-10 flex flex-col items-center gap-2">
          {JOURNEY.map((step, i) => (
            <div key={step} className="flex flex-col items-center">
              <span className="rounded-pill bg-card px-5 py-2 text-sm font-semibold text-strong shadow-card">
                {step}
              </span>
              {i < JOURNEY.length - 1 && <span className="my-1 text-subtle">↓</span>}
            </div>
          ))}
        </div>
      </section>

      {/* VISION + MISSION */}
      <section className="bg-muted py-16">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-strong">Our Vision</h2>
            <p className="mt-2.5 text-sm font-semibold text-primary-600">
              To build a connected career ecosystem for every institution.
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-subtle">
              We envision a future where every college and university can understand student
              readiness, develop employability, connect students with relevant opportunities, track
              recruitment outcomes and maintain meaningful relationships with graduates — through
              one connected platform.
            </p>
          </div>

          <div className="mt-12 rounded-card bg-card p-7 shadow-card">
            <h2 className="text-xl font-extrabold tracking-tight text-strong">Our Mission</h2>
            <p className="mt-1.5 text-sm font-semibold text-body">
              Make career development and placement management more connected, measurable and
              accessible.
            </p>
            <p className="mt-3 text-xs font-medium text-subtle">CampusGo aims to help institutions:</p>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {MISSION_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-body">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* BUILT FOR THE INSTITUTION / DESIGNED FOR THE STUDENT */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-strong sm:text-3xl">
            Built for the Institution. Designed for the Student.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-subtle">CampusGo brings together two perspectives.</p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className={`rounded-card p-6 ${TINT_BG.lavender}`}>
            <p className={`text-sm font-extrabold ${TINT_FG.lavender}`}>For Institutions</p>
            <p className="mt-2 text-sm leading-relaxed text-body">
              A centralized platform to manage, monitor, analyse and improve placement and career
              development activities.
            </p>
          </div>
          <div className={`rounded-card p-6 ${TINT_BG.mint}`}>
            <p className={`text-sm font-extrabold ${TINT_FG.mint}`}>For Students</p>
            <p className="mt-2 text-sm leading-relaxed text-body">
              A simple digital experience to build their profile, understand their readiness,
              discover opportunities, apply and track their placement journey.
            </p>
          </div>
        </div>
        <p className="mt-8 text-center text-sm font-bold text-strong">
          One platform. Two perspectives. One goal. Better career outcomes for students.
        </p>
      </section>

      {/* YOUR DATA GROWS */}
      <section className="bg-[#0B1330] py-16">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Your Data Grows. It Doesn&rsquo;t Reset.
          </h2>
          <p className="mt-3.5 text-sm leading-relaxed text-white/60">
            Every graduating batch represents more than the end of a placement season — it
            represents the beginning of another generation of alumni. CampusGo is designed to
            preserve student information beyond graduation and transition graduates into the
            institution&rsquo;s alumni ecosystem, creating a valuable long-term database of
            graduates, professionals, companies and connections.
          </p>
          <p className="mt-4 text-sm font-bold text-white/90">
            Student today. Alumni tomorrow. Institutional connection for years to come.
          </p>
        </div>
      </section>

      {/* BUILT FOR COLLEGES & UNIVERSITIES */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-strong sm:text-3xl">
            Built for Colleges &amp; Universities
          </h2>
          <p className="mt-3.5 text-sm leading-relaxed text-subtle">
            Whether an institution has a few programmes or multiple schools and departments,
            CampusGo is designed to organize placement activities within the institution&rsquo;s
            academic structure — scaling as its student population, programmes and alumni network
            grow.
          </p>
        </div>
        <div className="mt-10 flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-3">
          {HIERARCHY.map((level, i) => (
            <div key={level.label} className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
              <div
                className={`flex h-16 w-40 items-center justify-center rounded-card text-center text-sm font-bold text-white shadow-card ${level.gradient}`}
              >
                {level.label}
              </div>
              {i < HIERARCHY.length - 1 && (
                <span className="text-lg text-subtle">
                  <span className="sm:hidden">↓</span>
                  <span className="hidden sm:inline">→</span>
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* SUPPORTING INSTITUTIONAL REPORTING */}
      <section className="bg-muted py-16">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-strong">Supporting Institutional Reporting</h2>
          <p className="mt-3.5 text-sm leading-relaxed text-subtle">
            CampusGo helps institutions organize information relating to placements, internships,
            training, student progression, employability development, recruiters and alumni.
          </p>
          <div className="mt-6 rounded-card border border-tint-cream bg-tint-cream/60 p-6">
            <p className="text-sm leading-relaxed text-body">
              The structured data and reports generated through the platform can support
              institutional documentation, analysis and reporting relevant to{' '}
              <span className="font-bold text-strong">NAAC, UGC</span> and other academic and
              accreditation-related requirements.
            </p>
            <p className="mt-2 text-sm font-bold text-strong">Capture. Organize. Analyse. Report.</p>
          </div>
        </div>
      </section>

      {/* WHY CAMPUSGO */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-strong sm:text-3xl">
          Why CampusGo?
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {WHY_CAMPUSGO.map((w) => (
            <div key={w.title} className="rounded-card bg-card p-6 shadow-card" style={{ borderTop: `3px solid ${w.accent}` }}>
              <p className="text-sm font-extrabold" style={{ color: w.accent }}>{w.title}</p>
              <p className="mt-2 text-xs leading-relaxed text-body">{w.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="relative overflow-hidden rounded-card bg-[#0B1330] px-8 py-12 text-center sm:px-14">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(91,141,239,0.4) 0%, rgba(11,19,48,0) 70%)' }}
          />
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-300">From Campus to Career</p>
          <h2 className="mx-auto mt-2.5 max-w-lg text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Prepare Students. Connect Opportunities. Manage Recruitment. Measure Outcomes. Build
            Lasting Connections.
          </h2>
          <Link
            href="/contact?intent=demo"
            className="relative mt-7 inline-flex h-12 items-center rounded-md bg-gradient-accent px-6 text-sm font-semibold text-accent-foreground shadow-nav hover:opacity-95"
          >
            Request a Demo
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
