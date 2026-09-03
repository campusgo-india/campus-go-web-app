'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Badge, Card, SectionCard, StatTile } from '@campusgo/ui';
import { useSession } from '../../../lib/session';
import { useApi } from '../../../lib/use-api';
import {
  getActiveDrives,
  getPlacementDashboard,
  getPlacementFunnel,
  getProgrammeWisePlacement,
  getStudentsInAttentionCategory,
  getStudentsRequiringAttention,
  type ActiveDrive,
  type AttentionCounts,
  type AttentionStudent,
  type FunnelStages,
  type PlacementDashboard,
  type PlacementFunnel,
  type PlacementTrack,
  type ProgrammeWiseRow,
} from '../../../lib/analytics';
import { formatLpa } from '../../../lib/jobs';
import { listPendingResults, type PendingResult } from '../../../lib/rounds';
import { PageSkeleton, InlineSkeleton } from '../../../components/page-skeleton';
import { EligibleStudentsModal } from '../../../components/eligible-students-modal';

type MetricFormat = 'int' | 'pct' | 'ctc';

const TRACK_ROWS: { key: keyof PlacementTrack; label: string; fmt: MetricFormat }[] = [
  { key: 'finalYearStudents', label: 'Final-year students', fmt: 'int' },
  { key: 'placed', label: 'Placed', fmt: 'int' },
  { key: 'placementRate', label: 'Placement %', fmt: 'pct' },
  { key: 'offers', label: 'Offers extended', fmt: 'int' },
  { key: 'internships', label: 'Internships logged', fmt: 'int' },
  { key: 'ppos', label: 'PPOs converted', fmt: 'int' },
  { key: 'averageCtc', label: 'Average CTC', fmt: 'ctc' },
  { key: 'medianCtc', label: 'Median CTC', fmt: 'ctc' },
  { key: 'highestCtc', label: 'Highest CTC', fmt: 'ctc' },
];

function fmtVal(v: number | null, fmt: MetricFormat): string {
  if (v == null) return '—';
  if (fmt === 'pct') return `${v.toFixed(1)}%`;
  if (fmt === 'ctc') return formatLpa(v);
  return v.toLocaleString('en-IN');
}

/**
 * College-wide placement outcomes, split into Undergraduate / Postgraduate
 * tracks. Track comes from each School/Department's Level (set in
 * Settings → Schools) — a student whose school isn't tagged defaults to UG.
 */
export default function PlacementDashboardPage() {
  const { user, loading } = useSession();
  const ready = !loading && !!user;

  const { data } = useApi<PlacementDashboard>(
    ready ? '/analytics/placement-dashboard' : null,
    getPlacementDashboard,
  );
  const { data: funnel } = useApi<PlacementFunnel>(
    ready ? '/analytics/placement-funnel' : null,
    getPlacementFunnel,
  );
  const { data: programmes } = useApi<ProgrammeWiseRow[]>(
    ready ? '/analytics/programme-wise-placement' : null,
    getProgrammeWisePlacement,
  );
  const { data: drives } = useApi<ActiveDrive[]>(
    ready ? '/analytics/active-drives' : null,
    getActiveDrives,
  );
  const { data: attention } = useApi<AttentionCounts>(
    ready ? '/analytics/students-requiring-attention' : null,
    getStudentsRequiringAttention,
  );

  const [pending, setPending] = useState<PendingResult[]>([]);
  useEffect(() => {
    if (!ready) return;
    listPendingResults()
      .then(setPending)
      .catch(() => {});
  }, [ready]);

  // Drive whose "Eligible" number was clicked → shows the eligible-students popup.
  const [eligibleDrive, setEligibleDrive] = useState<{
    jobId: string;
    company: string;
    role: string;
  } | null>(null);

  if (!data) return <PageSkeleton />;

  const { overall, ug, pg } = data;

  return (
    <div className="space-y-8">
      {/* Rounds whose interview date has passed but results aren't entered yet */}
      {pending.length > 0 && (
        <Card className="space-y-2 border border-warning/40 bg-warning/5 p-4">
          <p className="text-sm font-semibold text-strong">
            ⚠ {pending.length} round result{pending.length === 1 ? '' : 's'} pending
          </p>
          <div className="space-y-1">
            {pending.map((p) => (
              <Link
                key={p.roundId}
                href={`/jobs/${p.jobId}/pipeline`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-white"
              >
                <span className="text-body">
                  <span className="font-medium text-strong">{p.jobTitle}</span> · {p.roundTitle}
                </span>
                <span className="text-xs text-warning">
                  due {p.scheduledAt ? new Date(p.scheduledAt).toLocaleDateString() : ''} · enter
                  results →
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          gradient="ocean"
          label="Final-year students"
          value={overall.finalYearStudents.toLocaleString('en-IN')}
          hint="across both tracks"
        />
        <StatTile
          gradient="sunset"
          label="Placed"
          value={overall.placed.toLocaleString('en-IN')}
          hint={`${overall.placementRate.toFixed(1)}% placement rate`}
        />
        <StatTile
          gradient="violet"
          label="Recruiting companies"
          value={overall.companies.toLocaleString('en-IN')}
          hint="this season"
        />
        <StatTile
          gradient="primary"
          label="Offers extended"
          value={overall.offers.toLocaleString('en-IN')}
          hint={`avg ${formatLpa(overall.averageCtc)}`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile size="sm" tint="lavender" label="Placement %" value={`${overall.placementRate.toFixed(1)}%`} />
        <StatTile size="sm" tint="cream" label="Highest CTC" value={formatLpa(overall.highestCtc)} />
        <StatTile size="sm" tint="mint" label="Average CTC" value={formatLpa(overall.averageCtc)} />
        <StatTile size="sm" tint="rose" label="Median CTC" value={formatLpa(overall.medianCtc)} />
        <StatTile size="sm" tint="lavender" label="Internships" value={overall.internships.toLocaleString('en-IN')} />
      </div>

      <SectionCard
        title="Undergraduate vs Postgraduate"
        subtitle="Season totals broken down by track"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TrackPanel tint="mint" name="Undergraduate" track={ug} other={pg} />
          <TrackPanel tint="cream" name="Postgraduate" track={pg} other={ug} />
        </div>
        <p className="mt-4 text-xs text-subtle">
          Track comes from each school&apos;s configured Level. A school with no level set counts
          as Undergraduate. CTC figures in lakhs per annum (LPA).
        </p>
      </SectionCard>

      <SectionCard title="Placement Progress" subtitle="Final-year students, stage by stage">
        {!funnel ? (
          <InlineSkeleton width="w-full" height="h-64" />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <FunnelChart label="Undergraduate" tint="mint" stages={funnel.ug} />
            <FunnelChart label="Postgraduate" tint="cream" stages={funnel.pg} />
          </div>
        )}
        <p className="mt-4 text-xs text-subtle">
          Eligible = verified profile with a résumé on file. Round 1/2/3 are cumulative — reaching
          Round 3 counts a student in Round 1 and 2 as well. Selected / Offered come from each
          student&apos;s application and interview-round history.
        </p>
      </SectionCard>

      <SectionCard title="Programme-wise Placement" subtitle="Every programme, ranked A–Z" flush>
        {!programmes ? (
          <InlineSkeleton width="w-full" height="h-40" />
        ) : (
          <ProgrammeTable rows={programmes} />
        )}
      </SectionCard>

      <SectionCard
        title="Active Placement Drives"
        subtitle="Published jobs, nearest interview first"
        flush
      >
        {!drives ? (
          <InlineSkeleton width="w-full" height="h-40" />
        ) : (
          <DrivesTable rows={drives} onEligible={setEligibleDrive} />
        )}
      </SectionCard>

      <SectionCard
        title="Students Requiring Attention"
        subtitle="Click a number to see the students"
      >
        {!attention ? (
          <InlineSkeleton width="w-full" height="h-24" />
        ) : (
          <AttentionGrid counts={attention} />
        )}
      </SectionCard>

      {eligibleDrive && (
        <EligibleStudentsModal
          jobId={eligibleDrive.jobId}
          title={`${eligibleDrive.company} — ${eligibleDrive.role}`}
          onClose={() => setEligibleDrive(null)}
        />
      )}
    </div>
  );
}

function TrackPanel({
  tint,
  name,
  track,
  other,
}: {
  tint: 'mint' | 'cream';
  name: string;
  track: PlacementTrack;
  /** The other track's numbers, so each row's bar is scaled against whichever track is larger. */
  other: PlacementTrack;
}) {
  const bg = tint === 'mint' ? 'bg-tint-mint' : 'bg-tint-cream';
  const fill = tint === 'mint' ? 'bg-tint-mint-fg' : 'bg-tint-cream-fg';

  return (
    <div className={`rounded-card border border-border p-4 ${bg}`}>
      <div className="mb-3 flex items-center justify-between">
        <Badge tint={tint}>{name}</Badge>
        <span className="text-xs font-medium text-body">
          {track.finalYearStudents.toLocaleString('en-IN')} students
        </span>
      </div>
      <div className="space-y-3">
        {TRACK_ROWS.map((row) => {
          const value = track[row.key] ?? 0;
          const otherValue = other[row.key] ?? 0;
          // Scaled against the larger of the two tracks so every metric stays
          // legible regardless of its absolute scale.
          const max = Math.max(value, otherValue, 1);
          const pct = Math.min(100, (value / max) * 100);
          return (
            <div key={row.key}>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-xs font-medium text-body">{row.label}</span>
                <span className="text-sm font-bold tabular-nums text-strong">
                  {fmtVal(track[row.key], row.fmt)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-pill bg-white/70">
                <div className={`h-full rounded-pill ${fill}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────── Placement Progress funnel ───────────────

const FUNNEL_STAGES: { key: keyof FunnelStages; label: string }[] = [
  { key: 'finalYearStudents', label: 'Final-year students' },
  { key: 'eligible', label: 'Eligible' },
  { key: 'applied', label: 'Applied' },
  { key: 'attended', label: 'Attended' },
  { key: 'round1', label: 'Round 1' },
  { key: 'round2', label: 'Round 2' },
  { key: 'round3', label: 'Round 3' },
  { key: 'selected', label: 'Selected' },
  { key: 'offered', label: 'Offered' },
];

function FunnelChart({
  label,
  tint,
  stages,
}: {
  label: string;
  tint: 'mint' | 'cream';
  stages: FunnelStages;
}) {
  const fill = tint === 'mint' ? 'bg-tint-mint-fg' : 'bg-tint-cream-fg';
  const bg = tint === 'mint' ? 'bg-tint-mint' : 'bg-tint-cream';
  const max = Math.max(stages.finalYearStudents, 1);

  return (
    <div className="space-y-2">
      <Badge tint={tint}>{label}</Badge>
      <div className="space-y-1.5 pt-1">
        {FUNNEL_STAGES.map((s) => {
          const value = stages[s.key];
          const pct = Math.max(4, Math.min(100, (value / max) * 100));
          return (
            <div key={s.key} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-xs font-medium text-body">{s.label}</span>
              <div className={`h-6 flex-1 overflow-hidden rounded-md ${bg}`}>
                <div
                  className={`flex h-full items-center rounded-md px-2 ${fill}`}
                  style={{ width: `${pct}%` }}
                >
                  <span className="text-xs font-bold tabular-nums text-white">{value}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────── Programme-wise placement table ───────────────

function ProgrammeTable({ rows }: { rows: ProgrammeWiseRow[] }) {
  if (rows.length === 0) {
    return <p className="p-5 text-sm text-subtle">No active students yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-app text-xs uppercase text-subtle">
          <tr>
            <th className="px-4 py-3 font-medium">Programme</th>
            <th className="px-4 py-3 font-medium">Students</th>
            <th className="px-4 py-3 font-medium">Eligible</th>
            <th className="px-4 py-3 font-medium">Placed</th>
            <th className="px-4 py-3 font-medium">Placement %</th>
            <th className="px-4 py-3 font-medium">Median CTC</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.programme} className="border-b border-border last:border-0">
              <td className="px-4 py-3 font-medium text-strong">{r.programme}</td>
              <td className="px-4 py-3 text-body">{r.students}</td>
              <td className="px-4 py-3 text-body">{r.eligible}</td>
              <td className="px-4 py-3 text-body">{r.placed}</td>
              <td className="px-4 py-3">
                <span
                  className={`font-medium ${r.placementRate >= 50 ? 'text-success' : 'text-warning'}`}
                >
                  {r.placementRate.toFixed(1)}%
                </span>
              </td>
              <td className="px-4 py-3 text-body">{formatLpa(r.medianCtc)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────── Active placement drives table ───────────────

function fmtInterviewDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function DrivesTable({
  rows,
  onEligible,
}: {
  rows: ActiveDrive[];
  onEligible: (d: { jobId: string; company: string; role: string }) => void;
}) {
  if (rows.length === 0) {
    return <p className="p-5 text-sm text-subtle">No published jobs right now.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-app text-xs uppercase text-subtle">
          <tr>
            <th className="px-4 py-3 font-medium">Company</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Eligible</th>
            <th className="px-4 py-3 font-medium">Applied</th>
            <th className="px-4 py-3 font-medium">Shortlisted</th>
            <th className="px-4 py-3 font-medium">Interview</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.jobId} className="border-b border-border last:border-0 hover:bg-app/60">
              <td className="px-4 py-3 font-medium text-strong">{d.company}</td>
              <td className="px-4 py-3 text-body">
                <Link href={`/jobs/${d.jobId}/pipeline`} className="hover:underline">
                  {d.role}
                </Link>
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onEligible({ jobId: d.jobId, company: d.company, role: d.role })}
                  className="font-medium text-primary-600 hover:underline"
                >
                  {d.eligible}
                </button>
              </td>
              <td className="px-4 py-3 text-body">{d.applied}</td>
              <td className="px-4 py-3 text-body">{d.shortlisted}</td>
              <td className="px-4 py-3 text-body">{fmtInterviewDate(d.nearestInterview)}</td>
              <td className="px-4 py-3">
                <Badge tint={d.status === 'Interviewing' ? 'lavender' : 'mint'}>{d.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────── Students requiring attention ───────────────

const ATTENTION_ITEMS: { key: keyof AttentionCounts; label: string }[] = [
  { key: 'withoutResume', label: 'Resume not uploaded yet' },
  { key: 'incompleteProfile', label: 'Profile still in progress' },
  { key: 'eligibleNotApplying', label: 'Eligible — not applying yet' },
  { key: 'noParticipation', label: 'Yet to join a drive' },
  { key: 'withoutInternship', label: 'No internship on record yet' },
  { key: 'pendingDocuments', label: 'Documents pending' },
];

function AttentionGrid({ counts }: { counts: AttentionCounts }) {
  const [open, setOpen] = useState<{ key: string; label: string } | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ATTENTION_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => setOpen({ key: item.key, label: item.label })}
            className="flex items-center justify-between rounded-card border border-border bg-app/60 px-4 py-3 text-left transition hover:border-primary-300 hover:bg-primary-50"
          >
            <span className="text-sm text-body">{item.label}</span>
            <span className="ml-3 shrink-0 text-lg font-bold tabular-nums text-strong">
              {counts[item.key]}
            </span>
          </button>
        ))}
      </div>
      {open && <AttentionModal category={open.key} label={open.label} onClose={() => setOpen(null)} />}
    </>
  );
}

function AttentionModal({
  category,
  label,
  onClose,
}: {
  category: string;
  label: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useApi<AttentionStudent[]>(
    `/analytics/students-requiring-attention/${category}`,
    () => getStudentsInAttentionCategory(category),
  );
  const [search, setSearch] = useState('');
  // Portal to <body> so the overlay is fixed to the viewport, not trapped by
  // the admin shell's page-transition wrapper (which has a transform).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, []);

  const filtered = (data ?? []).filter((s) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.rollNumber.toLowerCase().includes(q) ||
      s.programme.toLowerCase().includes(q)
    );
  });

  function download() {
    if (!data || data.length === 0) return;
    const header = ['Roll No', 'Name', 'School', 'Programme', 'Email', 'Phone'];
    const escape = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const rows = data.map((s) =>
      [s.rollNumber, s.fullName, s.school, s.programme, s.email, s.phone ?? '']
        .map((v) => escape(v))
        .join(','),
    );
    const csv = '﻿' + [header.join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const stamp = new Date()
      .toLocaleString('sv-SE', { hour12: false })
      .replace(' ', '_')
      .replace(/:/g, '-');
    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-card bg-card shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-strong">{label}</p>
            <p className="text-xs text-subtle">
              {data
                ? `${data.length} student${data.length === 1 ? '' : 's'}${
                    search.trim() ? ` · ${filtered.length} shown` : ''
                  }`
                : 'Loading…'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {data && data.length > 0 && (
              <button
                onClick={download}
                className="text-xs font-medium text-primary-600 hover:underline"
              >
                Download
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-md px-2 py-1 text-subtle transition hover:bg-app hover:text-strong"
            >
              ✕
            </button>
          </div>
        </div>

        {data && data.length > 5 && (
          <div className="border-b border-border px-5 py-3">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, roll no., or programme…"
              className="h-9 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400"
              autoFocus
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {isLoading || !data ? (
            <div className="p-5">
              <InlineSkeleton width="w-full" height="h-32" />
            </div>
          ) : data.length === 0 ? (
            <p className="p-5 text-sm text-subtle">No students in this list. 🎉</p>
          ) : filtered.length === 0 ? (
            <p className="p-5 text-sm text-subtle">No students match &ldquo;{search}&rdquo;.</p>
          ) : (
            <ul>
              {filtered.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border px-5 py-3 text-sm last:border-0 hover:bg-app"
                >
                  <div className="min-w-0">
                    <Link href={`/students/${s.id}`} className="font-medium text-strong hover:underline">
                      {s.fullName}
                    </Link>
                    <span className="ml-2 text-xs text-subtle">{s.rollNumber}</span>
                    <p className="text-xs text-subtle">
                      {s.school} · {s.programme}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs">
                    <a href={`mailto:${s.email}`} className="text-primary-600 hover:underline">
                      {s.email}
                    </a>
                    {s.phone && (
                      <a href={`tel:${s.phone}`} className="text-subtle hover:text-primary-600 hover:underline">
                        {s.phone}
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
