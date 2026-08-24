'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge, SectionCard, StatTile } from '@campusgo/ui';
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
import { PageSkeleton, InlineSkeleton } from '../../../components/page-skeleton';

type MetricFormat = 'int' | 'pct' | 'ctc';

const TRACK_ROWS: { key: keyof PlacementTrack; label: string; fmt: MetricFormat }[] = [
  { key: 'finalYearStudents', label: 'Final-year students', fmt: 'int' },
  { key: 'placed', label: 'Placed', fmt: 'int' },
  { key: 'placementRate', label: 'Placement %', fmt: 'pct' },
  { key: 'offers', label: 'Offers extended', fmt: 'int' },
  { key: 'internships', label: 'Internships logged', fmt: 'int' },
  { key: 'ppos', label: 'PPOs converted', fmt: 'int' },
  { key: 'averageCtc', label: 'Average CTC', fmt: 'ctc' },
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

  if (!data) return <PageSkeleton />;

  const { overall, ug, pg } = data;

  return (
    <div className="space-y-8">
      <header className="rounded-2xl bg-gradient-primary p-6 text-white shadow-nav">
        <h1 className="text-2xl font-semibold">Placement Dashboard</h1>
        <p className="text-sm text-white/80">
          Season outcomes for {user?.college?.name ?? 'your college'} — undergraduate &amp;
          postgraduate combined
        </p>
      </header>

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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatTile label="Placement %" value={`${overall.placementRate.toFixed(1)}%`} />
        <StatTile label="Highest CTC" value={formatLpa(overall.highestCtc)} />
        <StatTile label="Average CTC" value={formatLpa(overall.averageCtc)} />
        <StatTile label="Internships" value={overall.internships.toLocaleString('en-IN')} />
        <StatTile label="PPOs" value={overall.ppos.toLocaleString('en-IN')} />
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
          Track comes from each school&apos;s Level, set in{' '}
          <Link href="/settings/courses" className="font-medium text-primary-600 hover:underline">
            Settings → Schools
          </Link>
          . A school with no level set counts as Undergraduate. CTC figures in lakhs per annum
          (LPA).
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
          Eligible = verified profile with a résumé on file. Attended / Shortlisted / Selected /
          Offered / Joined come from each student&apos;s application and interview-round history.
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
        {!drives ? <InlineSkeleton width="w-full" height="h-40" /> : <DrivesTable rows={drives} />}
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
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'selected', label: 'Selected' },
  { key: 'offered', label: 'Offered' },
  { key: 'joined', label: 'Joined' },
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

function DrivesTable({ rows }: { rows: ActiveDrive[] }) {
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
              <td className="px-4 py-3 text-body">{d.eligible}</td>
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
  { key: 'withoutResume', label: "Students without resume" },
  { key: 'incompleteProfile', label: "Students who haven't completed profile" },
  { key: 'eligibleNotApplying', label: 'Students eligible but not applying' },
  { key: 'noParticipation', label: 'Students with no placement participation' },
  { key: 'withoutInternship', label: 'Students without internship' },
  { key: 'pendingDocuments', label: 'Students with pending documents' },
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-card bg-card shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-strong">{label}</p>
            <p className="text-xs text-subtle">{data ? `${data.length} students` : 'Loading…'}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-subtle transition hover:bg-app hover:text-strong"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading || !data ? (
            <div className="p-5">
              <InlineSkeleton width="w-full" height="h-32" />
            </div>
          ) : data.length === 0 ? (
            <p className="p-5 text-sm text-subtle">No students in this list. 🎉</p>
          ) : (
            <ul>
              {data.map((s) => (
                <li key={s.id} className="border-b border-border last:border-0">
                  <Link
                    href={`/students/${s.id}`}
                    className="flex items-center justify-between px-5 py-3 text-sm hover:bg-app"
                  >
                    <span>
                      <span className="font-medium text-strong">{s.fullName}</span>
                      <span className="ml-2 text-xs text-subtle">{s.rollNumber}</span>
                    </span>
                    <span className="text-xs text-subtle">
                      {s.school} · {s.programme}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
