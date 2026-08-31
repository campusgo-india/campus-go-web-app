'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge, Card, ProgressBar, StatTile } from '@campusgo/ui';
import type { BadgeProps } from '@campusgo/ui';
import { ListSkeleton } from '../../../../components/page-skeleton';
import { CircularProgress } from '../../../../components/circular-progress';
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
  // One short line — the numbers (rank, gap-to-next-tier) are shown visually
  // via the tier stepper + rank chip instead of being buried in the sentence.
  headline: string;
  improvementGoal: { pillarLabel: string; current: number; target: number } | null;
  actions: string[];
}

function buildRoadmap(data: EmployabilityDashboard): Roadmap {
  const { tier, weakestPillar } = data;
  const target = weakestPillar ? Math.min(100, weakestPillar.percentage + IMPROVEMENT_TARGET_BUMP) : null;
  const improvementGoal =
    weakestPillar && target != null
      ? { pillarLabel: weakestPillar.label, current: weakestPillar.percentage, target }
      : null;

  if (tier === 'TIER_1') {
    return {
      headline: "You're fully prepared — eligible for every campus drive.",
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
      headline: 'Well-prepared for Tier 2 & Tier 3 drives.',
      improvementGoal,
      actions: [
        'Actively participate in all upcoming Tier 2 & Tier 3 campus drives.',
        weakestPillar
          ? `Complete the pending ${weakestPillar.label} practice modules to boost your score.`
          : 'Complete pending practice modules to boost your weakest pillar.',
      ],
    };
  }

  return {
    headline: 'Building your foundation — mandatory training sets up early job security.',
    improvementGoal,
    actions: [
      'Enroll in the mandatory Foundation Training track for your weakest pillar.',
      'Prioritize early-placement and entry-level drives to secure a foundational offer.',
      'Milestone goal: reach 65% overall readiness to unlock Tier 2 eligibility.',
    ],
  };
}

const TIER_STEPS: { key: EmployabilityTier; label: string }[] = [
  { key: 'TIER_3', label: 'Tier 3' },
  { key: 'TIER_2', label: 'Tier 2' },
  { key: 'TIER_1', label: 'Tier 1' },
];

/** Visual "you are here" ladder across the 3 tiers, instead of describing
 * the same thing in a sentence. */
function TierStepper({ tier, gapToNextTier }: { tier: EmployabilityTier; gapToNextTier: number | null }) {
  const currentIdx = TIER_STEPS.findIndex((t) => t.key === tier);
  const nextLabel = currentIdx > 0 ? TIER_STEPS[currentIdx - 1]!.label : null;
  return (
    <div>
      <div className="flex items-start">
        {TIER_STEPS.map((t, i) => {
          const reached = i <= currentIdx;
          const current = i === currentIdx;
          return (
            <div key={t.key} className="flex flex-1 items-start last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    current
                      ? 'bg-gradient-brand text-white shadow-nav'
                      : reached
                        ? 'bg-success text-white'
                        : 'bg-app text-subtle'
                  }`}
                >
                  {reached && !current ? <CheckIcon /> : i + 1}
                </span>
                <span className={`text-[11px] font-semibold ${current ? 'text-strong' : 'text-subtle'}`}>
                  {t.label}
                </span>
              </div>
              {i < TIER_STEPS.length - 1 && (
                // mt-[14px] centers this 4px line against the 32px circle
                // above it (16px center - 2px half-height) — items-center on
                // the row would instead center it against the taller
                // circle+label block, which is the bug this replaces.
                <div className={`mx-1 mt-[14px] h-1 flex-1 rounded-full ${i < currentIdx ? 'bg-success' : 'bg-app'}`} />
              )}
            </div>
          );
        })}
      </div>
      {nextLabel && gapToNextTier != null && (
        <p className="mt-2.5 text-center text-xs font-medium text-subtle">
          <span className="rounded-pill bg-tint-cream px-2.5 py-1 text-tint-cream-fg">
            +{gapToNextTier}% to {nextLabel}
          </span>
        </p>
      )}
    </div>
  );
}

const TABS = [
  { key: 'roadmap', label: 'Roadmap' },
  { key: 'skills', label: 'Skills' },
  { key: 'schedule', label: 'Schedule' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export default function MyEmployabilityPage() {
  const { data, isLoading } = useApi<EmployabilityDashboard>('/me/training/dashboard', getMyDashboard);
  const [tab, setTab] = useState<TabKey>('roadmap');

  if (isLoading || !data) return <ListSkeleton />;

  const roadmap = buildRoadmap(data);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-strong">My Employability</h1>
        <p className="text-sm text-subtle">Your readiness across the 4 placement pillars.</p>
      </header>

      {/* Overall readiness — ring meter, reference-app "98% Success" pattern.
          Stays visible above the tabs since it's the headline number. */}
      <Card className="animate-rise flex items-center gap-5 p-5">
        <CircularProgress value={data.readinessIndex} size={100} strokeWidth={9}>
          <div className="text-center">
            <p className="text-xl font-extrabold text-strong">{data.readinessIndex}%</p>
            <p className="text-[10px] font-medium text-subtle">Ready</p>
          </div>
        </CircularProgress>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-strong">Overall Employability Readiness</p>
          <p className="mt-1 text-xs text-subtle">
            Dept. Rank #{data.deptRank.rank} of {data.deptRank.total} · visible only to you
          </p>
          <div className="mt-2.5">
            <Badge tint={TIER_TINT[data.tier]}>{TIER_STATUS[data.tier]}</Badge>
          </div>
        </div>
      </Card>

      {/* Swiggy-style segmented tabs — Roadmap / Skills / Schedule, instead of
          one long scroll of stacked cards. */}
      <div className="flex gap-2 rounded-pill bg-white p-1 shadow-card">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`press-bg flex-1 rounded-pill py-2 text-sm font-semibold transition ${
              tab === t.key ? 'bg-gradient-brand text-white shadow-nav' : 'text-subtle'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'roadmap' && (
      <Card className="animate-rise space-y-4 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tint-lavender text-tint-lavender-fg">
            <CompassIcon />
          </span>
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-strong">
              <span className="h-4 w-1.5 rounded-full bg-gradient-brand" />
              Your Placement Roadmap
            </p>
            <p className="text-xs text-subtle">{roadmap.headline}</p>
          </div>
        </div>

        <TierStepper tier={data.tier} gapToNextTier={data.gapToNextTier} />

        {roadmap.improvementGoal && (
          <div className="flex items-center gap-4 rounded-md bg-tint-cream p-3.5">
            <div className="flex-1">
              <p className="text-xs font-medium uppercase text-tint-cream-fg">
                {roadmap.improvementGoal.pillarLabel} focus
              </p>
              <p className="mt-0.5 text-xs text-body">Score this on your next test to level up.</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="text-center">
                <p className="text-lg font-bold text-subtle">{roadmap.improvementGoal.current}%</p>
                <p className="text-[10px] text-subtle">Now</p>
              </div>
              <span className="text-tint-cream-fg">→</span>
              <div className="text-center">
                <p className="text-lg font-bold text-tint-cream-fg">{roadmap.improvementGoal.target}%</p>
                <p className="text-[10px] text-tint-cream-fg">Target</p>
              </div>
            </div>
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
      )}

      {tab === 'skills' && (
      <Card className="animate-rise space-y-5 p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-strong">
          <span className="h-4 w-1.5 rounded-full bg-gradient-brand" />
          Skill breakdown
        </p>
        {data.pillars.map((p) => {
          const message = pillarReadinessMessage(p.pillar, p.percentage);
          const tint = scoreTint(p.percentage);
          return (
            <div key={p.pillar} className={`rounded-xl p-3.5 ${TINT_BG[tint]}`}>
              <div className="flex items-center gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/70 ${TINT_FG[tint]}`}>
                  {PILLAR_ICON[p.pillar]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-strong">{p.label}</p>
                    <p className={`text-sm font-bold ${TINT_FG[tint]}`}>
                      {p.percentage != null ? `${p.percentage}%` : '—'}
                    </p>
                  </div>
                  <ProgressBar value={p.percentage ?? 0} fillClassName={BAR_FILL[tint]} size="sm" />
                </div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-body">
                {message ?? `Take a ${p.label.toLowerCase()} assessment to see your readiness here.`}
              </p>
              <p className="mt-0.5 text-[11px] text-subtle">{PILLAR_COMPONENTS[p.pillar].join(' · ')}</p>
            </div>
          );
        })}
        <Link
          href="/me/training/assessments"
          className="press flex items-center justify-between rounded-lg bg-gradient-brand px-4 py-3 text-sm font-semibold text-primary-foreground shadow-nav"
        >
          Take an assessment
          <span>→</span>
        </Link>
      </Card>
      )}

      {tab === 'schedule' && (
      <Card className="animate-rise space-y-4 p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-strong">
          <span className="h-4 w-1.5 rounded-full bg-gradient-brand" />
          Active track &amp; attendance
        </p>
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
      )}
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
