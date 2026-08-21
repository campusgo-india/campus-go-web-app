'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, SectionCard } from '@campusgo/ui';
import { useConfirm } from '../../../../components/confirm-provider';
import { createBatch, deleteBatch, listBatches, type TrainingBatch } from '../../../../lib/training';

export default function TrainingBatchesPage() {
  const confirm = useConfirm();
  const [batches, setBatches] = useState<TrainingBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setBatches(await listBatches());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load batches');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onDelete(b: TrainingBatch) {
    const ok = await confirm({
      title: `Delete "${b.name}"?`,
      message: 'This removes the batch and its membership list. Sessions/assessments that targeted it will stop showing to those students unless re-targeted.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteBatch(b.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete');
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-strong">Training batches</h1>
          <p className="text-sm text-subtle">
            Hand-picked groups of students you can target with sessions &amp; assessments,
            independent of school/programme/graduation year.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/training">
            <Button variant="outline">Assessments</Button>
          </Link>
          <Button onClick={() => setShowForm((s) => !s)} variant={showForm ? 'outline' : 'primary'}>
            {showForm ? 'Cancel' : 'New batch'}
          </Button>
        </div>
      </header>

      {showForm && (
        <NewBatchForm
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <SectionCard flush>
        {loading ? (
          <p className="p-5 text-sm text-subtle">Loading…</p>
        ) : batches.length === 0 ? (
          <p className="p-5 text-sm text-subtle">No batches yet.</p>
        ) : (
          <ul>
            {batches.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between border-b border-border p-5 last:border-0"
              >
                <div>
                  <p className="font-medium text-strong">{b.name}</p>
                  <p className="text-xs text-subtle">
                    {b.memberCount} student{b.memberCount === 1 ? '' : 's'}
                    {b.description ? ` · ${b.description}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/training/batches/${b.id}/members`}
                    className="text-sm font-medium text-primary-600 hover:underline"
                  >
                    Manage students
                  </Link>
                  <button
                    onClick={() => onDelete(b)}
                    className="text-sm font-medium text-danger hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

function NewBatchForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputCls =
    'h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400';

  async function submit() {
    setError(null);
    if (!name.trim()) {
      setError('Batch name is required.');
      return;
    }
    setSaving(true);
    try {
      await createBatch({ name: name.trim(), description: description.trim() || undefined });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create batch');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-3 p-5">
      <p className="text-sm font-semibold text-strong">New batch</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="space-y-1 block">
          <span className="text-xs font-medium text-subtle">Name *</span>
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Placement Prep — Aug"
          />
        </label>
        <label className="space-y-1 block">
          <span className="text-xs font-medium text-subtle">Description</span>
          <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button onClick={submit} disabled={saving}>
        {saving ? 'Creating…' : 'Create batch'}
      </Button>
    </Card>
  );
}
