'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card } from '@campusgo/ui';
import { getOwnStudent, setPlacementRegistration, type Student } from '../../../lib/students';
import { listMyApplications, type Application } from '../../../lib/applications';
import { NotificationBell } from '../../../components/notification-bell';
import { ListSkeleton } from '../../../components/page-skeleton';
import { useApi, mutate } from '../../../lib/use-api';

// Stage → Badge tint. Anything not listed falls back to cream.
const STAGE_TINT: Record<string, 'lavender' | 'mint' | 'cream' | 'primary'> = {
  APPLIED: 'cream',
  VERIFIED: 'cream',
  SHORTLISTED: 'lavender',
  ROUND_1: 'lavender',
  ROUND_2: 'lavender',
  ROUND_3: 'lavender',
  HR: 'lavender',
  OFFER_RELEASED: 'mint',
  OFFER_ACCEPTED: 'mint',
  JOINED: 'mint',
};

const label = (s: string) => s.replace(/_/g, ' ');

type Tint = 'lavender' | 'mint' | 'cream' | 'rose' | 'accent';
const TINT_BG: Record<Tint, string> = {
  lavender: 'bg-tint-lavender',
  mint: 'bg-tint-mint',
  cream: 'bg-tint-cream',
  rose: 'bg-tint-rose',
  accent: 'bg-tint-accent',
};
const TINT_FG: Record<Tint, string> = {
  lavender: 'text-tint-lavender-fg',
  mint: 'text-tint-mint-fg',
  cream: 'text-tint-cream-fg',
  rose: 'text-tint-rose-fg',
  accent: 'text-tint-accent-fg',
};
// A stable-ish color per company so the same company always gets the same
// avatar tint across a session, instead of reshuffling on every render.
const AVATAR_TINTS: Tint[] = ['lavender', 'mint', 'cream', 'rose', 'accent'];
function tintForName(name: string): Tint {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TINTS[hash % AVATAR_TINTS.length]!;
}

interface NextInterview {
  when: Date;
  roundName: string;
  jobTitle: string;
  company: string;
  mode: string | null;
}

/** Earliest scheduled, still-pending interview across all applications. */
function findNextInterview(apps: Application[]): NextInterview | null {
  const now = Date.now();
  const upcoming: NextInterview[] = [];
  for (const a of apps) {
    for (const r of a.interviews) {
      if (!r.scheduledAt || r.result !== 'PENDING') continue;
      const when = new Date(r.scheduledAt);
      if (when.getTime() < now) continue;
      upcoming.push({
        when,
        roundName: r.roundName,
        jobTitle: a.job.title,
        company: a.job.company.name,
        mode: r.mode,
      });
    }
  }
  upcoming.sort((x, y) => x.when.getTime() - y.when.getTime());
  return upcoming[0] ?? null;
}

const fmtDateTime = (d: Date) =>
  d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

export default function StudentHome() {
  const { data: student } = useApi<Student>('/student/me', getOwnStudent);
  const { data: apps, isLoading: appsLoading } = useApi<Application[]>(
    '/student/applications',
    listMyApplications,
  );

  if (appsLoading || !apps) return <ListSkeleton />;

  const firstName = student?.user.fullName?.split(' ')[0] ?? 'there';
  // Driven by the funnel `status` (APPLIED/IN_PROGRESS/SELECTED/REJECTED/
  // WITHDRAWN), not the detailed ATS `stage` — a job with an offer already
  // extended (stage OFFER_RELEASED/OFFER_ACCEPTED) isn't "in progress" by
  // stage's TERMINAL list, so it double-counted here while Placement
  // Tracker's status-based funnel correctly called it Selected. Matching the
  // same field both places is what fixes "0 in progress but 3 selected".
  // Still-pending applications (rounds open, no outcome yet) — used only to
  // prioritize the "Your applications" preview list below, most-actionable
  // first. The "Applied" stat tile means something different: every
  // application submitted (== apps.length), same as Placement Tracker's
  // funnel — keeping the two screens on one definition is what avoids
  // this exact "Applied: 0 but Selected: 3" mismatch recurring.
  const active = apps.filter((a) => a.status === 'APPLIED' || a.status === 'IN_PROGRESS');
  const offers = apps.filter((a) => a.status === 'SELECTED' || a.offerCtc != null);
  // Same formula as Placement Tracker's "Interviews scheduled" tile — used
  // here instead of a second "Applied" tile, which would just duplicate the
  // "Applications" count above it now that Applied means the funnel total.
  const interviewsScheduled = apps.reduce(
    (n, a) => n + a.interviews.filter((r) => r.result === 'PENDING' && r.scheduledAt).length,
    0,
  );
  const nextInterview = findNextInterview(apps);
  const completion = student?.profileCompletion ?? 0;
  const incompleteSteps = student?.profileSteps?.filter((s) => s.percentage < 100) ?? [];
  const nextStepLabel = incompleteSteps[0]?.label;
  const showProfileNudge =
    !!student && (completion < 100 || student.verificationStatus !== 'VERIFIED');
  const showRegisterNudge =
    !!student && student.verificationStatus === 'VERIFIED' && !student.registeredForPlacements;

  return (
    <div className="space-y-6">
      {/* Brand header + overlapping stat strip, Swiggy/fintech-app style */}
      <div>
        <header className="animate-rise relative overflow-hidden rounded-2xl bg-gradient-brand px-5 pb-9 pt-5 text-white shadow-nav">
          <div
            className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)' }}
          />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80">Welcome back</p>
              <h1 className="text-2xl font-semibold">Hi, {firstName}</h1>
            </div>
            <NotificationBell
              href="/me/notifications"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white"
            />
          </div>
        </header>

        {/* Stat strip overlaps the header's bottom edge */}
        <div className="relative -mt-5 grid grid-cols-3 gap-3 px-1">
          <Stat value={apps.length} label="Applications" tint="lavender" />
          <Stat value={interviewsScheduled} label="Interviews" tint="cream" />
          <Stat value={offers.length} label="Selected" tint="mint" />
        </div>
      </div>

      {/* Quick launch — Swiggy-style row of colorful icon tiles */}
      <div className="-mx-4 px-4">
        <div className="flex gap-3.5 overflow-x-auto pb-1 scrollbar-hide">
          <QuickLaunch href="/me/jobs" gradient="bg-gradient-brand" icon={<BriefcaseIcon />} label="Jobs" />
          <QuickLaunch href="/me/training" gradient="bg-gradient-ocean" icon={<ChartIcon />} label="Employability" />
          <QuickLaunch href="/me/placement" gradient="bg-gradient-violet" icon={<TrackIcon />} label="Tracker" />
          <QuickLaunch href="/me/placement-policy" gradient="bg-gradient-accent" icon={<DocIcon />} label="Policy" />
        </div>
      </div>

      {/* Profile / verification nudge */}
      {showProfileNudge && (
        <Link href="/me/profile/edit" className="block">
          <Card className="press space-y-3 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tint-cream text-tint-cream-fg">
                <UserIcon />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-strong">
                  {student!.verificationStatus === 'VERIFIED'
                    ? 'Complete your profile'
                    : student!.verificationStatus === 'SUBMITTED'
                      ? 'Profile submitted — awaiting verification'
                      : student!.verificationStatus === 'REJECTED'
                        ? 'Profile needs changes'
                        : 'Get your profile verified'}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-tint-cream-fg">{completion}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-pill bg-app">
              <div
                className="h-full rounded-pill bg-gradient-accent"
                style={{ width: `${completion}%` }}
              />
            </div>
            <p className="text-xs text-subtle">
              {student!.verificationStatus === 'VERIFIED'
                ? nextStepLabel
                  ? `Next up: ${nextStepLabel}`
                  : 'A complete profile makes you eligible for more roles.'
                : 'Verified students unlock the job feed. Tap to review your details.'}
            </p>
          </Card>
        </Link>
      )}

      {/* Placement cycle opt-in — separate from profile verification */}
      {showRegisterNudge && <RegisterForPlacementsCard />}

      {/* Next interview hero */}
      {nextInterview ? (
        <div className="relative overflow-hidden rounded-card bg-gradient-brand p-5 text-white shadow-nav">
          <div
            className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 70%)' }}
          />
          <div className="relative">
            <p className="text-xs/relaxed opacity-90">
              Next interview · {fmtDateTime(nextInterview.when)}
            </p>
            <h2 className="mt-1 text-xl font-semibold">
              {nextInterview.jobTitle} — {nextInterview.roundName}
            </h2>
            <p className="mt-3 text-sm opacity-90">
              {nextInterview.company}
              {nextInterview.mode ? ` · ${nextInterview.mode}` : ''}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-card bg-white p-5 shadow-card">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tint-lavender text-tint-lavender-fg">
            <CalendarIcon />
          </span>
          <div>
            <p className="text-sm font-semibold text-strong">No interviews scheduled</p>
            <p className="mt-1 text-xs text-subtle">
              Keep applying — scheduled rounds will show up here.
            </p>
          </div>
        </div>
      )}

      {/* Active applications */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-strong">
            <span className="h-4 w-1.5 rounded-full bg-gradient-brand" />
            Your applications
          </h3>
          {apps.length > 0 && (
            <Link href="/me/applications" className="text-sm text-primary-600">
              See all
            </Link>
          )}
        </div>

        {apps.length === 0 ? (
          <Card className="space-y-2 p-6 text-center">
            <p className="text-sm text-subtle">You haven't applied to any jobs yet.</p>
            <Link href="/me/jobs" className="text-sm font-medium text-primary-600">
              Browse jobs →
            </Link>
          </Card>
        ) : (
          (active.length > 0 ? active : apps).slice(0, 4).map((a) => {
            const companyTint = tintForName(a.job.company.name);
            return (
              <Link key={a.id} href="/me/applications" className="block">
                <Card className="p-4 transition hover:shadow-nav">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${TINT_BG[companyTint]} ${TINT_FG[companyTint]}`}
                      >
                        {a.job.company.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-strong">{a.job.title}</p>
                        <p className="truncate text-xs text-subtle">
                          {a.job.company.name} · applied{' '}
                          {new Date(a.appliedAt).toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                      </div>
                    </div>
                    <Badge tint={STAGE_TINT[a.stage] ?? 'cream'} className="shrink-0">
                      {label(a.stage)}
                    </Badge>
                  </div>
                </Card>
              </Link>
            );
          })
        )}
      </section>
    </div>
  );
}

function RegisterForPlacementsCard() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function register() {
    setSaving(true);
    setError(null);
    try {
      await setPlacementRegistration(true);
      await mutate('/student/me');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not register');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-3 border border-primary-200 bg-primary-50 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-primary-600">
          <TrackIcon />
        </span>
        <div>
          <p className="text-sm font-semibold text-strong">Register for placements</p>
          <p className="mt-1 text-xs text-body">
            Your profile is verified. Register once to be counted in this season&apos;s placement
            drive — the placement cell tracks registered students separately from the full student
            list.
          </p>
        </div>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <Button size="sm" onClick={register} loading={saving}>
        {saving ? 'Registering…' : 'Register now'}
      </Button>
    </Card>
  );
}

function Stat({ value, label, tint }: { value: number; label: string; tint: Tint }) {
  return (
    <div className={`press rounded-card p-3 text-center shadow-card ${TINT_BG[tint]}`}>
      <p className={`text-2xl font-bold ${TINT_FG[tint]}`}>{value}</p>
      <p className="text-xs font-medium text-subtle">{label}</p>
    </div>
  );
}

/** Swiggy-style quick-launch tile: a colorful rounded-square icon with a
 * label underneath, in a horizontally-scrollable row. */
function QuickLaunch({
  href,
  gradient,
  icon,
  label,
}: {
  href: string;
  gradient: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link href={href} className="press flex shrink-0 flex-col items-center gap-1.5">
      <span
        className={`flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-nav [&>svg]:h-7 [&>svg]:w-7 ${gradient}`}
      >
        {icon}
      </span>
      <span className="text-xs font-medium text-body">{label}</span>
    </Link>
  );
}

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  className: 'h-5 w-5',
} as const;

function ChartIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrackIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 5h18M6 12h12M10 19h4" strokeLinecap="round" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg {...iconProps}>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" strokeLinejoin="round" />
      <path d="M14 3v6h6" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c0-3.6 3.4-6.5 7.5-6.5s7.5 2.9 7.5 6.5" strokeLinecap="round" />
    </svg>
  );
}
