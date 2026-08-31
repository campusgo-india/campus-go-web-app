'use client';

import Link from 'next/link';
import { Badge, Card, ProgressBar, StatTile } from '@campusgo/ui';
import type { BadgeProps } from '@campusgo/ui';
import { ListSkeleton } from '../../../../components/page-skeleton';
import { useApi } from '../../../../lib/use-api';
import {
  getMyDashboard,
  PILLAR_COMPONENTS,
  pillarReadinessMessage,
  type EmployabilityDashboard,
  type EmployabilityTier,
  type TrainingPillar,
} from '../../../../lib/training';

type Tint = 'lavender' | 'mint' | 'cream' | 'rose';
const TINT_BG: Record<Tint, string> = {
  lavender: 'bg-tint-lavender',
  mint: 'bg-tint-mint',
  cream: 'bg-tint-cream',
  rose: 'bg-tint-rose',
};
const TINT_FG: Record<Tint, string> = {
  lavender: 'text-tint-lavender-fg',
  mint: 'text-tint-mint-fg',
  cream: 'text-tint-cream-fg',
  rose: 'text-tint-rose-fg',
};

// A score's own color says more than a uniform blue ever could — low
// scores read as "needs work" (rose), mid as "on track" (cream), high as
// "strong" (mint). Applied to both the pillar icon chip and its bar fill.
function scoreTint(pct: number | null): Tint {
  if (pct == null) return 'lavender';
  if (pct < 50) return 'rose';
  if (pct < 75) return 'cream';
  return 'mint';
}
const BAR_FILL: Record<Tint, string> = {
  lavender: 'bg-primary-400',
  mint: 'bg-success',
  cream: 'bg-warning',
  rose: 'bg-danger',
};

const PILLAR_ICON: Record<TrainingPillar, React.ReactNode> = {
  APTITUDE_REASONING: <PuzzleIcon />,
  TECHNICAL_TOOLS: <ToolsIcon />,
  SOFT_SKILLS_COMMUNICATION: <ChatIcon />,
  CAREER_READINESS: <BriefcaseIcon />,
};

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
      <div className="animate-rise space-y-3">
        <StatTile
          label="Overall Employability Readiness"
          value={`${data.readinessIndex}%`}
          hint={`Dept. Rank: #${data.deptRank.rank} of ${data.deptRank.total} · visible only to you`}
          gradient="primary"
        />
        <Badge tint={TIER_TINT[data.tier]}>{TIER_STATUS[data.tier]}</Badge>
      </div>

      {/* Placement roadmap — private tier badge, informational only */}
      <Card className="animate-rise space-y-3 p-5" style={{ animationDelay: '60ms' }}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tint-lavender text-tint-lavender-fg">
            <CompassIcon />
          </span>
          <p className="text-sm font-semibold text-strong">Your Placement Roadmap</p>
        </div>
        <p className="text-sm text-body">{roadmap.headline}</p>

        {roadmap.improvementGoal && (
          <div className="rounded-md bg-tint-cream p-3">
            <p className="text-xs font-medium uppercase text-tint-cream-fg">Targeted Improvement Goal</p>
            <p className="mt-1 text-sm text-body">{roadmap.improvementGoal}</p>
          </div>
        )}

        <div>
          <p className="text-xs font-medium uppercase text-subtle">Recommended Actions</p>
          <ul className="mt-2 space-y-2">
            {roadmap.actions.map((a) => (
              <li key={a} className="flex items-start gap-2.5 text-sm text-body">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-tint-mint text-tint-mint-fg">
                  <CheckIcon />
                </span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {/* Skill breakdown */}
      <Card className="animate-rise space-y-5 p-5" style={{ animationDelay: '120ms' }}>
        <p className="text-sm font-semibold text-strong">Skill breakdown</p>
        {data.pillars.map((p) => {
          const message = pillarReadinessMessage(p.pillar, p.percentage);
          const tint = scoreTint(p.percentage);
          return (
            <div key={p.pillar} className="flex gap-3">
              <span
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${TINT_BG[tint]} ${TINT_FG[tint]}`}
              >
                {PILLAR_ICON[p.pillar]}
              </span>
              <div className="min-w-0 flex-1">
                <ProgressBar
                  label={p.label}
                  caption={p.percentage != null ? `${p.percentage}%` : 'No data yet'}
                  value={p.percentage ?? 0}
                  fillClassName={BAR_FILL[tint]}
                />
                <p className="mt-1.5 text-sm text-body">
                  {message ?? `Take a ${p.label.toLowerCase()} assessment to see your readiness here.`}
                </p>
                <p className="mt-0.5 text-xs text-subtle">Covers: {PILLAR_COMPONENTS[p.pillar].join(' · ')}</p>
              </div>
            </div>
          );
        })}
        <Link
          href="/me/training/assessments"
          className="press flex items-center justify-between rounded-lg bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-nav"
        >
          Take an assessment
          <span>→</span>
        </Link>
      </Card>

      {/* Active track & attendance */}
      <Card className="animate-rise space-y-4 p-5" style={{ animationDelay: '180ms' }}>
        <p className="text-sm font-semibold text-strong">Active track &amp; attendance</p>
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Attendance" value={`${data.attendancePct}%`} tint="mint" />
          <StatTile
            label="Track status"
            value={`${data.completedCount} / ${data.completedCount + data.ongoingCount}`}
            hint="Completed / total"
            tint="lavender"
          />
        </div>
        {data.nextSession ? (
          <div className="flex items-center gap-3 rounded-md bg-tint-cream p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-tint-cream-fg">
              <CalendarIcon />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-tint-cream-fg">Next up</p>
              <p className="truncate text-sm font-medium text-strong">{data.nextSession.title}</p>
              <p className="text-xs text-subtle">{fmt(data.nextSession.startsAt)}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-subtle">No upcoming sessions scheduled.</p>
        )}
        <Link
          href="/me/training/calendar"
          className="press flex items-center justify-between rounded-lg border border-border bg-white px-4 py-3 text-sm font-semibold text-primary-600"
        >
          View full calendar
          <span>→</span>
        </Link>
      </Card>
    </div>
  );
}

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  className: 'h-5 w-5',
} as const;

function CompassIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="m14.8 9.2-1.6 4.4-4.4 1.6 1.6-4.4 4.4-1.6Z" strokeLinejoin="round" />
    </svg>
  );
}

function PuzzleIcon() {
  return (
    <svg {...iconProps}>
      <path d="M9 4h4v2.2a1.8 1.8 0 1 0 0 3.6V12h2.2a1.8 1.8 0 1 1 0 3.6H15v4H4v-4h2.2a1.8 1.8 0 1 0 0-3.6H4V4h5Z" strokeLinejoin="round" />
    </svg>
  );
}

function ToolsIcon() {
  return (
    <svg {...iconProps}>
      <path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4l-3-3-2.7 2.7" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 5h16v11H8l-4 4V5Z" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M8 9h8M8 12.5h5" strokeLinecap="round" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}
