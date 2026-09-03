'use client';

import { Badge, ProgressBar, SectionCard, StatTile } from '@campusgo/ui';
import { PageSkeleton } from '../../../../components/page-skeleton';
import { TrainingTabs } from '../../../../components/training-tabs';
import { useSession } from '../../../../lib/session';
import { useApi } from '../../../../lib/use-api';
import {
  getOfficerTrainingDashboard,
  PILLAR_LABEL,
  type OfficerTrainingDashboard,
} from '../../../../lib/training';

// The "Readiness distribution" bands — aligned to the "Placement ready" ≥70%
// headcount so the two never disagree.
const BANDS = [
  { key: 'ready', label: 'Placement Ready', hint: '≥70%', tint: 'mint', fill: 'bg-tint-mint-fg' },
  { key: 'onTrack', label: 'On Track', hint: '50–69%', tint: 'lavender', fill: 'bg-tint-lavender-fg' },
  { key: 'building', label: 'Building Up', hint: '<50%', tint: 'rose', fill: 'bg-tint-rose-fg' },
] as const;

/**
 * Cohort-wide training analytics for the placement team — pre vs post-test
 * pillar averages, the readiness-tier distribution, and attendance across
 * recent sessions. A Placement Coordinator sees the same view scoped to their
 * assigned programmes.
 */
export default function TrainingDashboardPage() {
  const { user } = useSession();
  const canManage = user?.role === 'COLLEGE_ADMIN' || user?.role === 'PLACEMENT_OFFICER';
  const { data } = useApi<OfficerTrainingDashboard>('/training/dashboard', getOfficerTrainingDashboard);

  if (!data) return <PageSkeleton />;

  const { readiness, pillars, overallAttendancePct, sessions, assessments, studentCount } = data;
  const { bands } = readiness;
  const bandTotal = bands.ready + bands.onTrack + bands.building;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-strong">Training Dashboard</h1>
        <p className="text-sm text-subtle">
          {studentCount.toLocaleString('en-IN')} active students in scope
        </p>
      </header>

      {canManage && <TrainingTabs />}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          gradient="ocean"
          label="Average readiness"
          value={`${readiness.average}%`}
          hint={`${readiness.assessedCount} students assessed`}
        />
        <StatTile
          gradient="sunset"
          label="Overall attendance"
          value={`${overallAttendancePct}%`}
          hint="across recent sessions"
        />
        <StatTile
          gradient="violet"
          label="Placement ready"
          value={readiness.placementReadyCount.toLocaleString('en-IN')}
          hint={
            readiness.assessedCount
              ? `≥70% · of ${readiness.assessedCount} assessed`
              : 'no scores yet'
          }
        />
        <StatTile
          gradient="primary"
          label="Not yet assessed"
          value={readiness.notYetAssessedCount.toLocaleString('en-IN')}
          hint="no scores on file"
        />
      </div>

      <SectionCard
        title="Readiness distribution"
        subtitle="Every scored student, bucketed by their overall readiness index"
      >
        {bandTotal === 0 ? (
          <p className="text-sm text-subtle">No assessment scores recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {BANDS.map((b) => {
              const count = bands[b.key];
              return (
                <ProgressBar
                  key={b.key}
                  value={(count / bandTotal) * 100}
                  label={
                    <span className="flex items-center gap-2">
                      <Badge tint={b.tint}>{b.label}</Badge>
                      <span className="text-xs text-subtle">{b.hint}</span>
                    </span>
                  }
                  caption={`${count} student${count === 1 ? '' : 's'}`}
                  fillClassName={b.fill}
                />
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Pre vs post-test analysis"
        subtitle="Average score % per skill pillar, pooled across every scored assessment"
      >
        <div className="space-y-4">
          {pillars.map((p) => {
            // Percentage-point change from pre to post average — only shown
            // once both sides actually have data (nothing to compare otherwise).
            const improvement =
              p.prePct != null && p.postPct != null ? Math.round((p.postPct - p.prePct) * 10) / 10 : null;
            return (
              <div key={p.pillar}>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-sm font-medium text-body">{PILLAR_LABEL[p.pillar]}</p>
                  {improvement != null && (
                    <span
                      className={`text-xs font-semibold ${improvement >= 0 ? 'text-success' : 'text-danger'}`}
                    >
                      {improvement >= 0 ? '↑ +' : '↓ '}
                      {improvement} pts
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ProgressBar
                    value={p.prePct ?? 0}
                    label="Pre-test"
                    caption={p.prePct != null ? `${p.prePct}%` : 'No data'}
                    fillClassName="bg-tint-lavender-fg"
                  />
                  <ProgressBar
                    value={p.postPct ?? 0}
                    label="Post-test"
                    caption={p.postPct != null ? `${p.postPct}%` : 'No data'}
                    fillClassName="bg-tint-mint-fg"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Recent sessions" subtitle="Attendance %, most recent first" flush>
        {sessions.length === 0 ? (
          <p className="p-5 text-sm text-subtle">No sessions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-app text-xs uppercase text-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium">Session</th>
                  <th className="px-4 py-3 font-medium">Department/Batch</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-strong">{s.title}</td>
                    <td className={`px-4 py-3 ${s.audience === 'Everyone' ? 'text-subtle' : 'font-medium text-primary-600'}`}>
                      {s.audience}
                    </td>
                    <td className="px-4 py-3 text-body">
                      {new Date(s.startsAt).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tint={s.status === 'COMPLETED' ? 'mint' : 'lavender'}>{s.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-body">
                      {s.attendancePct != null ? `${s.attendancePct}% (${s.markedCount} marked)` : 'Not marked'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Recent assessments" subtitle="Average score %, most recent first" flush>
        {assessments.length === 0 ? (
          <p className="p-5 text-sm text-subtle">No assessments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-app text-xs uppercase text-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium">Assessment</th>
                  <th className="px-4 py-3 font-medium">Department/Batch</th>
                  <th className="px-4 py-3 font-medium">Pillar</th>
                  <th className="px-4 py-3 font-medium">Phase</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Average score</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-strong">{a.name}</td>
                    <td className={`px-4 py-3 ${a.audience === 'Everyone' ? 'text-subtle' : 'font-medium text-primary-600'}`}>
                      {a.audience}
                    </td>
                    <td className="px-4 py-3 text-body">{PILLAR_LABEL[a.pillar]}</td>
                    <td className="px-4 py-3">
                      <Badge tint={a.phase === 'PRE' ? 'lavender' : 'mint'}>{a.phase}</Badge>
                    </td>
                    <td className="px-4 py-3 text-body">
                      {a.scheduledAt
                        ? new Date(a.scheduledAt).toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : <span className="text-subtle">—</span>}
                    </td>
                    <td className="px-4 py-3 text-body">
                      {a.averagePct != null ? `${a.averagePct}% (${a.scoredCount} scored)` : 'Not scored'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
