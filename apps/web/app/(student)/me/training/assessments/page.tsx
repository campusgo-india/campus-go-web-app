'use client';

import Link from 'next/link';
import { Badge, Card } from '@campusgo/ui';
import { ListSkeleton } from '../../../../../components/page-skeleton';
import { useApi } from '../../../../../lib/use-api';
import { getMyAssessments, PILLAR_LABEL, type Assessment } from '../../../../../lib/training';

const PHASE_TINT: Record<string, 'lavender' | 'mint'> = { PRE: 'lavender', POST: 'mint' };

export default function MyAssessmentsPage() {
  const { data, isLoading } = useApi<Assessment[]>('/me/training/assessments', getMyAssessments);

  if (isLoading || !data) return <ListSkeleton />;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-strong">Assessments</h1>
          <p className="text-sm text-subtle">Pre/post tests across the 4 skill pillars.</p>
        </div>
        <Link href="/me/training" className="text-sm text-primary-600 hover:underline">
          Back
        </Link>
      </header>

      {data.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-subtle">No assessments available yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((a) => (
            <Card key={a.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-strong">{a.name}</p>
                  <p className="text-xs text-subtle">{PILLAR_LABEL[a.pillar]}</p>
                </div>
                <Badge tint={PHASE_TINT[a.phase]}>{a.phase}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-subtle">
                  {a.myScore != null ? `Score: ${a.myScore} / ${a.maxMarks}` : 'Not attempted yet'}
                </p>
                <a
                  href={a.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-primary-600 hover:underline"
                >
                  Take Assessment ↗
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
