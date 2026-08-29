'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card } from '@campusgo/ui';
import { ListSkeleton } from '../../../components/page-skeleton';
import { TrainingTabs } from '../../../components/training-tabs';
import { useConfirm } from '../../../components/confirm-provider';
import {
  deleteAssessment,
  listAssessments,
  listBatches,
  PILLAR_COMPONENTS,
  PILLAR_LABEL,
  TRAINING_PILLARS,
  updateAssessment,
  type Assessment,
  type TrainingBatch,
} from '../../../lib/training';

const PHASE_TINT: Record<string, 'lavender' | 'mint'> = { PRE: 'lavender', POST: 'mint' };

export default function TrainingAssessmentsPage() {
  const confirm = useConfirm();
  const [items, setItems] = useState<Assessment[]>([]);
  const [batches, setBatches] = useState<TrainingBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [assessments, batchList] = await Promise.all([listAssessments(), listBatches()]);
      setItems(assessments);
      setBatches(batchList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Human-readable summary of who an assessment is visible to, so an officer
  // isn't left guessing why it didn't show up for a particular student.
  function audienceSummary(a: Assessment): string {
    if (a.targetProgrammes.length === 0 && a.targetBatchIds.length === 0) return 'Everyone';
    const batchNames = a.targetBatchIds
      .map((id) => batches.find((b) => b.id === id)?.name ?? 'Unknown batch')
      .join(', ');
    return [...a.targetProgrammes, ...(batchNames ? [batchNames] : [])].join(' · ');
  }

  async function toggleActive(a: Assessment) {
    try {
      await updateAssessment(a.id, { isActive: !a.isActive });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update');
    }
  }

  async function onDelete(a: Assessment) {
    const ok = await confirm({
      title: 'Delete this assessment?',
      message: `"${a.name}" and every score recorded against it will be permanently removed.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteAssessment(a.id);
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
          <h1 className="text-2xl font-semibold text-strong">Training &amp; Assessments</h1>
          <p className="text-sm text-subtle">Pre/post assessments mapped to the 4 core skill pillars.</p>
        </div>
        <Link href="/training/new">
          <Button>New assessment</Button>
        </Link>
      </div>

      <TrainingTabs />

      <Card className="space-y-4 p-5">
        <p className="text-sm font-semibold text-strong">Student Readiness Framework</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TRAINING_PILLARS.map((p) => (
            <div key={p} className="space-y-1">
              <p className="text-xs font-semibold text-primary-600">{PILLAR_LABEL[p]}</p>
              <ul className="space-y-0.5 text-xs text-subtle">
                {PILLAR_COMPONENTS[p].map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="space-y-2 border-t border-border pt-3">
          <div>
            <p className="text-xs font-semibold text-strong">How it works:</p>
            <p className="text-xs text-subtle">
              Every training session and assessment is mapped to one of these pillars.
              Assessments contribute to the student&apos;s readiness score based on the pillar
              they evaluate.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-strong">Overall Readiness Score:</p>
            <p className="text-xs text-subtle">Average of the four core skill pillar scores.</p>
          </div>
        </div>
      </Card>

      {error && <p className="text-sm text-danger">{error}</p>}

      {items.length === 0 ? (
        <Card className="space-y-2 p-6 text-center">
          <p className="text-sm text-subtle">No assessments yet.</p>
          <Link href="/training/new" className="text-sm font-medium text-primary-600">
            Create the first one →
          </Link>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-card border border-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-app text-xs uppercase text-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Pillar</th>
                <th className="px-4 py-3 font-medium">Phase</th>
                <th className="px-4 py-3 font-medium">Max marks</th>
                <th className="px-4 py-3 font-medium">Scheduled</th>
                <th className="px-4 py-3 font-medium">Visible to</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-app/60">
                  <td className="px-4 py-3 font-medium text-strong">{a.name}</td>
                  <td className="px-4 py-3 text-body">{PILLAR_LABEL[a.pillar]}</td>
                  <td className="px-4 py-3">
                    <Badge tint={PHASE_TINT[a.phase]}>{a.phase}</Badge>
                  </td>
                  <td className="px-4 py-3 text-body">{a.maxMarks}</td>
                  <td className="px-4 py-3 text-body">
                    {a.scheduledAt
                      ? new Date(a.scheduledAt).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : <span className="text-subtle">—</span>}
                  </td>
                  <td
                    className={`px-4 py-3 ${
                      a.targetProgrammes.length === 0 && a.targetBatchIds.length === 0
                        ? 'text-subtle'
                        : 'font-medium text-primary-600'
                    }`}
                  >
                    {audienceSummary(a)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {!a.isActive && (
                        <span className="text-xs font-medium text-subtle">Hidden</span>
                      )}
                      <button
                        onClick={() => toggleActive(a)}
                        className="text-xs font-medium text-primary-600 hover:underline"
                      >
                        {a.isActive ? 'Hide' : 'Show'}
                      </button>
                      <Link
                        href={`/training/${a.id}/scores`}
                        className="text-sm font-medium text-primary-600 hover:underline"
                      >
                        Scores
                      </Link>
                      <button
                        onClick={() => onDelete(a)}
                        className="text-sm font-medium text-danger hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
