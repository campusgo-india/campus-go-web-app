'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, StatTile } from '@campusgo/ui';
import { ListSkeleton } from '../../../../components/page-skeleton';
import { getFeedbackAnalytics, type FeedbackAnalytics } from '../../../../lib/training';

export default function TrainingFeedbackPage() {
  const [data, setData] = useState<FeedbackAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFeedbackAnalytics()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ListSkeleton />;

  const overall = data && data.trainers.length
    ? Math.round(
        (data.trainers.reduce((a, t) => a + (t.avgRating ?? 0), 0) / data.trainers.length) * 10,
      ) / 10
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-strong">Feedback &amp; trainer ratings</h1>
        <Link href="/training" className="text-sm text-primary-600 hover:underline">
          Back to assessments
        </Link>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="Overall trainer rating"
          value={overall != null ? `${overall} / 5.0` : '—'}
          gradient="primary"
        />
        <StatTile label="Sessions rated" value={data?.sessions.length ?? 0} />
        <StatTile label="Trainers" value={data?.trainers.length ?? 0} />
      </div>

      {data && data.trainers.length > 0 && (
        <Card className="space-y-3 p-5">
          <p className="text-sm font-semibold text-strong">By trainer</p>
          <div className="space-y-2">
            {data.trainers.map((t) => (
              <div key={t.trainerName} className="flex items-center justify-between text-sm">
                <span className="text-body">{t.trainerName}</span>
                <span className="font-medium text-strong">{t.avgRating ?? '—'} / 5.0</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase text-subtle">
                <th className="px-4 py-3">Session</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Trainer</th>
                <th className="px-4 py-3">Responses</th>
                <th className="px-4 py-3">Content</th>
                <th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3">Relevance</th>
                <th className="px-4 py-3">Overall</th>
              </tr>
            </thead>
            <tbody>
              {(data?.sessions ?? []).map((s) => (
                <tr key={s.sessionId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-strong">{s.title}</td>
                  <td className="px-4 py-3 text-body">
                    {new Date(s.startsAt).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 text-body">{s.trainerName ?? '—'}</td>
                  <td className="px-4 py-3 text-body">{s.responseCount}</td>
                  <td className="px-4 py-3 text-body">{s.avgContentQuality ?? '—'}</td>
                  <td className="px-4 py-3 text-body">{s.avgTrainerDelivery ?? '—'}</td>
                  <td className="px-4 py-3 text-body">{s.avgRelevance ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold text-strong">{s.avgOverall ?? '—'}</td>
                </tr>
              ))}
              {data && data.sessions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-subtle">
                    No feedback submitted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
