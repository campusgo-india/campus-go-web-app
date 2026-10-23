'use client';

import { Badge, Card } from '@campusgo/ui';
import { getStudentActivity, type StudentActivity } from '../lib/students';
import { PILLAR_LABEL } from '../lib/training';
import { useApi } from '../lib/use-api';

const STATUS_TINT: Record<string, 'mint' | 'rose' | 'cream' | 'lavender'> = {
  SELECTED: 'mint',
  REJECTED: 'rose',
  WITHDRAWN: 'rose',
  IN_PROGRESS: 'lavender',
  APPLIED: 'cream',
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const pct = (v: number | null) => (v == null ? '—' : `${v}%`);

/**
 * A student's placement applications and training record in one place — for
 * counselling and review meetings, so officers don't have to piece it together
 * from the jobs and training screens.
 */
export function StudentActivityPanel({ studentId }: { studentId: string }) {
  const { data, error, isLoading } = useApi<StudentActivity>(
    `/students/${studentId}/activity`,
    () => getStudentActivity(studentId),
  );

  if (isLoading) {
    return <Card className="p-6 text-sm text-subtle">Loading placement and training record…</Card>;
  }
  if (error || !data) {
    return (
      <Card className="p-6 text-sm text-danger">
        {error?.message ?? 'Could not load the placement and training record.'}
      </Card>
    );
  }

  const { placement, training } = data;
  const selected = placement.applications.filter((a) => a.status === 'SELECTED').length;

  return (
    <>
      <Card className="space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-strong">Placement history</h2>
          <p className="text-xs text-subtle">
            {placement.applications.length} applied · {selected} selected
          </p>
        </div>
        {placement.applications.length === 0 ? (
          <p className="text-sm text-subtle">Has not applied to any job yet.</p>
        ) : (
          <div className="space-y-3">
            {placement.applications.map((a) => (
              <div key={a.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-strong">{a.company}</p>
                    <p className="text-xs text-subtle">
                      {a.jobTitle} · applied {fmtDate(a.appliedAt)}
                    </p>
                  </div>
                  <Badge tint={STATUS_TINT[a.status] ?? 'cream'}>{a.status.replace('_', ' ')}</Badge>
                </div>
                {a.rounds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {a.rounds.map((r) => (
                      <span
                        key={r.seq}
                        className="rounded-md bg-app px-2 py-0.5 text-xs text-body"
                        title={r.attended === false ? 'No-show' : undefined}
                      >
                        {r.title}:{' '}
                        {r.outcome === 'ADVANCED'
                          ? 'advanced'
                          : r.outcome === 'REJECTED'
                            ? 'rejected'
                            : 'pending'}
                        {r.attended === false ? ' (no-show)' : ''}
                      </span>
                    ))}
                  </div>
                )}
                {a.status === 'SELECTED' && (
                  <p className="mt-2 text-xs text-body">
                    Offer letter {a.hasOfferLetter ? 'uploaded' : 'not uploaded yet'}
                    {a.offerCtc != null ? ` · CTC ₹${(a.offerCtc / 100000).toFixed(2)} LPA` : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-strong">Training record</h2>
          <p className="text-xs text-subtle">
            Attendance {pct(training.attendancePct)} · Avg score {pct(training.scorePct)}
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-subtle">Sessions</p>
          {training.attendance.length === 0 ? (
            <p className="text-sm text-subtle">No attendance recorded yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {training.attendance.map((a) => (
                <li key={a.sessionId} className="flex items-center justify-between gap-2 px-3 py-2">
                  <div>
                    <p className="text-sm text-strong">{a.title}</p>
                    <p className="text-xs text-subtle">
                      {fmtDate(a.startsAt)}
                      {a.pillar ? ` · ${PILLAR_LABEL[a.pillar as keyof typeof PILLAR_LABEL] ?? a.pillar}` : ''}
                    </p>
                  </div>
                  <Badge tint={a.present ? 'mint' : 'rose'}>{a.present ? 'Present' : 'Absent'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-subtle">Assessments</p>
          {training.scores.length === 0 ? (
            <p className="text-sm text-subtle">No scores recorded yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {training.scores.map((s) => (
                <li key={s.assessmentId} className="flex items-center justify-between gap-2 px-3 py-2">
                  <div>
                    <p className="text-sm text-strong">{s.name}</p>
                    <p className="text-xs text-subtle">
                      {PILLAR_LABEL[s.pillar as keyof typeof PILLAR_LABEL] ?? s.pillar}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-strong">
                    {s.marksObtained} / {s.maxMarks}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </>
  );
}
