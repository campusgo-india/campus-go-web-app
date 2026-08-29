'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, cn } from '@campusgo/ui';
import { ListSkeleton } from '../../../../components/page-skeleton';
import { TrainingTabs } from '../../../../components/training-tabs';
import { useConfirm } from '../../../../components/confirm-provider';
import {
  deleteSession,
  listBatches,
  listSessions,
  updateSession,
  type SessionStatus,
  type TrainingBatch,
  type TrainingSession,
} from '../../../../lib/training';

const STATUS_TINT: Record<SessionStatus, 'lavender' | 'cream' | 'mint' | 'rose'> = {
  SCHEDULED: 'lavender',
  ONGOING: 'cream',
  COMPLETED: 'mint',
  CANCELLED: 'rose',
};

const fmt = (d: string) =>
  new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

type Filter = 'upcoming' | 'completed' | 'cancelled' | 'all';

export default function TrainingSessionsPage() {
  const confirm = useConfirm();
  const [items, setItems] = useState<TrainingSession[]>([]);
  const [batches, setBatches] = useState<TrainingBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('upcoming');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [sessions, batchList] = await Promise.all([listSessions(), listBatches()]);
      setItems(sessions);
      setBatches(batchList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Human-readable summary of who a session is visible to, so an officer
  // isn't left guessing why it didn't show up for a particular student.
  function audienceSummary(s: TrainingSession): string {
    if (s.targetProgrammes.length === 0 && s.targetBatchIds.length === 0) {
      return 'Everyone';
    }
    const batchNames = s.targetBatchIds
      .map((id) => batches.find((b) => b.id === id)?.name ?? 'Unknown batch')
      .join(', ');
    return [...s.targetProgrammes, ...(batchNames ? [batchNames] : [])].join(' · ');
  }

  async function markComplete(s: TrainingSession) {
    try {
      await updateSession(s.id, { status: 'COMPLETED' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update status');
    }
  }

  async function onDelete(s: TrainingSession) {
    const ok = await confirm({
      title: 'Delete this session?',
      message: `"${s.title}" and its attendance/feedback records will be permanently removed.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteSession(s.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete');
    }
  }

  const groups = useMemo(
    () => ({
      upcoming: items.filter((s) => s.status === 'SCHEDULED' || s.status === 'ONGOING'),
      completed: items.filter((s) => s.status === 'COMPLETED'),
      cancelled: items.filter((s) => s.status === 'CANCELLED'),
    }),
    [items],
  );

  const visible = filter === 'all' ? items : groups[filter];

  const FILTERS: Array<{ key: Filter; label: string; count: number }> = [
    { key: 'upcoming', label: 'Upcoming', count: groups.upcoming.length },
    { key: 'completed', label: 'Completed', count: groups.completed.length },
    { key: 'cancelled', label: 'Cancelled', count: groups.cancelled.length },
    { key: 'all', label: 'All', count: items.length },
  ];

  if (loading) return <ListSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-strong">Training sessions</h1>
          <p className="text-sm text-subtle">Workshops, GD practice, mock interviews.</p>
        </div>
        <Link href="/training/sessions/new">
          <Button>New session</Button>
        </Link>
      </div>

      <TrainingTabs />

      {error && <p className="text-sm text-danger">{error}</p>}

      {items.length === 0 ? (
        <Card className="space-y-2 p-6 text-center">
          <p className="text-sm text-subtle">No sessions scheduled yet.</p>
          <Link href="/training/sessions/new" className="text-sm font-medium text-primary-600">
            Schedule the first one →
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'rounded-pill px-3 py-1.5 text-xs font-medium transition',
                  filter === f.key ? 'bg-primary-600 text-white' : 'bg-app text-subtle hover:bg-primary-50',
                )}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-sm text-subtle">No sessions in this view.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {visible.map((s) => {
                const attendanceMarked = (s.attendanceMarkedCount ?? 0) > 0;
                return (
                  <Card key={s.id} className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-strong">{s.title}</p>
                        <Badge tint={STATUS_TINT[s.status]}>{s.status}</Badge>
                      </div>
                      <p className="text-xs text-subtle">
                        {fmt(s.startsAt)} – {fmt(s.endsAt)}
                        {s.trainerName ? ` · ${s.trainerName}` : ''}
                      </p>
                      <p className="text-xs text-subtle">
                        Visible to:{' '}
                        <span
                          className={
                            s.targetProgrammes.length === 0 && s.targetBatchIds.length === 0
                              ? ''
                              : 'font-medium text-primary-600'
                          }
                        >
                          {audienceSummary(s)}
                        </span>
                        {s.status !== 'CANCELLED' && (
                          <>
                            {' · '}
                            {attendanceMarked
                              ? `Attendance marked (${s.attendanceMarkedCount})`
                              : 'Attendance not marked yet'}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Link
                        href={`/training/sessions/${s.id}/attendance`}
                        className="text-sm font-medium text-primary-600 hover:underline"
                      >
                        Attendance
                      </Link>
                      {s.status !== 'COMPLETED' && s.status !== 'CANCELLED' && (
                        <button
                          onClick={() => markComplete(s)}
                          disabled={!attendanceMarked}
                          title={attendanceMarked ? undefined : 'Mark attendance before completing this session'}
                          className={cn(
                            'text-sm font-medium',
                            attendanceMarked
                              ? 'text-primary-600 hover:underline'
                              : 'cursor-not-allowed text-subtle/60',
                          )}
                        >
                          Mark complete
                        </button>
                      )}
                      <Link
                        href={`/training/sessions/${s.id}/edit`}
                        className="text-sm font-medium text-primary-600 hover:underline"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => onDelete(s)}
                        className="text-sm font-medium text-danger hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
