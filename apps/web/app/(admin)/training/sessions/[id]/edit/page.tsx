'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@campusgo/ui';
import { ListSkeleton } from '../../../../../../components/page-skeleton';
import { TrainingTargetPicker } from '../../../../../../components/training-target-picker';
import {
  getSession,
  updateSession,
  PILLAR_LABEL,
  TRAINING_PILLARS,
} from '../../../../../../lib/training';

/** Formats an ISO datetime as the local `YYYY-MM-DDTHH:mm` value a datetime-local input expects. */
function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [pillar, setPillar] = useState<(typeof TRAINING_PILLARS)[number] | ''>('');
  const [trainerName, setTrainerName] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [targetProgrammes, setTargetProgrammes] = useState<string[]>([]);
  const [targetBatchIds, setTargetBatchIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSession(id)
      .then((s) => {
        setTitle(s.title);
        setPillar(s.pillar ?? '');
        setTrainerName(s.trainerName ?? '');
        setDescription(s.description ?? '');
        setStartsAt(toLocalInputValue(s.startsAt));
        setEndsAt(toLocalInputValue(s.endsAt));
        setTargetProgrammes(s.targetProgrammes);
        setTargetBatchIds(s.targetBatchIds);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load session'))
      .finally(() => setLoading(false));
  }, [id]);

  const inputCls =
    'h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400';

  async function onSubmit() {
    setError(null);
    if (!title.trim()) return setError('Title is required.');
    if (!startsAt || !endsAt) return setError('Start and end time are required.');
    if (new Date(endsAt) <= new Date(startsAt)) return setError('End time must be after start time.');

    setSaving(true);
    try {
      await updateSession(id, {
        title: title.trim(),
        pillar: pillar || undefined,
        trainerName: trainerName.trim() || undefined,
        description: description.trim() || undefined,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        targetProgrammes,
        targetBatchIds,
      });
      router.push('/training/sessions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update session');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <ListSkeleton />;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-strong">Edit session</h1>
        <Link href="/training/sessions" className="text-sm text-primary-600 hover:underline">
          Back to list
        </Link>
      </div>

      <Card className="space-y-4 p-6">
        <label className="space-y-1 block">
          <span className="text-xs font-medium text-subtle">Title *</span>
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1 block">
            <span className="text-xs font-medium text-subtle">Training Pillar (optional)</span>
            <select className={inputCls} value={pillar} onChange={(e) => setPillar(e.target.value as typeof pillar)}>
              <option value="">Other</option>
              {TRAINING_PILLARS.map((p) => (
                <option key={p} value={p}>
                  {PILLAR_LABEL[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 block">
            <span className="text-xs font-medium text-subtle">Trainer name</span>
            <input className={inputCls} value={trainerName} onChange={(e) => setTrainerName(e.target.value)} />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1 block">
            <span className="text-xs font-medium text-subtle">Starts at *</span>
            <input
              type="datetime-local"
              className={inputCls}
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </label>
          <label className="space-y-1 block">
            <span className="text-xs font-medium text-subtle">Ends at *</span>
            <input
              type="datetime-local"
              className={inputCls}
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </label>
        </div>

        <label className="space-y-1 block">
          <span className="text-xs font-medium text-subtle">Description</span>
          <textarea
            className="w-full rounded-md border border-border bg-white p-3 text-sm outline-none focus:border-primary-400"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <TrainingTargetPicker
          programmes={targetProgrammes}
          batchIds={targetBatchIds}
          onChangeProgrammes={setTargetProgrammes}
          onChangeBatchIds={setTargetBatchIds}
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button size="lg" onClick={onSubmit} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </Card>
    </div>
  );
}
