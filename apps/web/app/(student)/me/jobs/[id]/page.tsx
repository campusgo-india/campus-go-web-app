'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge, Card } from '@campusgo/ui';
import { applyToJob, formatCtc, formatLpa, getJob, type Job } from '../../../../../lib/jobs';
import {
  applicationStatusBadge,
  listMyApplications,
  type Application,
} from '../../../../../lib/applications';
import { PdfModal } from '../../../../../components/pdf-modal';
import { ApplyModal } from '../../../../../components/apply-modal';
import { ApplicationTimeline } from '../../../../../components/application-timeline';
import { EligibilityCheckModal } from '../../../../../components/eligibility-check-modal';
import { DetailSkeleton } from '../../../../../components/page-skeleton';
import { mutate, useApi } from '../../../../../lib/use-api';

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
const AVATAR_TINTS: Tint[] = ['lavender', 'mint', 'cream', 'rose'];
function tintForName(name: string): Tint {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TINTS[hash % AVATAR_TINTS.length]!;
}
const workModeLabel = (m: string | null) =>
  !m ? null : m === 'ONSITE' ? 'Work from office' : m.charAt(0) + m.slice(1).toLowerCase();

export default function StudentJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [applying, setApplying] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [eligibilityOpen, setEligibilityOpen] = useState(false);
  const [pdfView, setPdfView] = useState<{ url: string; name?: string | null } | null>(null);

  const { data: job } = useApi<Job>(`/student/job/${id}`, () => getJob(id));
  const { data: apps } = useApi<Application[]>('/student/applications', listMyApplications);

  const app = apps?.find((a) => a.job.id === id) ?? null;

  function onApplyClick() {
    if (!job) return;
    if (job.eligible === false) {
      setEligibilityOpen(true);
      return;
    }
    continueApply();
  }

  function continueApply() {
    if (!job) return;
    if (Array.isArray(job.applicationFormFields) && job.applicationFormFields.length > 0)
      setFormOpen(true);
    else apply();
  }

  async function apply(responses?: Record<string, string>) {
    setApplying(true);
    try {
      await applyToJob(id, responses);
      setFormOpen(false);
      await mutate(`/student/job/${id}`);
      await mutate('/student/applications');
      await mutate('/student/jobs');
    } catch (err) {
      throw err;
    } finally {
      setApplying(false);
    }
  }

  if (!job) return <DetailSkeleton />;

  const company = job.companyName ?? job.company?.name ?? 'Company';
  const chips = [
    { icon: <ClockIcon />, text: job.jobType.replace(/_/g, ' ') },
    workModeLabel(job.workMode) ? { icon: <BuildingIcon />, text: workModeLabel(job.workMode)! } : null,
    job.location ? { icon: <PinIcon />, text: job.location } : null,
  ].filter(Boolean) as { icon: React.ReactNode; text: string }[];
  const notEligible = job.eligible === false;
  const expired =
    !!job.applicationDeadline && new Date(job.applicationDeadline).getTime() < Date.now();
  const applied = !!app;
  const st = app ? applicationStatusBadge(app.status) : null;
  const avatarTint = tintForName(company);

  return (
    <div className="space-y-5 pb-28">
      <Link href="/me/jobs" className="text-sm text-primary-600">
        ← Jobs
      </Link>

      {/* Header */}
      <div className="animate-rise flex items-start gap-3">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold shadow-card ${TINT_BG[avatarTint]} ${TINT_FG[avatarTint]}`}
        >
          {company.trim().charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-tight text-strong">{job.title}</h1>
          <p className="text-sm text-subtle">{company}</p>
        </div>
        {applied && st && (
          <Badge tint={st.tint} size="sm">
            {st.label}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <span
            key={c.text}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-body shadow-sm"
          >
            <span className="text-subtle">{c.icon}</span>
            {c.text}
          </span>
        ))}
      </div>

      {/* Track application (if applied) */}
      {applied && app && (
        <Card className="animate-rise space-y-3 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-strong">
            <span className="h-4 w-1.5 rounded-full bg-gradient-brand" />
            Application status
          </p>
          <ApplicationTimeline app={app} />
          {app.status === 'SELECTED' && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-tint-mint px-3.5 py-3">
              <span className="text-sm font-semibold text-tint-mint-fg">
                🎉 You&apos;ve been selected!
              </span>
              {app.offerCtc != null && (
                <span className="text-sm font-medium text-body">{formatLpa(app.offerCtc)}</span>
              )}
              {app.offerLetterUrl && (
                <a
                  href={app.offerLetterUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-primary-600 hover:underline"
                >
                  Offer letter
                </a>
              )}
            </div>
          )}
        </Card>
      )}

      {/* About */}
      <Card className="animate-rise space-y-3 p-4" style={{ animationDelay: '60ms' }}>
        <div className="flex flex-wrap gap-2">
          <StatChip icon={<RupeeIcon />} value={formatCtc(job.ctcMin, job.ctcMax)} label="CTC" />
          {job.applicationDeadline && (
            <StatChip
              icon={<CalendarIcon />}
              value={new Date(job.applicationDeadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
              label="Apply by"
              highlight={expired}
            />
          )}
        </div>
        {job.description && (
          <>
            <p className="flex items-center gap-2 text-sm font-semibold text-strong">
              <span className="h-4 w-1.5 rounded-full bg-gradient-brand" />
              About this job
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-body">
              {job.description}
            </p>
          </>
        )}
        {job.pdfUrl && (
          <button
            onClick={async () => {
              try {
                setPdfView({ url: job.pdfUrl!, name: job.pdfName });
              } catch (err) {
                alert(err instanceof Error ? err.message : 'Could not open PDF');
              }
            }}
            className="press inline-flex w-fit items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-body"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded bg-danger/10 text-[10px] font-bold text-danger">
              PDF
            </span>
            View job description
          </button>
        )}
      </Card>

      {/* Who can apply */}
      <Card className="animate-rise space-y-2 p-4" style={{ animationDelay: '120ms' }}>
        <p className="flex items-center gap-2 text-sm font-semibold text-strong">
          <span className="h-4 w-1.5 rounded-full bg-gradient-brand" />
          Who can apply
        </p>
        <dl className="space-y-2">
          <Row label="Schools" value={job.eligibleSchools.join(', ') || 'Any'} />
          <Row label="Programmes" value={job.eligibleProgrammes.join(', ') || 'Any'} />
          <Row label="Batch" value={job.graduationYears.join(', ') || 'Any'} />
          {job.minUgPercentage != null && (
            <Row label="Min UG %" value={`${job.minUgPercentage}%`} />
          )}
          {job.minCgpa != null && <Row label="Min PG %" value={`${job.minCgpa}%`} />}
        </dl>
      </Card>

      {notEligible && !applied && (
        <div className="rounded-md bg-tint-cream/50 px-3 py-2 text-xs text-tint-cream-fg">
          <span className="font-medium">Tap Apply to complete required details.</span>{' '}
          {(job.eligibilityReasons ?? []).filter((r) => r !== 'Profile not verified').join(' · ') ||
            "You don't meet the criteria."}
        </div>
      )}

      {/* Sticky action footer — only rendered when there's an actual action
          to take. The status itself is already shown via the top badge +
          timeline, so a disabled full-width "button" just repeating
          "Rejected"/"Applied" is a dead, misleading element — removed rather
          than duplicated. */}
      {!applied && !expired && (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-border bg-white/95 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          <button
            onClick={onApplyClick}
            disabled={applying}
            className="press w-full rounded-pill bg-gradient-brand py-3 text-sm font-semibold text-white shadow-nav disabled:opacity-60"
          >
            {applying ? 'Applying…' : 'Apply to this job'}
          </button>
        </div>
      )}
      {!applied && expired && (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-border bg-white/95 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          <p className="py-2 text-center text-sm text-subtle">Applications closed</p>
        </div>
      )}
      {applied && app?.status === 'REJECTED' && (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-border bg-white/95 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          <Link
            href="/me/jobs"
            className="press flex w-full items-center justify-center rounded-pill bg-gradient-brand py-3 text-sm font-semibold text-white shadow-nav"
          >
            Browse similar jobs
          </Link>
        </div>
      )}
      {applied && app?.status === 'SELECTED' && app.offerLetterUrl && (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-border bg-white/95 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          <a
            href={app.offerLetterUrl}
            target="_blank"
            rel="noreferrer"
            className="press flex w-full items-center justify-center rounded-pill bg-gradient-brand py-3 text-sm font-semibold text-white shadow-nav"
          >
            View offer letter
          </a>
        </div>
      )}

      {pdfView && (
        <PdfModal
          url={pdfView.url}
          name={pdfView.name}
          onClose={() => {
            setPdfView(null);
          }}
        />
      )}
      {formOpen && (
        <ApplyModal
          job={job}
          submitting={applying}
          onCancel={() => setFormOpen(false)}
          onSubmit={(responses) => apply(responses)}
        />
      )}
      {eligibilityOpen && job && (
        <EligibilityCheckModal
          job={job}
          open
          onClose={() => setEligibilityOpen(false)}
          onEligible={() => {
            setEligibilityOpen(false);
            continueApply();
          }}
        />
      )}
    </div>
  );
}

/** Icon + value + label in a soft rounded chip — the "🔥230kcal ⏱10h5m"
 * pattern, instead of a plain unlabeled text stack. */
function StatChip({
  icon,
  value,
  label,
  highlight,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl px-3 py-2 ${highlight ? 'bg-tint-rose' : 'bg-app'}`}
    >
      <span className={highlight ? 'text-tint-rose-fg' : 'text-subtle'}>{icon}</span>
      <div>
        <p className={`text-sm font-bold leading-tight ${highlight ? 'text-tint-rose-fg' : 'text-strong'}`}>
          {value}
        </p>
        <p className={`text-[10px] leading-tight ${highlight ? 'text-tint-rose-fg' : 'text-subtle'}`}>{label}</p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className="text-right text-sm font-medium text-strong">{value}</dd>
    </div>
  );
}

const svp = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, className: 'h-3.5 w-3.5' } as const;
function ClockIcon() {
  return (
    <svg {...svp}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function BuildingIcon() {
  return (
    <svg {...svp}>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M8 7h1M15 7h1M8 11h1M15 11h1M8 15h1M15 15h1" strokeLinecap="round" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg {...svp}>
      <path d="M12 21s7-6.5 7-11.5a7 7 0 1 0-14 0C5 14.5 12 21 12 21Z" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  );
}
function RupeeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
      <path d="M7 4h10M7 8h10M7 4c4 0 6.5 1.3 6.5 4S11 12 7 12h-.5L15 20" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}
