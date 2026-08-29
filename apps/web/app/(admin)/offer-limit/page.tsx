'use client';

import { useEffect, useState } from 'react';
import { Button, Card } from '@campusgo/ui';
import { PageSkeleton } from '../../../components/page-skeleton';
import {
  getPlacementPolicy,
  getRestrictedStudents,
  setOfferLimit,
  type PlacementPolicy,
  type RestrictedStudent,
} from '../../../lib/placement-policy';

const PRESETS = [1, 2, 3];

export default function OfferLimitPage() {
  const [policy, setPolicy] = useState<PlacementPolicy | null>(null);
  const [students, setStudents] = useState<RestrictedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [p, r] = await Promise.all([getPlacementPolicy(), getRestrictedStudents()]);
      setPolicy(p);
      setStudents(r.students);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function apply(limit: number | null) {
    setSaving(true);
    setError(null);
    try {
      setPolicy(await setOfferLimit(limit));
      const r = await getRestrictedStudents();
      setStudents(r.students);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageSkeleton cardHeight={220} />;

  const limit = policy?.maxOffersAllowed ?? null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-strong">Offer Limit</h1>
        <p className="text-sm text-subtle">
          Once a student is Selected for this many jobs, they&apos;re automatically blocked from
          applying to any further openings.
        </p>
      </header>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Card className="max-w-xl space-y-4 p-5">
        <p className="text-sm font-semibold text-strong">Maximum offers before restriction</p>
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((n) => (
            <button
              key={n}
              onClick={() => apply(n)}
              disabled={saving}
              className={`rounded-pill px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${
                limit === n
                  ? 'bg-primary-600 text-white'
                  : 'bg-app text-body hover:bg-primary-50'
              }`}
            >
              {n} offer{n === 1 ? '' : 's'}
            </button>
          ))}
          <button
            onClick={() => apply(null)}
            disabled={saving}
            className={`rounded-pill px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${
              limit === null ? 'bg-primary-600 text-white' : 'bg-app text-body hover:bg-primary-50'
            }`}
          >
            No limit
          </button>
        </div>
        <p className="text-xs text-subtle">
          {limit == null
            ? 'No restriction is active — students may apply to as many jobs as they like regardless of offers already in hand.'
            : `Students are blocked from applying to new jobs once they've been Selected for ${limit} job${limit === 1 ? '' : 's'}.`}
        </p>
      </Card>

      <Card className="space-y-3 overflow-hidden p-0">
        <div className="flex items-center justify-between p-5 pb-0">
          <p className="text-sm font-semibold text-strong">
            Currently restricted {students.length > 0 ? `(${students.length})` : ''}
          </p>
          <Button variant="ghost" size="sm" onClick={load} loading={loading}>
            Refresh
          </Button>
        </div>
        {limit == null ? (
          <p className="p-5 text-sm text-subtle">Set a limit above to see who it affects.</p>
        ) : students.length === 0 ? (
          <p className="p-5 text-sm text-subtle">No student has reached the limit yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-app text-xs uppercase text-subtle">
                <tr>
                  <th className="px-5 py-3 font-medium">Roll No</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Programme</th>
                  <th className="px-4 py-3 font-medium">Offers</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 text-body">{s.rollNumber}</td>
                    <td className="px-4 py-3 font-medium text-strong">{s.fullName}</td>
                    <td className="px-4 py-3 text-body">{s.programme}</td>
                    <td className="px-4 py-3 text-body">{s.offerCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
