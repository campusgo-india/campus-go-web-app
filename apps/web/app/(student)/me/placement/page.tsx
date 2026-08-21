'use client';

import Link from 'next/link';
import { Badge, Card, ProgressBar, StatTile } from '@campusgo/ui';
import { ListSkeleton } from '../../../../components/page-skeleton';
import { useApi } from '../../../../lib/use-api';
import { listMyApplications, type Application } from '../../../../lib/applications';

const TERMINAL = ['REJECTED', 'WITHDRAWN'];
const STATUS_LABEL: Record<string, string> = {
  APPLIED: 'Applied',
  IN_PROGRESS: 'In progress',
  SELECTED: 'Selected',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};
const STATUS_TINT: Record<string, 'lavender' | 'mint' | 'cream' | 'rose'> = {
  APPLIED: 'cream',
  IN_PROGRESS: 'lavender',
  SELECTED: 'mint',
  REJECTED: 'rose',
  WITHDRAWN: 'rose',
};

export default function MyPlacementDashboardPage() {
  const { data: apps, isLoading } = useApi<Application[]>('/me/applications', listMyApplications);

  if (isLoading || !apps) return <ListSkeleton />;

  const active = apps.filter((a) => !TERMINAL.includes(a.status));
  const offers = apps.filter((a) => a.status === 'SELECTED' || a.offerCtc != null);
  const interviewsScheduled = apps.reduce(
    (n, a) => n + a.interviews.filter((r) => r.result === 'PENDING' && r.scheduledAt).length,
    0,
  );
  const bestOfferCtc = offers.reduce<number | null>(
    (best, a) => (a.offerCtc != null && (best == null || a.offerCtc > best) ? a.offerCtc : best),
    null,
  );

  const byStatus = new Map<string, number>();
  for (const a of apps) byStatus.set(a.status, (byStatus.get(a.status) ?? 0) + 1);
  const funnel = Object.keys(STATUS_LABEL).map((status) => ({
    status,
    count: byStatus.get(status) ?? 0,
  }));
  const maxCount = Math.max(1, ...funnel.map((f) => f.count));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-strong">My Placement Dashboard</h1>
        <p className="text-sm text-subtle">How your applications are tracking, at a glance.</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Applications" value={apps.length} gradient="primary" />
        <StatTile label="In progress" value={active.length} />
        <StatTile label="Interviews scheduled" value={interviewsScheduled} />
        <StatTile
          label="Offers"
          value={offers.length}
          hint={bestOfferCtc != null ? `Best: ₹${(bestOfferCtc / 100000).toFixed(1)} LPA` : undefined}
        />
      </div>

      <Card className="space-y-3 p-5">
        <p className="text-sm font-semibold text-strong">Funnel</p>
        {funnel.map((f) => (
          <ProgressBar
            key={f.status}
            label={STATUS_LABEL[f.status]}
            caption={String(f.count)}
            value={(f.count / maxCount) * 100}
          />
        ))}
      </Card>

      {offers.length > 0 && (
        <Card className="space-y-3 p-5">
          <p className="text-sm font-semibold text-strong">Offers</p>
          {offers.map((a) => (
            <div key={a.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-strong">{a.job.title}</p>
                <p className="text-xs text-subtle">{a.job.company.name}</p>
              </div>
              <Badge tint={STATUS_TINT[a.status] ?? 'cream'}>
                {a.offerCtc != null ? `₹${(a.offerCtc / 100000).toFixed(1)} LPA` : STATUS_LABEL[a.status]}
              </Badge>
            </div>
          ))}
        </Card>
      )}

      <Link href="/me/applications" className="block text-sm font-medium text-primary-600">
        View all applications →
      </Link>
    </div>
  );
}
