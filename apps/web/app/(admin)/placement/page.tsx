'use client';

import { Badge, SectionCard, StatTile } from '@campusgo/ui';
import { useSession } from '../../../lib/session';
import { useApi } from '../../../lib/use-api';
import { getPlacementDashboard, type PlacementDashboard, type PlacementTrack } from '../../../lib/analytics';
import { formatLpa } from '../../../lib/jobs';
import { PageSkeleton } from '../../../components/page-skeleton';

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
  const { data, isLoading } = useApi<PlacementDashboard>(
    loading || !user ? null : '/analytics/placement-dashboard',
    getPlacementDashboard,
  );

  if (isLoading || !data) return <PageSkeleton />;

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
          <a href="/settings/courses" className="font-medium text-primary-600 hover:underline">
            Settings → Schools
          </a>
          . A school with no level set counts as Undergraduate. CTC figures in lakhs per annum
          (LPA).
        </p>
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
