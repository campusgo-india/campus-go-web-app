import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader, SiteFooter } from '../components/site-chrome';
import {
  ADVANTAGE_FLOW,
  BoltIcon,
  BrowserFrame,
  BuildingIcon,
  GRADIENT_BG,
  HeroDashboard,
  JOURNEY_STEPS,
  OfficerDesktopMockup,
  PhoneMockup,
  Section,
  SectionHeading,
  STAKEHOLDERS,
  TargetIcon,
  TINT_BG,
  TINT_FG,
  TrustItem,
  ValueStat,
} from '../components/site-sections';

export const metadata: Metadata = {
  title: { absolute: 'CampusGO — From Campus to Career' },
  description:
    'CampusGO connects students, training, employers, opportunities, recruitment and placement outcomes in one platform — the complete placement & career readiness system for colleges and universities.',
  alternates: { canonical: '/' },
};

const EXPLORE = [
  {
    href: "/product",
    title: 'The Platform',
    body: 'Students, eligibility, recruiters, applications, recruitment rounds, internships and alumni — one connected system.',
    tint: 'lavender' as const,
  },
  {
    href: '/readiness',
    title: 'Career Readiness',
    body: 'Measure student preparedness across four employability pillars, then train and reassess.',
    tint: 'mint' as const,
  },
  {
    href: '/mobile',
    title: 'On Mobile',
    body: 'A focused app for students and an on-the-go view for placement teams — install it like an app.',
    tint: 'cream' as const,
  },
  {
    href: "/insights",
    title: 'Reports & Insights',
    body: 'Turn everyday placement activity into structured data for institutional and accreditation reporting.',
    tint: 'rose' as const,
  },
];

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'CampusGO',
      url: 'https://www.campusgoindia.com',
      logo: 'https://www.campusgoindia.com/icon-512.png',
      description:
        'The complete placement & career readiness platform for colleges and universities.',
    },
    {
      '@type': 'SoftwareApplication',
      name: 'CampusGO',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web, Android',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR', description: 'Request a demo' },
      url: 'https://www.campusgoindia.com',
    },
  ],
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-app">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden bg-white">
        <div
          className="pointer-events-none absolute -right-24 -top-40 h-[560px] w-[560px] rounded-full opacity-70"
          style={{ background: 'radial-gradient(circle, rgba(59,110,245,0.08) 0%, rgba(255,255,255,0) 70%)' }}
        />
        <div
          className="pointer-events-none absolute -left-32 bottom-0 h-[420px] w-[420px] rounded-full opacity-70"
          style={{ background: 'radial-gradient(circle, rgba(226,128,64,0.08) 0%, rgba(255,255,255,0) 70%)' }}
        />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-12 px-6 py-16 sm:py-20 lg:flex-row lg:gap-16 lg:py-24">
          <div className="w-full max-w-xl text-center lg:text-left">
            <span className="inline-flex items-center rounded-full bg-primary-50 px-3.5 py-1.5 text-xs font-medium text-primary-600">
              The Complete Placement &amp; Career Readiness Platform
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-strong sm:text-5xl">
              From Campus
              <br />
              to Career.
            </h1>
            <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-subtle lg:mx-0">
              CampusGO connects students, training, employers, opportunities, recruitment and
              placement outcomes in one centralized platform — helping institutions manage the
              complete journey, before, during and after placement.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/contact?intent=demo"
                className="inline-flex h-12 items-center rounded-md bg-gradient-accent px-6 text-sm font-semibold text-accent-foreground shadow-nav hover:opacity-95"
              >
                Request a Demo
              </Link>
              <Link href="/product" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
                Explore the platform →
              </Link>
            </div>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 lg:justify-start">
              <TrustItem color="#3B6EF5">One branded portal per college</TrustItem>
              <TrustItem color="#1F9D6B">Readiness to alumni, one system</TrustItem>
              <TrustItem color="#E28040">Multi-college, tenant-isolated by design</TrustItem>
            </div>
          </div>
          <div className="w-full flex-shrink-0 lg:w-[560px]">
            <div className="rounded-[20px] bg-gradient-to-br from-primary-50 to-tint-accent p-3 shadow-nav">
              <BrowserFrame>
                <HeroDashboard />
              </BrowserFrame>
            </div>
          </div>
        </div>
      </section>

      {/* VALUE STRIP */}
      <Section className="!py-14">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <ValueStat tint="lavender" icon={<BoltIcon />} label="Less manual work" body="Rounds, notifications, and reports that used to take hours now run automatically." />
          <ValueStat tint="mint" icon={<TargetIcon />} label="Readiness before opportunity" body="Understand student preparedness across four pillars before an opportunity even opens." />
          <ValueStat tint="cream" icon={<BuildingIcon />} label="Built for many colleges" body="Each college gets its own branded, isolated portal — logo, email identity, and data." />
        </div>
      </Section>

      {/* PRODUCT PREVIEW */}
      <Section>
        <SectionHeading
          eyebrow="See it in action"
          title="One Screen for the Whole Drive"
          subtitle="Placement teams run recruitment from a single dashboard — progress stage by stage, per programme. Students get the same data, focused, on their phone."
        />
        <div className="relative mt-11">
          <BrowserFrame>
            <OfficerDesktopMockup />
          </BrowserFrame>
          <div className="pointer-events-none absolute -bottom-8 right-2 hidden w-[190px] sm:block">
            <PhoneMockup />
          </div>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-6 sm:mt-10 sm:grid-cols-2">
          <div>
            <p className="text-sm font-bold text-strong">Placement Dashboard</p>
            <p className="mt-1.5 text-sm leading-relaxed text-subtle">
              Applied → shortlisted → round by round → selected → offered, split by UG and PG, with
              active drives and the students who still need a nudge.
            </p>
          </div>
          <div>
            <p className="text-sm font-bold text-strong">Analytics &amp; Training</p>
            <p className="mt-1.5 text-sm leading-relaxed text-subtle">
              Placement rate, packages, offer counts, and cohort readiness — the numbers your
              institution reports on, kept current as the season runs.
            </p>
          </div>
        </div>
      </Section>

      {/* EXPLORE THE PLATFORM */}
      <Section alt>
        <SectionHeading
          eyebrow="Explore CampusGO"
          title="One Platform, Four Ways to Look at It"
          subtitle="The whole placement journey lives in CampusGO. Start wherever your team feels the pain first."
        />
        <div className="mt-11 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {EXPLORE.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group rounded-card bg-card p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-nav"
            >
              <span className={`inline-flex h-9 items-center rounded-pill px-3 text-xs font-bold ${TINT_BG[c.tint]} ${TINT_FG[c.tint]}`}>
                {c.title}
              </span>
              <p className="mt-3.5 text-sm leading-relaxed text-subtle">{c.body}</p>
              <span className="mt-4 inline-flex text-sm font-semibold text-primary-600 group-hover:text-primary-700">
                Learn more →
              </span>
            </Link>
          ))}
        </div>
      </Section>

      {/* ONE CONNECTED JOURNEY */}
      <Section>
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-strong">One Connected Journey</h2>
          <p className="mt-3 text-sm leading-relaxed text-subtle">
            CampusGO connects the activities that are often managed independently — from student
            readiness all the way to placement outcomes.
          </p>
        </div>
        <div className="mt-11 grid grid-cols-2 gap-5 sm:grid-cols-4">
          {JOURNEY_STEPS.map((s) => (
            <div key={s.n} className="rounded-card bg-card p-5 shadow-card">
              <span
                className={`inline-flex h-9 w-9 items-center justify-center rounded-pill text-xs font-extrabold text-white ${GRADIENT_BG[s.gradient]}`}
              >
                {s.n}
              </span>
              <p className="mt-3 text-sm font-bold text-strong">{s.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-subtle">{s.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* EVERY STAKEHOLDER */}
      <Section alt>
        <SectionHeading
          eyebrow="A Platform for Every Stakeholder"
          title="One Ecosystem. Different Experiences."
        />
        <div className="mt-11 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {STAKEHOLDERS.map((s) => (
            <div key={s.title} className="rounded-card bg-card p-5 shadow-card">
              <div className={`flex h-10 w-10 items-center justify-center rounded-md ${TINT_BG[s.tint]}`}>
                <span className={TINT_FG[s.tint]}>{s.icon}</span>
              </div>
              <p className="mt-3.5 text-sm font-bold text-strong">{s.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-subtle">{s.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* THE CAMPUSGO ADVANTAGE */}
      <section className="bg-[#0B1330] py-16">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-300">The CampusGO Advantage</span>
          <h2 className="mx-auto mt-2.5 max-w-2xl text-3xl font-extrabold tracking-tight text-white">
            Most Placement Systems Stop at Placement. CampusGO Continues.
          </h2>
          <p className="mx-auto mt-3.5 max-w-md text-sm leading-relaxed text-white/60">
            A student&rsquo;s journey doesn&rsquo;t end when an offer letter is issued.
          </p>
          <div className="mx-auto mt-10 flex max-w-4xl flex-wrap items-center justify-center gap-2.5">
            {ADVANTAGE_FLOW.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2.5">
                <span className={`rounded-pill px-3.5 py-1.5 text-xs font-semibold ${TINT_BG[step.tint]} ${TINT_FG[step.tint]}`}>
                  {step.label}
                </span>
                {i < ADVANTAGE_FLOW.length - 1 && <span className="text-white/30">→</span>}
              </div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-md text-sm font-semibold text-white/85">
            It creates a connected career ecosystem for the institution.
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <Section>
        <div className="relative overflow-hidden rounded-card bg-[#0B1330] px-8 py-12 sm:px-14">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(91,141,239,0.4) 0%, rgba(11,19,48,0) 70%)' }}
          />
          <div
            className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(247,140,160,0.28) 0%, rgba(11,19,48,0) 70%)' }}
          />
          <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="max-w-md">
              <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-[28px]">
                Ready to Move From Spreadsheets to a Connected Placement Ecosystem?
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-white/60">
                Bring your students, recruiters, opportunities and outcomes together.
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-col gap-3 sm:flex-row">
              <Link
                href="/contact?intent=demo"
                className="inline-flex h-12 items-center justify-center rounded-md bg-gradient-accent px-6 text-sm font-semibold text-accent-foreground shadow-nav hover:opacity-95"
              >
                Request a Demo
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-12 items-center justify-center rounded-md border border-white/20 bg-white/10 px-6 text-sm font-semibold text-white hover:bg-white/15"
              >
                Talk to Us
              </Link>
            </div>
          </div>
        </div>
      </Section>

      <SiteFooter />
    </div>
  );
}
