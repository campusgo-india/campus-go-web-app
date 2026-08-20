'use client';

import Link from 'next/link';
import { Badge, Card } from '@campusgo/ui';
import { ListSkeleton } from '../../../../../components/page-skeleton';
import { useApi } from '../../../../../lib/use-api';
import { listMySessions, type SessionStatus, type TrainingSession } from '../../../../../lib/training';

const STATUS_TINT: Record<SessionStatus, 'lavender' | 'cream' | 'mint' | 'rose'> = {
  SCHEDULED: 'lavender',
  ONGOING: 'cream',
  COMPLETED: 'mint',
  CANCELLED: 'rose',
};

const fmt = (d: string) =>
  new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export default function TrainingCalendarPage() {
  const { data, isLoading } = useApi<TrainingSession[]>('/me/training/sessions', listMySessions);

  if (isLoading || !data) return <ListSkeleton />;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-strong">Training calendar</h1>
          <p className="text-sm text-subtle">Every scheduled session.</p>
        </div>
        <Link href="/me/training" className="text-sm text-primary-600 hover:underline">
          Back
        </Link>
      </header>

      {data.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-subtle">No sessions scheduled yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((s) => (
            <Card key={s.id} className="space-y-1 p-4">
              <div className="flex items-start justify-between">
                <p className="font-semibold text-strong">{s.title}</p>
                <Badge tint={STATUS_TINT[s.status]}>{s.status}</Badge>
              </div>
              <p className="text-xs text-subtle">
                {fmt(s.startsAt)} – {fmt(s.endsAt)}
                {s.trainerName ? ` · ${s.trainerName}` : ''}
              </p>
              {s.myAttendance != null && (
                <p className="text-xs text-subtle">
                  Attendance: {s.myAttendance ? 'Present' : 'Absent'}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
