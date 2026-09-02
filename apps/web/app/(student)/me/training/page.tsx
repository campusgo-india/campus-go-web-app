'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, ProgressBar } from '@campusgo/ui';
import { ListSkeleton } from '../../../../components/page-skeleton';
import { CircularProgress } from '../../../../components/circular-progress';
import { useApi } from '../../../../lib/use-api';
import {
  getMyAssessments,
  getMyDashboard,
  listMySessions,
  PILLAR_LABEL,
  type Assessment,
  type EmployabilityDashboard,
  type EmployabilityTier,
  type PillarBreakdown,
  type TrainingPillar,
  type TrainingSession,
} from '../../../../lib/training';

// ─── Tier ladder ───────────────────────────────────────────────────────────
const TIER_STEPS: { key: EmployabilityTier; label: string }[] = [
  { key: 'TIER_3', label: 'Tier 3' },
  { key: 'TIER_2', label: 'Tier 2' },
  { key: 'TIER_1', label: 'Tier 1' },
];
// Private, informational status tag only — never gates job eligibility (that's
// decided per job on the API). ≥80% Tier 1, 65–79% Tier 2, <65% Tier 3.
// Colours: Tier 1 green (top performer), Tier 2 a "growth" pill, Tier 3 amber
// "Building momentum" — forward-looking, never an alarm-red "you failed".
const TIER_BADGE: Record<EmployabilityTier, { label: string; className: string; growth?: boolean }> = {
  TIER_1: { label: 'Tier 1 Eligible', className: 'bg-success text-white' },
  TIER_2: { label: 'Tier 2 Eligible', className: 'bg-white text-primary-700', growth: true },
  TIER_3: { label: 'Building momentum', className: 'bg-warning text-white', growth: true },
};
function tierLabel(tier: EmployabilityTier): string {
  return TIER_STEPS.find((t) => t.key === tier)?.label ?? 'the next tier';
}
/** The tier one step *up* from the current one — TIER_STEPS runs worst→best,
 *  so that's the next index, not the previous. Null at the top (Tier 1). */
function nextTierLabel(tier: EmployabilityTier): string | null {
  const idx = TIER_STEPS.findIndex((t) => t.key === tier);
  return idx >= 0 && idx < TIER_STEPS.length - 1 ? TIER_STEPS[idx + 1]!.label : null;
}

// ─── Skill breakdown styling ───────────────────────────────────────────────
const SKILL_ORDER: TrainingPillar[] = [
  'TECHNICAL_TOOLS',
  'SOFT_SKILLS_COMMUNICATION',
  'APTITUDE_REASONING',
  'CAREER_READINESS',
];
const SKILL_SHORT: Record<TrainingPillar, string> = {
  TECHNICAL_TOOLS: 'Technical & Tools',
  SOFT_SKILLS_COMMUNICATION: 'Communication',
  APTITUDE_REASONING: 'Aptitude',
  CAREER_READINESS: 'Domain knowledge',
};
type Band = 'low' | 'mid' | 'high';
function skillBand(pct: number | null): Band {
  if (pct == null) return 'mid';
  if (pct < 65) return 'low';
  if (pct < 80) return 'mid';
  return 'high';
}
// Amber (not red) for the weakest band — same anti-demotivation rule as the
// tier badge.
const SKILL_TEXT: Record<Band, string> = {
  low: 'text-warning',
  mid: 'text-accent-600',
  high: 'text-success',
};
const SKILL_BAR: Record<Band, string> = {
  low: 'bg-warning',
  mid: 'bg-accent-500',
  high: 'bg-success',
};
function skillCaption(p: PillarBreakdown, data: EmployabilityDashboard): string {
  if (p.percentage == null) return 'Take an assessment to light this up';
  if (data.weakestPillar?.pillar === p.pillar)
    return 'Your biggest opportunity — put your next practice test here';
  if (p.percentage >= 80) return 'Strong — keep the momentum going';
  return `Building nicely — on track for ${tierLabel(data.tier)}`;
}

// ─── Roadmap copy ──────────────────────────────────────────────────────────
// Points needed on the weakest pillar's next test to lift the overall index a
// tier; rounded to a clean number and capped so it always looks achievable.
const PILLAR_TARGET_BUMP = 13;
function pillarTarget(current: number): number {
  return Math.min(95, Math.round((current + PILLAR_TARGET_BUMP) / 5) * 5);
}
/** "top N%" band from the private dept rank — only claimed when genuinely elite. */
function topBatchBucket(rank: number, total: number): number | null {
  if (total <= 0 || rank <= 0) return null;
  const pct = (rank / total) * 100;
  if (pct <= 10) return 10;
  if (pct <= 25) return 25;
  return null;
}

interface Roadmap {
  headline: string;
  improvementGoal: { pillarLabel: string; current: number; target: number } | null;
  actions: string[];
}

function buildRoadmap(data: EmployabilityDashboard): Roadmap {
  const { tier, weakestPillar, deptRank } = data;
  const weakLabel = weakestPillar
    ? (SKILL_SHORT[weakestPillar.pillar] ?? weakestPillar.label)
    : null;
  const improvementGoal =
    weakestPillar != null && weakLabel != null
      ? {
          pillarLabel: weakLabel,
          current: weakestPillar.percentage,
          target: pillarTarget(weakestPillar.percentage),
        }
      : null;

  if (tier === 'TIER_1') {
    const bucket = topBatchBucket(deptRank.rank, deptRank.total);
    const lead = bucket ? `You are in the top ${bucket}% of your batch! ` : '';
    return {
      headline:
        `${lead}You are fully prepared and eligible for Tier 1 (Core & High Package), Tier 2, ` +
        `and Tier 3 campus drives.`,
      improvementGoal: null,
      actions: [
        'Focus on advanced technical/domain mock interviews.',
        'Maintain your high attendance in advanced training tracks.',
        'Keep your resume and LinkedIn profile updated for premium recruiters.',
      ],
    };
  }

  if (tier === 'TIER_2') {
    const gap = data.gapToNextTier ?? Math.max(1, 80 - data.readinessIndex);
    return {
      headline:
        `You are well-prepared for Tier 2 and Tier 3 campus drives. You are only +${gap}% away ` +
        `from unlocking Tier 1 eligibility status.`,
      improvementGoal,
      actions: [
        'Actively participate in all upcoming Tier 2 & Tier 3 campus drives.',
        weakLabel
          ? `Complete the pending ${weakLabel} practice module to boost your score.`
          : 'Complete pending practice modules to boost your weakest pillar.',
      ],
    };
  }

  const gap = data.gapToNextTier ?? Math.max(1, 65 - data.readinessIndex);
  return {
    headline:
      'You’re building your foundation fast — the Foundation Training track is your quickest ' +
      'route to a first offer.',
    improvementGoal,
    actions: [
      weakLabel
        ? `Jump into the Foundation Training track for ${weakLabel}.`
        : 'Jump into the Foundation Training track for your focus pillar.',
      'Go all-in on early-placement and entry-level drives — a first offer builds real momentum.',
      `Next milestone: hit 65% overall readiness (+${gap}%) to unlock Tier 2.`,
    ],
  };
}

// ─── Schedule (upcoming tests & drives) ────────────────────────────────────
interface ScheduleItem {
  id: string;
  date: Date;
  title: string;
  subtitle: string;
  registered: boolean;
}
const fmtTime = (d: Date) =>
  d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

function buildSchedule(sessions: TrainingSession[], assessments: Assessment[]): ScheduleItem[] {
  const now = Date.now();
  const items: ScheduleItem[] = [];
  for (const s of sessions) {
    const d = new Date(s.startsAt);
    if (d.getTime() < now) continue;
    items.push({
      id: `s-${s.id}`,
      date: d,
      title: s.title,
      subtitle: `${fmtTime(d)} · ${s.trainerName ?? (s.pillar ? PILLAR_LABEL[s.pillar] : 'Training')}`,
      registered: s.myAttendance === true,
    });
  }
  for (const a of assessments) {
    if (!a.scheduledAt) continue;
    const d = new Date(a.scheduledAt);
    if (d.getTime() < now) continue;
    items.push({
      id: `a-${a.id}`,
      date: d,
      title: a.name,
      subtitle: `${fmtTime(d)} · ${a.description ?? 'Online'}`,
      registered: a.myScore != null,
    });
  }
  return items.sort((x, y) => x.date.getTime() - y.date.getTime()).slice(0, 6);
}

// ─── Tabs ──────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'roadmap', label: 'Roadmap' },
  { key: 'skills', label: 'Skills' },
  { key: 'schedule', label: 'Schedule' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export default function MyEmployabilityPage() {
  const { data, isLoading } = useApi<EmployabilityDashboard>('/me/training/dashboard', getMyDashboard);
  const { data: sessions } = useApi<TrainingSession[]>('/me/training/sessions', listMySessions);
  const { data: assessments } = useApi<Assessment[]>('/me/training/assessments', getMyAssessments);
  const [tab, setTab] = useState<TabKey>('roadmap');

  if (isLoading || !data) return <ListSkeleton />;

  const roadmap = buildRoadmap(data);
  const unlockLabel = nextTierLabel(data.tier);
  const schedule = buildSchedule(sessions ?? [], assessments ?? []);
  const orderedPillars = SKILL_ORDER.map((k) => data.pillars.find((p) => p.pillar === k)).filter(
    (p): p is PillarBreakdown => p != null,
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-strong">My Employability</h1>
        <p className="text-sm text-subtle">Your readiness across the 4 placement pillars.</p>
      </header>

      {/* Overall readiness — brand-gradient band, ring on the left */}
      <div className="animate-rise relative overflow-hidden rounded-card bg-gradient-brand p-5 text-white shadow-nav">
        <div
          className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 70%)' }}
        />
        <div className="relative flex items-center gap-5">
          <CircularProgress
            value={data.readinessIndex}
            size={96}
            strokeWidth={9}
            trackClassName="text-white/25"
            gradientFrom="#F2954A"
            gradientTo="#C2601F"
          >
            <div className="text-center">
              <p className="text-2xl font-extrabold">{data.readinessIndex}%</p>
              <p className="text-[10px] font-semibold tracking-[0.12em] text-white/80">READY</p>
            </div>
          </CircularProgress>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold leading-snug">Overall employability readiness</p>
            <p className="mt-1 text-sm text-white/80">
              Dept. rank #{data.deptRank.rank} of {data.deptRank.total} · visible only to you
            </p>
            <span
              className={`mt-3 inline-flex items-center gap-1 rounded-pill px-3 py-1 text-xs font-bold ${TIER_BADGE[data.tier].className}`}
            >
              {TIER_BADGE[data.tier].growth && <UpIcon />}
              {TIER_BADGE[data.tier].label}
            </span>
          </div>
        </div>
      </div>

      {/* Segmented tabs */}
      <div className="flex gap-1 rounded-pill bg-muted p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`press-bg flex-1 rounded-pill py-2 text-sm font-semibold transition ${
              tab === t.key ? 'bg-white text-strong shadow-card' : 'text-subtle'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Roadmap ── */}
      {tab === 'roadmap' && (
        <Card className="animate-rise space-y-4 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tint-accent text-tint-accent-fg">
              <CompassIcon />
            </span>
            <p className="text-base font-bold text-strong">Your placement roadmap</p>
          </div>
          <p className="text-sm leading-relaxed text-body">{roadmap.headline}</p>

          <TierStepper tier={data.tier} />

          {unlockLabel && data.gapToNextTier != null && (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-tint-cream px-4 py-3 text-sm font-semibold text-tint-cream-fg">
              <UpIcon />
              Just {data.gapToNextTier}% more to reach {unlockLabel}
            </div>
          )}

          {roadmap.improvementGoal && (
            <div className="rounded-xl bg-tint-cream/60 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-tint-cream-fg">
                {roadmap.improvementGoal.pillarLabel} focus
              </p>
              <p className="mt-1 text-sm text-body">
                Your current {roadmap.improvementGoal.pillarLabel} score is{' '}
                {roadmap.improvementGoal.current}%. Score {roadmap.improvementGoal.target}%+ on your
                next test to upgrade your overall status to{' '}
                <span className="font-semibold text-strong">
                  {data.tier === 'TIER_2' ? 'Tier 1 Eligible' : 'Tier 2 Eligible'}
                </span>
                .
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div>
                  <p className="text-2xl font-extrabold text-subtle">{roadmap.improvementGoal.current}%</p>
                  <p className="text-[10px] font-semibold tracking-wide text-subtle">NOW</p>
                </div>
                <span className="text-xl text-tint-cream-fg">→</span>
                <div>
                  <p className="text-2xl font-extrabold text-tint-cream-fg">{roadmap.improvementGoal.target}%</p>
                  <p className="text-[10px] font-semibold tracking-wide text-tint-cream-fg">TARGET</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-subtle">
              Recommended actions
            </p>
            <ul className="mt-2.5 space-y-3">
              {roadmap.actions.map((a) => (
                <li key={a} className="flex items-start gap-3 text-sm text-body">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tint-accent text-tint-accent-fg">
                    <ArrowIcon />
                  </span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      {/* ── Skills ── */}
      {tab === 'skills' && (
        <Card className="animate-rise space-y-5 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tint-accent text-tint-accent-fg">
              <ChartBarIcon />
            </span>
            <div>
              <p className="text-base font-bold text-strong">Skill breakdown</p>
              <p className="text-xs text-subtle">Where your readiness score comes from.</p>
            </div>
          </div>

          <div className="space-y-4">
            {orderedPillars.map((p) => {
              const band = skillBand(p.percentage);
              return (
                <div key={p.pillar} className="border-t border-border pt-4 first:border-0 first:pt-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-strong">{SKILL_SHORT[p.pillar]}</p>
                    <p className={`text-sm font-bold ${SKILL_TEXT[band]}`}>
                      {p.percentage != null ? `${p.percentage}%` : '—'}
                    </p>
                  </div>
                  <ProgressBar
                    value={p.percentage ?? 0}
                    fillClassName={SKILL_BAR[band]}
                    size="sm"
                    className="mt-2"
                  />
                  <p className="mt-1.5 text-xs text-subtle">{skillCaption(p, data)}</p>
                </div>
              );
            })}
          </div>

          <Link
            href="/me/training/assessments"
            className="press flex items-center justify-between rounded-lg bg-gradient-brand px-4 py-3 text-sm font-semibold text-white shadow-nav"
          >
            Take an assessment
            <span>→</span>
          </Link>
        </Card>
      )}

      {/* ── Schedule ── */}
      {tab === 'schedule' && (
        <Card className="animate-rise space-y-4 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tint-accent text-tint-accent-fg">
              <CalendarIcon />
            </span>
            <div>
              <p className="text-base font-bold text-strong">Upcoming tests &amp; drives</p>
              <p className="text-xs text-subtle">Register early — slots are first come, first served.</p>
            </div>
          </div>

          {schedule.length === 0 ? (
            <p className="py-4 text-center text-sm text-subtle">
              Nothing scheduled yet — new tests and drives will show up here as they open.
            </p>
          ) : (
            <div className="space-y-3">
              {schedule.map((it) => (
                <div key={it.id} className="flex items-center gap-3 border-t border-border pt-3 first:border-0 first:pt-0">
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-app leading-none">
                    <span className="text-sm font-extrabold text-strong">{it.date.getDate()}</span>
                    <span className="mt-0.5 text-[10px] font-semibold uppercase text-subtle">
                      {it.date.toLocaleString(undefined, { month: 'short' })}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-strong">{it.title}</p>
                    <p className="truncate text-xs text-subtle">{it.subtitle}</p>
                  </div>
                  {it.registered ? (
                    <span className="shrink-0 rounded-pill bg-success/15 px-2.5 py-1 text-[11px] font-semibold text-success">
                      Registered
                    </span>
                  ) : (
                    <Link
                      href="/me/training/calendar"
                      className="press shrink-0 rounded-pill bg-tint-accent px-2.5 py-1 text-[11px] font-semibold text-tint-accent-fg"
                    >
                      Register
                    </Link>
                  )}
                </div>
              ))}
            </div>
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

/** "You are here" ladder across the 3 tiers. */
function TierStepper({ tier }: { tier: EmployabilityTier }) {
  const currentIdx = TIER_STEPS.findIndex((t) => t.key === tier);
  return (
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
                    ? 'bg-gradient-accent text-white shadow-nav'
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
              <div
                className={`mx-1 mt-[14px] h-1 flex-1 rounded-full ${
                  i < currentIdx ? 'bg-success' : 'bg-app'
                }`}
              />
            )}
          </div>
        );
      })}
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

function ChartBarIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" strokeLinejoin="round" />
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

function UpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="h-4 w-4">
      <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="h-3.5 w-3.5">
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
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
