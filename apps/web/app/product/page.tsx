import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader, SiteFooter } from '../../components/site-chrome';
import {
  AlumniYear,
  BrowserFrame,
  CORE_FEATURES,
  EXTENDED_TOPICS,
  FunnelPill,
  GraduationScene,
  HandshakeIcon,
  HierarchyDiagram,
  InterviewScene,
  MailIcon,
  HeroDashboard,
  RECRUITMENT_TOPICS,
  Section,
  SectionHeading,
  TINT_BG,
  TINT_FG,
  TINTS,
  WHY_CAMPUSGO,
} from '../../components/site-sections';

export const metadata: Metadata = {
  title: 'The Platform',
  description:
    'One connected system for student data, eligibility, recruiters, jobs, recruitment rounds, internships, alumni and institutional reporting — configured around how your institution actually recruits.',
  alternates: { canonical: '/product' },
};

export default function PlatformPage() {
  return (
    <div className="min-h-screen bg-app">
      <SiteHeader />

      {/* INTRO */}
      <section className="bg-[#0B1330] py-16">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-300">The Platform</span>
          <h1 className="mx-auto mt-2.5 max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Build a Connected Career Ecosystem
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/60">
            Placement teams manage far more than job opportunities — student profiles, eligibility,
            recruiters, applications, interviews, training, assessments, internships, alumni and
            institutional reporting. Managed separately, that information scatters across
            spreadsheets, emails and disconnected systems. CampusGO brings it together.
          </p>
        </div>
      </section>

      {/* CORE FEATURES */}
      <Section>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {CORE_FEATURES.map((f) => (
            <div key={f.title} className="rounded-card bg-card p-5 shadow-card">
              <div className={`flex h-10 w-10 items-center justify-center rounded-md ${TINT_BG[f.tint]}`}>
                <span className={TINT_FG[f.tint]}>{f.icon}</span>
              </div>
              <p className="mt-3.5 text-sm font-bold text-strong">{f.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-subtle">{f.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* RECRUITMENT, START TO FINISH */}
      <Section alt>
        <div className="flex flex-col items-start gap-12 lg:flex-row">
          <div className="w-full lg:w-[380px] lg:flex-shrink-0">
            <h2 className="text-3xl font-extrabold tracking-tight text-strong">
              Every Opportunity. One Source of Truth.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-subtle">
              Find the right students for every opportunity, and track their progress round by
              round — configured around how your institution actually recruits.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <FunnelPill>Applied → Aptitude → GD → Technical → HR → Selected</FunnelPill>
              <FunnelPill>Applied → Round 1 → Round 2 → Round 3 → Selected</FunnelPill>
            </div>
            <div className="mt-7">
              <BrowserFrame>
                <HeroDashboard />
              </BrowserFrame>
              <p className="mt-2 text-xs text-subtle">
                Placement Dashboard — progress stage by stage, per programme.
              </p>
            </div>
          </div>
          <div className="flex-1">
            <div className="mb-8 overflow-hidden rounded-card bg-card p-4 shadow-card">
              <InterviewScene />
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {RECRUITMENT_TOPICS.map((t) => (
                <div key={t.title}>
                  <p className="text-sm font-bold text-strong">{t.title}</p>
                  <p
                    className="mt-1.5 text-sm leading-relaxed text-subtle"
                    dangerouslySetInnerHTML={{ __html: t.body }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* COMPANIES & COMMUNICATION */}
      <Section>
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
          {EXTENDED_TOPICS.map((t, i) => (
            <div key={t.title} className="rounded-card bg-card p-7 shadow-card">
              <div className={`flex h-10 w-10 items-center justify-center rounded-md ${TINT_BG[TINTS[i % TINTS.length]!]}`}>
                <span className={TINT_FG[TINTS[i % TINTS.length]!]}>{i === 0 ? <HandshakeIcon /> : <MailIcon />}</span>
              </div>
              <span className="mt-4 block text-xs font-semibold uppercase tracking-wider text-primary-600">
                {t.eyebrow}
              </span>
              <p className="mt-1.5 text-xl font-extrabold text-strong">{t.title}</p>
              <p className="mt-2.5 text-sm leading-relaxed text-subtle">{t.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* INTERNSHIPS & ALUMNI */}
      <Section alt>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-600">Internships &amp; PPOs</span>
            <h2 className="mt-2.5 text-2xl font-extrabold tracking-tight text-strong">
              Extend the Career Journey Beyond Final Placements
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-subtle">
              Placement is only one part of a student&rsquo;s transition to employment. Track internship
              participation, completion and pre-placement offers alongside placement data.
            </p>
            <div className="mt-5">
              <FunnelPill>Opportunity → Student → Company → Internship → Completion → PPO</FunnelPill>
            </div>
          </div>
          <div className="lg:col-span-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-600">Alumni</span>
            <h2 className="mt-2.5 text-2xl font-extrabold tracking-tight text-strong">
              Your Data Doesn&rsquo;t End With Graduation
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-subtle">
              When students graduate, their records transition into the alumni ecosystem — retaining
              valuable information instead of losing it to the next incoming batch.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <AlumniYear year="Year 1" body="Students graduate — alumni records begin accumulating." tint="lavender" />
              <AlumniYear year="Year 2" body="Next batch joins — previous alumni remain." tint="mint" />
              <AlumniYear year="Year 3" body="Another batch joins — the network keeps growing." tint="cream" />
            </div>
            <p className="mt-4 text-sm font-bold text-strong">Your data grows. It doesn&rsquo;t reset.</p>
            <div className="mt-6 overflow-hidden rounded-card bg-card p-4 shadow-card">
              <GraduationScene />
            </div>
          </div>
        </div>
      </Section>

      {/* ACADEMIC STRUCTURE */}
      <Section>
        <SectionHeading
          eyebrow="Built for Colleges & Universities"
          title="Designed Around Your Academic Structure"
          subtitle="Whether you're managing a college with a few programmes or a university with multiple academic schools, CampusGO keeps placement information organized within your institutional structure."
        />
        <div className="mt-11">
          <HierarchyDiagram />
        </div>
      </Section>

      {/* WHY CAMPUSGO */}
      <Section alt>
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-strong">Why CampusGO?</h2>
          <p className="mt-3 text-sm leading-relaxed text-subtle">Because placement is a journey, not an event.</p>
        </div>
        <div className="mt-11 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_CAMPUSGO.map((w) => (
            <div key={w.title} className="rounded-card bg-card p-6 shadow-card" style={{ borderTop: `3px solid ${w.accent}` }}>
              <p className="text-sm font-extrabold" style={{ color: w.accent }}>{w.title}</p>
              <p className="mt-2 text-xs leading-relaxed text-body">{w.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/contact?intent=demo"
            className="inline-flex h-12 items-center rounded-md bg-gradient-accent px-6 text-sm font-semibold text-accent-foreground shadow-nav hover:opacity-95"
          >
            Request a Demo
          </Link>
        </div>
      </Section>

      <SiteFooter />
    </div>
  );
}
