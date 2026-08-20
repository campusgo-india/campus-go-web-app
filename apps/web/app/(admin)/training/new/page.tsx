'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@campusgo/ui';
import { createAssessment, PILLAR_LABEL, TRAINING_PILLARS } from '../../../../lib/training';

export default function NewAssessmentPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [pillar, setPillar] = useState<(typeof TRAINING_PILLARS)[number]>('APTITUDE_REASONING');
  const [phase, setPhase] = useState<'PRE' | 'POST'>('PRE');
  const [externalUrl, setExternalUrl] = useState('');
  const [maxMarks, setMaxMarks] = useState('100');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputCls =
    'h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400';

  async function onSubmit() {
    setError(null);
    if (!name.trim()) return setError('Name is required.');
    if (!externalUrl.trim()) return setError('External test link is required.');
    const marks = Number(maxMarks);
    if (!Number.isFinite(marks) || marks <= 0) return setError('Max marks must be a positive number.');

    setLoading(true);
    try {
      await createAssessment({ name: name.trim(), pillar, phase, externalUrl: externalUrl.trim(), maxMarks: marks });
      router.push('/training');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create assessment');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-strong">New assessment</h1>
        <Link href="/training" className="text-sm text-primary-600 hover:underline">
          Back to list
        </Link>
      </div>

      <Card className="space-y-4 p-6">
        <label className="space-y-1 block">
          <span className="text-xs font-medium text-subtle">Test name *</span>
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Quantitative Aptitude — Pre-test"
          />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1 block">
            <span className="text-xs font-medium text-subtle">Skill pillar *</span>
            <select className={inputCls} value={pillar} onChange={(e) => setPillar(e.target.value as typeof pillar)}>
              {TRAINING_PILLARS.map((p) => (
                <option key={p} value={p}>
                  {PILLAR_LABEL[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 block">
            <span className="text-xs font-medium text-subtle">Pre or post test *</span>
            <select className={inputCls} value={phase} onChange={(e) => setPhase(e.target.value as 'PRE' | 'POST')}>
              <option value="PRE">Pre-test</option>
              <option value="POST">Post-test</option>
            </select>
          </label>
        </div>

        <label className="space-y-1 block">
          <span className="text-xs font-medium text-subtle">External test link *</span>
          <input
            className={inputCls}
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder="https://forms.example.com/test-123"
          />
        </label>

        <label className="space-y-1 block">
          <span className="text-xs font-medium text-subtle">Max marks *</span>
          <input
            type="number"
            min="1"
            className={inputCls}
            value={maxMarks}
            onChange={(e) => setMaxMarks(e.target.value)}
          />
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button size="lg" onClick={onSubmit} disabled={loading}>
          {loading ? 'Creating…' : 'Create assessment'}
        </Button>
      </Card>
    </div>
  );
}
