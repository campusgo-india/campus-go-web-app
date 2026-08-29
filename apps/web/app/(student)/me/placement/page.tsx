'use client';

import Link from 'next/link';
import type { ComponentType } from 'react';
import { Badge, Card, ProgressBar, StatTile } from '@campusgo/ui';
import { ListSkeleton } from '../../../../components/page-skeleton';
import {
  IconBriefcase,
  IconCalendarCheck,
  IconCheckCircle,
  IconClockProgress,
  IconUndo,
  IconXCircle,
} from '../../../../components/icons';
import { useApi } from '../../../../lib/use-api';
import { listMyApplications, type Application } from '../../../../lib/applications';

interface FunnelStage {
  key: string;
  label: string;
  /** Formal, plain-language explanation of what this stage means. */
  description: string;
  count: number;
  Icon: ComponentType<{ className?: string }>;
  fill: string;
}

export default function MyPlacementDashboardPage() {
  const { data: apps, isLoading } = useApi<Application[]>('/me/applications', listMyApplications);

  if (isLoading || !apps) return <ListSkeleton />;

  // "Applied" is every application submitted — the funnel's 100% top bucket
  // (matches "Applications" above it) — not just the ones still awaiting a
  // decision. Showing only the still-pending count here previously read as
  // "Applied: 0" for a student with 5 applications all already resolved to
  // Selected/Rejected, which looked broken even though it was accurate; as
  // the funnel's starting bucket, Applied should always be >= every stage
  // below it.
  const selected = apps.filter((a) => a.status === 'SELECTED' || a.offerCtc != null);
  const rejected = apps.filter((a) => a.status === 'REJECTED');
  const withdrawn = apps.filter((a) => a.status === 'WITHDRAWN');
  const interviewsScheduled = apps.reduce(
    (n, a) => n + a.interviews.filter((r) => r.result === 'PENDING' && r.scheduledAt).length,
    0,
  );
  const bestOfferCtc = selected.reduce<number | null>(
    (best, a) => (a.offerCtc != null && (best == null || a.offerCtc > best) ? a.offerCtc : best),
    null,
  );

  // Offers aren't tracked as a separate funnel — an offer is simply what
  // "Selected" means for a job application, so one funnel is enough.
  const FUNNEL: FunnelStage[] = [
    {
      key: 'applied',
      label: 'Applied',
      description: 'Every application you’ve submitted this season.',
      count: apps.length,
      Icon: IconClockProgress,
      fill: 'bg-primary-500',
    },
    {
      key: 'selected',
      label: 'Selected',
      description: 'You have been selected for this role — offer details are below.',
      count: selected.length,
      Icon: IconCheckCircle,
      fill: 'bg-tint-mint-fg',
    },
    {
      key: 'rejected',
      label: 'Rejected',
      description: 'This application did not proceed further.',
      count: rejected.length,
      Icon: IconXCircle,
      fill: 'bg-tint-rose-fg',
    },
    {
      key: 'withdrawn',
      label: 'Withdrawn',
      description: 'You withdrew this application.',
      count: withdrawn.length,
      Icon: IconUndo,
      fill: 'bg-subtle',
    },
  ];
  const maxCount = Math.max(1, ...FUNNEL.map((f) => f.count));

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-strong">Placement Tracker</h1>
          <p className="text-sm text-subtle">How your applications are progressing, at a glance.</p>
        </div>
        {/* This page isn't one of the bottom nav's main tabs, so it hides —
            without its own way back, Home/Jobs/etc. become unreachable. */}
        <Link href="/me" className="shrink-0 text-sm font-medium text-primary-600 hover:underline">
          ← Home
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          gradient="primary"
          icon={<IconBriefcase className="h-4 w-4" />}
          label="Applications"
          value={apps.length}
        />
        <StatTile
          icon={<IconClockProgress className="h-4 w-4" />}
          label="Applied"
          value={apps.length}
        />
        <StatTile
          icon={<IconCalendarCheck className="h-4 w-4" />}
          label="Interviews scheduled"
          value={interviewsScheduled}
        />
        <StatTile
          icon={<IconCheckCircle className="h-4 w-4" />}
          label="Selected"
          value={selected.length}
          hint={bestOfferCtc != null ? `Best offer: ₹${(bestOfferCtc / 100000).toFixed(1)} LPA` : undefined}
        />
      </div>

      <Card className="space-y-4 p-5">
        <p className="text-sm font-semibold text-strong">Application funnel</p>
        {FUNNEL.map((f) => (
          <div key={f.key} className="space-y-1">
            <ProgressBar
              label={
                <span className="flex items-center gap-1.5">
                  <f.Icon className="h-4 w-4 text-subtle" />
                  {f.label}
                </span>
              }
              caption={f.count}
              value={(f.count / maxCount) * 100}
              fillClassName={f.fill}
            />
            <p className="pl-[22px] text-xs text-subtle">{f.description}</p>
          </div>
        ))}
      </Card>

      {selected.length > 0 && (
        <Card className="space-y-3 p-5">
          <p className="text-sm font-semibold text-strong">Selected — offer details</p>
          {selected.map((a) => (
            <div key={a.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-strong">{a.job.title}</p>
                <p className="text-xs text-subtle">{a.job.company.name}</p>
              </div>
              <Badge tint="mint">
                {a.offerCtc != null ? `₹${(a.offerCtc / 100000).toFixed(1)} LPA` : 'Selected'}
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
