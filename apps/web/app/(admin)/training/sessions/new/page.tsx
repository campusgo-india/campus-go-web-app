'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@campusgo/ui';
import { TrainingTargetPicker } from '../../../../../components/training-target-picker';
import { createSession, PILLAR_LABEL, TRAINING_PILLARS } from '../../../../../lib/training';

/** Formats a Date as the local `YYYY-MM-DDTHH:mm` value a datetime-local input expects. */
function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NewSessionPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [pillar, setPillar] = useState<(typeof TRAINING_PILLARS)[number] | ''>('');
  const [trainerName, setTrainerName] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [durationHours, setDurationHours] = useState('');

  // Convenience: typing a duration auto-fills the end time from the start
  // time, so officers don't have to do the arithmetic themselves — the end
  // time can still be hand-edited afterwards if the session ran long/short.
  function onDurationChange(v: string) {
    setDurationHours(v);
    const hours = Number(v);
    if (!startsAt || !v.trim() || !Number.isFinite(hours) || hours <= 0) return;
    const start = new Date(startsAt);
    const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
    setEndsAt(toLocalInputValue(end));
  }

  function onStartsAtChange(v: string) {
    setStartsAt(v);
    const hours = Number(durationHours);
    if (!v || !durationHours.trim() || !Number.isFinite(hours) || hours <= 0) return;
    const start = new Date(v);
    const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
    setEndsAt(toLocalInputValue(end));
  }
  const [targetProgrammes, setTargetProgrammes] = useState<string[]>([]);
  const [targetBatchIds, setTargetBatchIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputCls =
    'h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400';

  async function onSubmit() {
    setError(null);
    if (!title.trim()) return setError('Title is required.');
    if (!startsAt || !endsAt) return setError('Start and end time are required.');
    if (new Date(endsAt) <= new Date(startsAt)) return setError('End time must be after start time.');

    setLoading(true);
    try {
      await createSession({
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
      setError(err instanceof Error ? err.message : 'Could not create session');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-strong">New training session</h1>
        <Link href="/training/sessions" className="text-sm text-primary-600 hover:underline">
          Back to list
        </Link>
      </div>

      <Card className="space-y-4 p-6">
        <label className="space-y-1 block">
          <span className="text-xs font-medium text-subtle">Title *</span>
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Power BI Workshop" />
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
              onChange={(e) => onStartsAtChange(e.target.value)}
            />
          </label>
          <label className="space-y-1 block">
            <span className="text-xs font-medium text-subtle">Duration in hours</span>
            <input
              type="number"
              min="0"
              step="0.5"
              className={inputCls}
              value={durationHours}
              onChange={(e) => onDurationChange(e.target.value)}
              placeholder="e.g. 2"
            />
          </label>
        </div>

        <label className="space-y-1 block">
          <span className="text-xs font-medium text-subtle">Ends at *</span>
          <input
            type="datetime-local"
            className={inputCls}
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
          <span className="block text-xs text-subtle">
            Auto-filled from the duration above — adjust by hand if the session ran long or short.
          </span>
        </label>

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

        <Button size="lg" onClick={onSubmit} disabled={loading}>
          {loading ? 'Creating…' : 'Create session'}
        </Button>
      </Card>
    </div>
  );
}
