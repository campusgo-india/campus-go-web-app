'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card } from '@campusgo/ui';
import { PageSkeleton } from '../../../../components/page-skeleton';
import { RatingRow, RatingScaleLegend } from '../../../../components/rating-scale';
import {
  getMyFeedback,
  submitMyFeedback,
  PLACEMENT_STATUS_LABEL,
  type MyStudentFeedback,
  type PlacementStatus,
} from '../../../../lib/feedback';

const EMPTY_RATINGS = {
  placementOpportunities: 0,
  careerGuidance: 0,
  placementTraining: 0,
  communicationOfOpportunities: 0,
  placementCellSupport: 0,
  industryInteraction: 0,
  overallSupport: 0,
};

const RATING_QUESTIONS: Array<{ key: keyof typeof EMPTY_RATINGS; label: string }> = [
  { key: 'placementOpportunities', label: 'Quality of placement opportunities' },
  { key: 'careerGuidance', label: 'Career guidance provided by the institution' },
  { key: 'placementTraining', label: 'Training for placement preparation' },
  { key: 'communicationOfOpportunities', label: 'Communication regarding placement opportunities' },
  { key: 'placementCellSupport', label: 'Support provided by the Placement Cell' },
  { key: 'industryInteraction', label: 'Industry interaction and exposure' },
  { key: 'overallSupport', label: 'Overall placement support' },
];

const STATUS_OPTIONS: PlacementStatus[] = [
  'PLACED',
  'HIGHER_STUDIES',
  'ENTREPRENEURSHIP',
  'SEEKING_EMPLOYMENT',
  'OTHER',
];

const inputCls =
  'h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400';
const areaCls =
  'w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary-400';

export default function MyFeedbackPage() {
  const [data, setData] = useState<MyStudentFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyFeedback()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, []);

  if (error) return <p className="p-4 text-sm text-danger">{error}</p>;
  if (!data) return <PageSkeleton />;

  return (
    <div className="space-y-5 pb-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-strong">Placement Feedback</h1>
          <p className="text-sm text-subtle">Share how the placement season went for you.</p>
        </div>
        <Link href="/me/profile" className="text-sm text-primary-600 hover:underline">
          Back
        </Link>
      </header>

      {data.submitted && data.feedback ? (
        <Card className="space-y-3 p-6 text-center">
          <h2 className="text-lg font-semibold text-strong">Thanks for your feedback! 🎉</h2>
          <p className="text-sm text-subtle">
            Submitted {new Date(data.feedback.createdAt).toLocaleDateString()} for {data.feedback.academicYear}.
          </p>
        </Card>
      ) : !data.open ? (
        <Card className="space-y-2 p-6 text-center">
          <h2 className="text-lg font-semibold text-strong">Not open yet</h2>
          <p className="text-sm text-subtle">
            Your placement cell opens this survey at the end of the placement season. Check back later.
          </p>
        </Card>
      ) : (
        <FeedbackForm programme={data.programme} batch={data.batch} onDone={() => getMyFeedback().then(setData)} />
      )}
    </div>
  );
}

function FeedbackForm({
  programme,
  batch,
  onDone,
}: {
  programme: string;
  batch: number;
  onDone: () => void;
}) {
  const [academicYear, setAcademicYear] = useState('');
  const [placementStatus, setPlacementStatus] = useState<PlacementStatus | ''>('');
  const [ratings, setRatings] = useState({ ...EMPTY_RATINGS });
  const [suggestions, setSuggestions] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allRated = RATING_QUESTIONS.every((q) => ratings[q.key] > 0);
  const valid = academicYear.trim() && placementStatus && allRated;

  async function submit() {
    if (!valid || !placementStatus) return;
    setBusy(true);
    setError(null);
    try {
      await submitMyFeedback({
        academicYear: academicYear.trim(),
        placementStatus,
        ...ratings,
        suggestions: suggestions.trim() || undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit feedback');
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-5 p-5">
      <div className="space-y-3 rounded-md bg-app p-3">
        <p className="text-xs font-semibold uppercase text-subtle">Student details</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-subtle">Programme</p>
            <p className="font-medium text-strong">{programme}</p>
          </div>
          <div>
            <p className="text-xs text-subtle">Batch</p>
            <p className="font-medium text-strong">{batch}</p>
          </div>
        </div>
        <label className="space-y-1 block">
          <span className="text-xs font-medium text-subtle">Academic Year *</span>
          <input
            className={inputCls}
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            placeholder="2025-2026"
          />
        </label>
        <label className="space-y-1 block">
          <span className="text-xs font-medium text-subtle">Placement Status *</span>
          <select
            className={inputCls}
            value={placementStatus}
            onChange={(e) => setPlacementStatus(e.target.value as PlacementStatus)}
          >
            <option value="">Select…</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {PLACEMENT_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-strong">Please rate the following</p>
        <RatingScaleLegend />
        <div>
          {RATING_QUESTIONS.map((q) => (
            <RatingRow
              key={q.key}
              label={q.label}
              value={ratings[q.key]}
              onChange={(v) => setRatings((r) => ({ ...r, [q.key]: v }))}
            />
          ))}
        </div>
      </div>

      <label className="space-y-1 block">
        <span className="text-sm font-semibold text-strong">
          Suggestions for improving placement and career support
        </span>
        <textarea className={areaCls} rows={3} value={suggestions} onChange={(e) => setSuggestions(e.target.value)} />
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}
      <Button size="lg" className="w-full" onClick={submit} disabled={!valid || busy}>
        {busy ? 'Submitting…' : 'Submit feedback'}
      </Button>
    </Card>
  );
}
