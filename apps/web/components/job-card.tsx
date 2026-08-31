'use client';

import { formatCtc, type Job } from '../lib/jobs';

// Soft pastel card background, picked deterministically per job — the
// reference app's "Day 1 Full Body" workout-card language (solid pastel
// tint, not a white card with a decorative outline).
type Tint = 'lavender' | 'mint' | 'cream' | 'rose';
const CARD_TINTS: Tint[] = ['lavender', 'mint', 'cream', 'rose'];
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
const hash = (s: string) => [...s].reduce((n, c) => n + c.charCodeAt(0), 0);

const jobTypeLabel = (t: string) =>
  t === 'FULL_TIME' ? 'Full time' : t === 'INTERNSHIP' ? 'Internship' : 'Internship + PPO';
const workModeLabel = (m: string | null) =>
  !m ? null : m === 'ONSITE' ? 'On-site' : m.charAt(0) + m.slice(1).toLowerCase();

function postedAgo(iso: string | null): string {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-body">{children}</span>
  );
}

/**
 * Job card — soft pastel surface (tint picked deterministically per job) with
 * a gradient monogram badge, matching the reference app's card language.
 * Fully clickable via `onOpen`; the `footer` slot (Apply / Details) is
 * isolated from that click.
 */
export function JobCard({
  job,
  onOpen,
  topRight,
  selection,
  footer,
  children,
  delay = 0,
  hideCtc = false,
}: {
  job: Job;
  onOpen?: () => void;
  topRight?: React.ReactNode;
  // Optional selection control (e.g. bulk-publish checkbox) rendered beside posted date.
  selection?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  delay?: number;
  // Officer/admin views hide CTC (not a key parameter for them); students see it.
  hideCtc?: boolean;
}) {
  const company = job.companyName ?? job.company?.name ?? 'Company';
  const tint = CARD_TINTS[hash(job.id) % CARD_TINTS.length]!;
  const deadline = job.applicationDeadline ? new Date(job.applicationDeadline) : null;
  const chips = [
    jobTypeLabel(job.jobType),
    workModeLabel(job.workMode),
    job.eligibleSchools?.[0],
  ].filter(Boolean) as string[];
  const meta = [
    job.location,
    deadline
      ? `apply by ${deadline.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const ctc = formatCtc(job.ctcMin, job.ctcMax);
  const ctcDisclosed = ctc !== 'Not disclosed';

  return (
    <div
      onClick={onOpen}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={onOpen ? (e) => (e.key === 'Enter' || e.key === ' ') && onOpen() : undefined}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      className={`animate-rise relative flex flex-col gap-4 overflow-hidden rounded-2xl p-5 shadow-card ${TINT_BG[tint]} ${
        onOpen
          ? 'press cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-400'
          : ''
      }`}
    >
      {/* posted pill + status/badge slot */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {selection}
          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-body">
            {job.publishedAt ? postedAgo(job.publishedAt) : postedAgo(job.createdAt)}
          </span>
        </div>
        {topRight}
      </div>

      {/* company + title + gradient monogram */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${TINT_FG[tint]}`}>
            {company}
          </p>
          <h3 className="mt-1 text-lg font-bold leading-snug text-strong">{job.title}</h3>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-lg font-bold text-white shadow-card">
          {company.trim().charAt(0).toUpperCase() || '·'}
        </span>
      </div>

      {/* chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <Chip key={c}>{c}</Chip>
          ))}
        </div>
      )}

      {children}

      {/* footer: pay + location + CTA (CTA isolated from the card click) */}
      <div className="mt-auto flex items-end justify-between gap-3 border-t border-white/50 pt-4">
        <div className="min-w-0">
          {hideCtc ? (
            meta && <p className="truncate text-sm text-subtle">{meta}</p>
          ) : (
            <>
              {ctcDisclosed ? (
                <p className="text-sm font-bold text-strong">{ctc}</p>
              ) : (
                <p className="text-sm font-medium text-subtle">CTC not disclosed</p>
              )}
              {meta && <p className="truncate text-xs text-subtle">{meta}</p>}
            </>
          )}
        </div>
        {footer && <div onClick={(e) => e.stopPropagation()}>{footer}</div>}
      </div>
    </div>
  );
}
