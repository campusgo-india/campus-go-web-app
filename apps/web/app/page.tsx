import Link from 'next/link';
import { Badge, Card } from '@campusgo/ui';

export const metadata = {
  title: 'CampusGO — Placement Intelligence & Career Success Platform',
  description:
    'CampusGO automates campus placements end-to-end: job postings, interview pipelines, notifications, and reporting for colleges — so placement teams save time and students never miss an opportunity.',
};

const OFFICER_FEATURES = [
  {
    title: 'One pipeline for every job',
    body: 'Post a job once and track every applicant through Applied → Shortlisted → Interview rounds → Offer, with a live funnel view instead of spreadsheets and WhatsApp groups.',
  },
  {
    title: 'Interviews that run themselves',
    body: 'Create a round and CampusGO enrolls the right cohort automatically, closes applications the moment interviews start, and advances or rejects applicants with two clicks.',
  },
  {
    title: 'Notifications, not follow-ups',
    body: 'Every stage change — shortlisted, interview scheduled, offer released — notifies the student automatically, in-app and by email, from your own college identity.',
  },
  {
    title: 'Reports in one click',
    body: 'Export applicant lists, placement stats, and funnel breakdowns as CSV or Excel, named and ready to hand to recruiters — no manual formatting.',
  },
  {
    title: 'Your college, your brand',
    body: "Your own logo in every screen students and staff see, and notification emails sent from your college's own address, not a generic platform inbox.",
  },
  {
    title: 'A team, not a login',
    body: 'Bring on placement officers with scoped access, keep a record of who did what, and manage students, companies, alumni, and internships from one dashboard.',
  },
];

const STUDENT_FEATURES = [
  {
    title: 'Never miss an opening',
    body: 'New jobs and deadlines reach you the moment they’re posted — as a phone notification, not a notice board you have to walk past.',
  },
  {
    title: 'Apply in one tap',
    body: 'Eligibility (school, CGPA, backlogs, programme) is checked automatically, so the jobs you see are the jobs you can actually apply to.',
  },
  {
    title: 'Know where you stand',
    body: 'Every application’s status — applied, shortlisted, interview scheduled, offer — is visible in one place, updated the moment your placement team acts.',
  },
  {
    title: 'One résumé, everywhere',
    body: 'Build your résumé once, get a shareable link, and reuse it for every application — no re-uploading the same PDF to a dozen different jobs.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-app">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-2xl font-bold">
          <span className="text-primary-700">Campus</span>
          <span className="text-primary-400">GO</span>
        </span>
        <Link
          href="/login"
          className="rounded-md bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-nav transition hover:opacity-95"
        >
          Login
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pb-16 pt-10 text-center sm:pt-16">
        <Badge tint="primary" className="mb-5">
          Placement Intelligence & Career Success Platform
        </Badge>
        <h1 className="text-4xl font-bold leading-tight text-strong sm:text-5xl">
          Campus placements, run on autopilot.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-body sm:text-lg">
          CampusGO replaces spreadsheets, WhatsApp groups, and manual follow-ups with one
          platform: job postings, interview pipelines, and notifications that run themselves —
          so placement teams get their time back, and no student misses an opportunity.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/login"
            className="rounded-md bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-nav transition hover:opacity-95"
          >
            Login to your college
          </Link>
        </div>
      </section>

      {/* Value strip */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ValueStat label="Less manual work" body="Rounds, notifications, and reports that used to take hours run automatically." />
          <ValueStat label="Zero missed deadlines" body="Students get notified the instant something changes — no more checking a noticeboard." />
          <ValueStat label="Built for many colleges" body="Each college gets its own branded, isolated portal — logo, email identity, and data." />
        </div>
      </section>

      {/* For placement officers */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold text-strong sm:text-3xl">
            For placement officers & colleges
          </h2>
          <p className="mt-2 text-sm text-subtle sm:text-base">
            Everything it takes to run a placement season, minus the busywork.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {OFFICER_FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* For students */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold text-strong sm:text-3xl">For students</h2>
          <p className="mt-2 text-sm text-subtle sm:text-base">
            Your placement journey, on your phone — install it like an app.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {STUDENT_FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-4xl px-6 py-14 text-center">
          <h2 className="text-2xl font-semibold text-strong sm:text-3xl">
            Already onboarded? Sign in to your college.
          </h2>
          <p className="mt-2 text-sm text-subtle">
            Placement officers, college admins, and students all sign in from the same place.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-md bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-nav transition hover:opacity-95"
          >
            Login
          </Link>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-8 text-center text-xs text-subtle">
        <span className="font-bold">
          <span className="text-primary-700">Campus</span>
          <span className="text-primary-400">GO</span>
        </span>{' '}
        — Placement Intelligence & Career Success Platform
      </footer>
    </div>
  );
}

function ValueStat({ label, body }: { label: string; body: string }) {
  return (
    <Card className="p-5 text-center">
      <p className="text-sm font-semibold text-primary-700">{label}</p>
      <p className="mt-1.5 text-xs text-subtle">{body}</p>
    </Card>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-strong">{title}</h3>
      <p className="mt-1.5 text-sm text-subtle">{body}</p>
    </Card>
  );
}
