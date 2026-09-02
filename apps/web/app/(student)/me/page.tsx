'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card } from '@campusgo/ui';
import {
  applicationStatusBadge,
  listMyApplications,
  type Application,
} from '../../../lib/applications';
import { getOwnStudent, setPlacementRegistration, type Student } from '../../../lib/students';
import { formatCtc, getJobFeed, type Job } from '../../../lib/jobs';
import { getMyDashboard, type EmployabilityDashboard, type EmployabilityTier } from '../../../lib/training';
import { ListSkeleton } from '../../../components/page-skeleton';
import { useApi, mutate } from '../../../lib/use-api';

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

// Informational status tag (matches the Employability screen's badge).
const TIER_STATUS: Record<EmployabilityTier, string> = {
  TIER_1: 'Tier 1 Eligible',
  TIER_2: 'Tier 2 Eligible',
  TIER_3: 'Building momentum',
};
const DAY_MS = 86_400_000;

function jobIsOpen(j: Job): boolean {
  if (j.status === 'CLOSED') return false;
  if (j.applicationDeadline && new Date(j.applicationDeadline).getTime() < Date.now()) return false;
  return true;
}
function deadlineTime(j: Job): number {
  return j.applicationDeadline ? new Date(j.applicationDeadline).getTime() : Number.MAX_SAFE_INTEGER;
}
function postedWithin24h(j: Job): boolean {
  const t = j.publishedAt ?? j.createdAt;
  return t != null && Date.now() - new Date(t).getTime() < DAY_MS;
}
function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export default function StudentHome() {
  const { data: student } = useApi<Student>('/student/me', getOwnStudent);
  const { data: apps, isLoading: appsLoading } = useApi<Application[]>(
    '/student/applications',
    listMyApplications,
  );
  const { data: dashboard } = useApi<EmployabilityDashboard>('/me/training/dashboard', getMyDashboard);
  // Same cache key as the Jobs feed page so the count here and that list agree.
  const { data: jobFeed } = useApi<Job[]>('/student/jobs', getJobFeed);

  if (appsLoading || !apps) return <ListSkeleton />;

  // Still-pending applications, most-actionable first — drives the "Continue
  // application" card and the "Your applications" preview list.
  const active = apps.filter((a) => a.status === 'APPLIED' || a.status === 'IN_PROGRESS');
  const continueApp = active[0] ?? null;

  const completion = student?.profileCompletion ?? 0;
  const nextStepLabel = student?.profileSteps?.find((s) => s.percentage < 100)?.label;
  const showProfileNudge =
    !!student && (completion < 100 || student.verificationStatus !== 'VERIFIED');
  const showRegisterNudge =
    !!student && student.verificationStatus === 'VERIFIED' && !student.registeredForPlacements;

  const feed = jobFeed ?? [];
  // "Open" == exactly what the Jobs feed's default tab shows: not closed,
  // not already applied to (eligible or not — ineligible ones still list there).
  const openJobs = feed.filter((j) => jobIsOpen(j) && !j.applied);
  const newTodayCount = openJobs.filter(postedWithin24h).length;
  // Recommendations additionally skip roles the student isn't eligible for.
  const recommended = [...openJobs]
    .filter((j) => j.eligible !== false)
    .sort((a, b) => deadlineTime(a) - deadlineTime(b))
    .slice(0, 2);

  const readiness = dashboard?.readinessIndex ?? null;
  const tierStatus = dashboard ? TIER_STATUS[dashboard.tier] : null;

  return (
    <div className="space-y-6">
      {/* Search — a tap-through to the jobs feed styled as a search field */}
      <Link
        href="/me/jobs"
        className="press flex h-12 items-center gap-2.5 rounded-pill bg-white px-4 text-sm text-subtle shadow-card"
      >
        <SearchIcon />
        Search companies, roles…
      </Link>

      {/* My readiness hero — big number + tap-through to the roadmap */}
      {readiness != null && (
        <Link
          href="/me/training"
          className="press relative block overflow-hidden rounded-card bg-gradient-brand p-5 text-white shadow-nav"
        >
          <div
            className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 70%)' }}
          />
          <div className="relative flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                My readiness
              </p>
              <p className="mt-1 text-2xl font-extrabold">{readiness}% Ready</p>
              <p className="mt-1 text-xs text-white/80">
                {tierStatus ? `${tierStatus} · ` : ''}tap to view roadmap
              </p>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
              <ChevronRightIcon />
            </span>
          </div>
        </Link>
      )}

      {/* Quick launch — four circular shortcuts */}
      <div className="flex items-start justify-between px-1">
        <QuickIcon href="/me/jobs" tint="cream" icon={<BriefcaseIcon />} label="Jobs" />
        <QuickIcon href="/me/training" tint="mint" icon={<TrendUpIcon />} label="Employability" />
        <QuickIcon href="/me/placement" tint="lavender" icon={<FunnelIcon />} label="Tracker" />
        <QuickIcon href="/me/placement-policy" tint="cream" icon={<DocIcon />} label="Policy" />
      </div>

      {/* Profile / verification nudge — only while something's outstanding */}
      {showProfileNudge && student && (
        <Link href="/me/profile/edit" className="block">
          <Card className="press space-y-3 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tint-cream text-tint-cream-fg">
                <UserIcon />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-strong">
                  {student.verificationStatus === 'VERIFIED'
                    ? 'Complete your profile'
                    : student.verificationStatus === 'SUBMITTED'
                      ? 'Profile submitted — awaiting verification'
                      : student.verificationStatus === 'REJECTED'
                        ? 'Profile needs changes'
                        : 'Get your profile verified'}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-tint-cream-fg">{completion}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-pill bg-app">
              <div className="h-full rounded-pill bg-gradient-accent" style={{ width: `${completion}%` }} />
            </div>
            <p className="text-xs text-subtle">
              {student.verificationStatus === 'VERIFIED'
                ? nextStepLabel
                  ? `Next up: ${nextStepLabel}`
                  : 'A complete profile makes you eligible for more roles.'
                : 'Verified students unlock the job feed. Tap to review your details.'}
            </p>
          </Card>
        </Link>
      )}

      {showRegisterNudge && <RegisterForPlacementsCard />}

      {/* Continue application · New jobs today */}
      <div className="grid grid-cols-2 gap-3">
        {continueApp && (
          <Link
            href="/me/applications"
            className="press flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-card"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-tint-cream text-tint-cream-fg">
              <BriefcaseIcon />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-strong">Continue application</p>
              <p className="mt-0.5 truncate text-xs text-subtle">{continueApp.job.title}</p>
            </div>
          </Link>
        )}
        <Link
          href="/me/jobs"
          className={`press flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-card ${
            continueApp ? '' : 'col-span-2'
          }`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-tint-mint text-tint-mint-fg">
            <StarIcon />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-strong">
              {newTodayCount > 0 ? 'New jobs today' : 'Open roles'}
            </p>
            <p className="mt-0.5 truncate text-xs text-subtle">
              {newTodayCount > 0
                ? `${newTodayCount} new role${newTodayCount === 1 ? '' : 's'} posted`
                : openJobs.length > 0
                  ? `${openJobs.length} role${openJobs.length === 1 ? '' : 's'} open now`
                  : 'No open roles right now'}
            </p>
          </div>
        </Link>
      </div>

      {/* Recommended for you */}
      {recommended.length > 0 && (
        <section className="space-y-3">
          <SectionHead title="Recommended for you" href="/me/jobs" />
          <div className="grid grid-cols-2 gap-3">
            {recommended.map((j, i) => (
              <RecommendedJobCard key={j.id} job={j} accent={i === 0 ? 'brand' : 'accent'} />
            ))}
          </div>
        </section>
      )}

      {/* Your applications */}
      <section className="space-y-3">
        <SectionHead title="Your applications" href={apps.length > 0 ? '/me/applications' : undefined} />
        {apps.length === 0 ? (
          <Card className="space-y-2 p-6 text-center">
            <p className="text-sm text-subtle">
              This is where your applications will track. Ready to make the first one count?
            </p>
            <Link href="/me/jobs" className="text-sm font-medium text-primary-600">
              Browse roles →
            </Link>
          </Card>
        ) : (
          (active.length > 0 ? active : apps).slice(0, 4).map((a) => {
            const companyTint = tintForName(a.job.company.name);
            return (
              <Link key={a.id} href="/me/applications" className="block">
                <Card className="flex items-center justify-between gap-3 p-4 transition hover:shadow-nav">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${TINT_BG[companyTint]} ${TINT_FG[companyTint]}`}
                    >
                      {a.job.company.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-strong">{a.job.title}</p>
                      <p className="truncate text-xs text-subtle">{a.job.company.name}</p>
                    </div>
                  </div>
                  <Badge
                    tint={applicationStatusBadge(a.status).tint}
                    size="sm"
                    className="shrink-0 uppercase tracking-wide"
                  >
                    {applicationStatusBadge(a.status).label}
                  </Badge>
                </Card>
              </Link>
            );
          })
        )}
      </section>
    </div>
  );
}

function SectionHead({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-strong">
        <span className="h-4 w-1.5 rounded-full bg-gradient-brand" />
        {title}
      </h3>
      {href && (
        <Link href={href} className="text-sm font-semibold text-accent-600">
          See all
        </Link>
      )}
    </div>
  );
}

function QuickIcon({
  href,
  tint,
  icon,
  label,
}: {
  href: string;
  tint: Tint;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link href={href} className="press flex w-16 flex-col items-center gap-1.5 text-center">
      <span className={`flex h-14 w-14 items-center justify-center rounded-full ${TINT_BG[tint]} ${TINT_FG[tint]}`}>
        {icon}
      </span>
      <span className="text-[11px] font-medium text-body">{label}</span>
    </Link>
  );
}

function RecommendedJobCard({ job, accent }: { job: Job; accent: 'brand' | 'accent' }) {
  const daysLeft = job.applicationDeadline
    ? Math.ceil((new Date(job.applicationDeadline).getTime() - Date.now()) / DAY_MS)
    : null;
  const badge =
    daysLeft != null && daysLeft >= 0 && daysLeft <= 7
      ? `Closes in ${daysLeft}d`
      : postedWithin24h(job)
        ? 'New'
        : null;
  const company = job.company?.name ?? job.companyName ?? 'Company';
  const ctc = formatCtc(job.ctcMin, job.ctcMax);
  const payLine = [ctc !== 'Not disclosed' ? ctc : null, job.workMode ? titleCase(job.workMode) : job.location]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link
      href={`/me/jobs/${job.id}`}
      className="press flex flex-col overflow-hidden rounded-2xl bg-white shadow-card"
    >
      <div className={`relative p-3 ${accent === 'brand' ? 'bg-gradient-brand' : 'bg-gradient-accent'}`}>
        {badge && (
          <span className="absolute right-2 top-2 rounded-pill bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-strong">
            {badge}
          </span>
        )}
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sm font-bold text-strong">
          {company.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="min-w-0 p-3">
        <p className="truncate text-sm font-bold text-strong">{job.title}</p>
        <p className="truncate text-xs text-subtle">{company}</p>
        {payLine && <p className="mt-1 truncate text-[11px] text-subtle">{payLine}</p>}
      </div>
    </Link>
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
          <FunnelIcon />
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

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  className: 'h-5 w-5',
} as const;

function SearchIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function TrendUpIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 7h6v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FunnelIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z" strokeLinejoin="round" />
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

function BriefcaseIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg {...iconProps}>
      <path
        d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 21.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"
        strokeLinejoin="round"
      />
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

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-4 w-4 shrink-0">
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
