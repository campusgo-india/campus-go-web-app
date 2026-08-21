'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card } from '@campusgo/ui';
import { ListSkeleton } from '../../../../components/page-skeleton';
import { useConfirm } from '../../../../components/confirm-provider';
import {
  deleteSession,
  listSessions,
  updateSession,
  type SessionStatus,
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

export default function TrainingSessionsPage() {
  const confirm = useConfirm();
  const [items, setItems] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setItems(await listSessions());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(s: TrainingSession, status: SessionStatus) {
    try {
      await updateSession(s.id, { status });
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

  if (loading) return <ListSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-strong">Training sessions</h1>
          <p className="text-sm text-subtle">Workshops, GD practice, mock interviews.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/training">
            <Button variant="outline">Assessments</Button>
          </Link>
          <Link href="/training/batches">
            <Button variant="outline">Batches</Button>
          </Link>
          <Link href="/training/sessions/new">
            <Button>New session</Button>
          </Link>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {items.length === 0 ? (
        <Card className="space-y-2 p-6 text-center">
          <p className="text-sm text-subtle">No sessions scheduled yet.</p>
          <Link href="/training/sessions/new" className="text-sm font-medium text-primary-600">
            Schedule the first one →
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((s) => (
            <Card key={s.id} className="flex items-center justify-between p-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-strong">{s.title}</p>
                  <Badge tint={STATUS_TINT[s.status]}>{s.status}</Badge>
                </div>
                <p className="text-xs text-subtle">
                  {fmt(s.startsAt)} – {fmt(s.endsAt)}
                  {s.trainerName ? ` · ${s.trainerName}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {s.status !== 'COMPLETED' && (
                  <button
                    onClick={() => setStatus(s, 'COMPLETED')}
                    className="text-sm font-medium text-primary-600 hover:underline"
                  >
                    Mark complete
                  </button>
                )}
                <Link
                  href={`/training/sessions/${s.id}/attendance`}
                  className="text-sm font-medium text-primary-600 hover:underline"
                >
                  Attendance
                </Link>
                <button
                  onClick={() => onDelete(s)}
                  className="text-sm font-medium text-danger hover:underline"
                >
                  Delete
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
