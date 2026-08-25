'use client';

import Link from 'next/link';
import { Badge, Card, ProgressBar, StatTile } from '@campusgo/ui';
import type { BadgeProps } from '@campusgo/ui';
import { ListSkeleton } from '../../../../components/page-skeleton';
import { useApi } from '../../../../lib/use-api';
import {
  getMyDashboard,
  PILLAR_COMPONENTS,
  type EmployabilityDashboard,
  type EmployabilityTier,
} from '../../../../lib/training';

const fmt = (d: string) =>
  new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

// Tier badge look: green for Tier 1 (top performers), blue for Tier 2
// (growth), amber for Tier 3 — deliberately not red, to avoid demotivating
// students who are still building their foundation.
const TIER_TINT: Record<EmployabilityTier, BadgeProps['tint']> = {
  TIER_1: 'mint',
  TIER_2: 'lavender',
  TIER_3: 'cream',
};
const TIER_STATUS: Record<EmployabilityTier, string> = {
  TIER_1: 'Tier 1 Eligible',
  TIER_2: 'Tier 2 Eligible',
  TIER_3: 'Foundation Track — Action Required',
};

// A next-assessment score to aim for on the weakest pillar — a flat +15
// point push, capped at 100. Illustrative, not a precise inverse of the
// readiness formula.
const IMPROVEMENT_TARGET_BUMP = 15;

interface Roadmap {
  headline: string;
  improvementGoal: string | null;
  actions: string[];
}

function buildRoadmap(data: EmployabilityDashboard): Roadmap {
  const { tier, deptRank, gapToNextTier, weakestPillar } = data;
  const percentile = deptRank.total > 0 ? Math.max(1, Math.round((deptRank.rank / deptRank.total) * 100)) : 100;
  const rankPhrase = percentile <= 10 ? `Top ${percentile}%` : `#${deptRank.rank} of ${deptRank.total}`;

  const target = weakestPillar ? Math.min(100, weakestPillar.percentage + IMPROVEMENT_TARGET_BUMP) : null;

  if (tier === 'TIER_1') {
    return {
      headline: `You are in the ${rankPhrase} of your batch! You are fully prepared and eligible for Tier 1 (Core & High Package), Tier 2, and Tier 3 campus drives.`,
      improvementGoal: null,
      actions: [
        'Focus on advanced technical/domain mock interviews.',
        'Maintain your high attendance in advanced training tracks.',
        'Keep your resume and LinkedIn profile updated for premium recruiters.',
      ],
    };
  }

  if (tier === 'TIER_2') {
    return {
      headline: `You are well-prepared for Tier 2 and Tier 3 campus drives. You are only +${gapToNextTier}% away from unlocking Tier 1 eligibility status.`,
      improvementGoal:
        weakestPillar && target != null
          ? `${weakestPillar.label} Focus: Your current ${weakestPillar.label} score is ${weakestPillar.percentage}%. Score ${target}%+ on your next test to upgrade your overall status to Tier 1 Eligible.`
          : null,
      actions: [
        'Actively participate in all upcoming Tier 2 & Tier 3 campus drives.',
        weakestPillar
          ? `Complete the pending ${weakestPillar.label} practice modules to boost your score.`
          : 'Complete pending practice modules to boost your weakest pillar.',
      ],
    };
  }

  return {
    headline: `You're building your foundation — mandatory training now sets up early job security. You are +${gapToNextTier}% away from unlocking Tier 2 eligibility.`,
    improvementGoal:
      weakestPillar && target != null
        ? `${weakestPillar.label} Focus: Your current ${weakestPillar.label} score is ${weakestPillar.percentage}%. Score ${target}%+ on your next test to move toward Tier 2 eligibility.`
        : null,
    actions: [
      'Enroll in the mandatory Foundation Training track for your weakest pillar.',
      'Prioritize early-placement and entry-level drives to secure a foundational offer.',
      'Milestone goal: reach 65% overall readiness to unlock Tier 2 eligibility.',
    ],
  };
}

export default function MyEmployabilityPage() {
  const { data, isLoading } = useApi<EmployabilityDashboard>('/me/training/dashboard', getMyDashboard);

  if (isLoading || !data) return <ListSkeleton />;

  const roadmap = buildRoadmap(data);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-strong">My Employability</h1>
        <p className="text-sm text-subtle">Your readiness across the 4 placement pillars.</p>
      </header>

      {/* Overall readiness */}
      <div className="space-y-3">
        <StatTile
          label="Overall Employability Readiness"
          value={`${data.readinessIndex}%`}
          hint={`Dept. Rank: #${data.deptRank.rank} of ${data.deptRank.total} · visible only to you`}
          gradient="primary"
        />
        <Badge tint={TIER_TINT[data.tier]}>{TIER_STATUS[data.tier]}</Badge>
      </div>

      {/* Placement roadmap — private tier badge, informational only */}
      <Card className="space-y-3 p-5">
        <p className="text-sm font-semibold text-strong">Your Placement Roadmap</p>
        <p className="text-sm text-body">{roadmap.headline}</p>

        {roadmap.improvementGoal && (
          <div className="rounded-md bg-app p-3">
            <p className="text-xs font-medium uppercase text-subtle">Targeted Improvement Goal</p>
            <p className="mt-1 text-sm text-body">{roadmap.improvementGoal}</p>
          </div>
        )}

        <div>
          <p className="text-xs font-medium uppercase text-subtle">Recommended Actions</p>
          <ul className="mt-1 space-y-1">
            {roadmap.actions.map((a) => (
              <li key={a} className="flex gap-2 text-sm text-body">
                <span className="text-primary-500">•</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {/* Skill breakdown */}
      <Card className="space-y-4 p-5">
        <p className="text-sm font-semibold text-strong">Skill breakdown</p>
        {data.pillars.map((p) => (
          <div key={p.pillar}>
            <ProgressBar
              label={p.label}
              caption={p.percentage != null ? `${p.percentage}%` : 'No data yet'}
              value={p.percentage ?? 0}
            />
            <p className="mt-1 text-xs text-subtle">{PILLAR_COMPONENTS[p.pillar].join(' · ')}</p>
          </div>
        ))}
        <Link href="/me/training/assessments" className="block text-sm font-medium text-primary-600">
          Take an assessment →
        </Link>
      </Card>

      {/* Active track & attendance */}
      <Card className="space-y-4 p-5">
        <p className="text-sm font-semibold text-strong">Active track &amp; attendance</p>
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Attendance" value={`${data.attendancePct}%`} />
          <StatTile label="Track status" value={`${data.completedCount} / ${data.completedCount + data.ongoingCount}`} hint="Completed / total" />
        </div>
        {data.nextSession ? (
          <div className="rounded-md bg-app p-3">
            <p className="text-xs text-subtle">Next up</p>
            <p className="text-sm font-medium text-strong">{data.nextSession.title}</p>
            <p className="text-xs text-subtle">{fmt(data.nextSession.startsAt)}</p>
          </div>
        ) : (
          <p className="text-sm text-subtle">No upcoming sessions scheduled.</p>
        )}
        <Link href="/me/training/calendar" className="block text-sm font-medium text-primary-600">
          View full calendar →
        </Link>
      </Card>
    </div>
  );
}
