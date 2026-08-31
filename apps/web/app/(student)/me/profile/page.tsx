'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@campusgo/ui';
import { getMyActionItems, getOwnStudent, type ActionItem, type Student } from '../../../../lib/students';
import { useSession } from '../../../../lib/session';
import { InlineSkeleton } from '../../../../components/page-skeleton';
import { CircularProgress } from '../../../../components/circular-progress';

// One glyph per ActionItem.key — icon components are defined further down in
// this file (function declarations are hoisted, so this is safe up here).
const ACTION_ITEM_ICON: Record<ActionItem['key'], React.ReactNode> = {
  profile: <UserIcon />,
  resume: <DocIcon />,
  inactive: <BriefcaseIcon />,
  assessment: <ChartIcon />,
};

/**
 * Student "Profile" hub — an actions menu listing everything the student can do
 * (edit details, resume, jobs, applications, internships, training, alerts,
 * password, sign out). The profile editor itself lives at /me/profile/edit.
 */
export default function ProfileMenuPage() {
  const { signOut } = useSession();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
  }

  useEffect(() => {
    getOwnStudent()
      .then(setStudent)
      .catch(() => {})
      .finally(() => setLoading(false));
    getMyActionItems()
      .then(setActionItems)
      .catch(() => {});
  }, []);

  const verified = student?.verificationStatus === 'VERIFIED';

  return (
    <div className="space-y-6 pb-4">
      <h1 className="text-2xl font-semibold text-strong">Profile</h1>

      {/* Identity — centered circular avatar with an accent ring; a green
          verified badge overlaps it once the profile's been checked (the
          reference app's signal for "this is a real, confirmed student"),
          falling back to the edit-pencil badge until then so there's still
          an obvious way in to finish the profile. */}
      <Card className="flex flex-col items-center p-6 text-center">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-brand text-2xl font-bold text-white shadow-nav ring-4 ring-accent-400/70">
            {initial(student?.user.fullName)}
          </div>
          {verified ? (
            <span
              aria-label="Profile verified"
              className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-success text-white"
            >
              <CheckGlyph />
            </span>
          ) : (
            <Link
              href="/me/profile/edit"
              aria-label="Edit profile"
              className="press absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-primary-600 shadow-card"
            >
              <PencilIcon />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="mt-3">
            <InlineSkeleton width="w-32" height="h-5" />
          </div>
        ) : (
          <p className="mt-3 text-lg font-extrabold text-strong">{student?.user.fullName ?? 'Student'}</p>
        )}
        {student && (
          <p className="text-xs text-subtle">
            Roll No. {student.rollNumber} · {student.school} · Batch {student.graduationYear}
          </p>
        )}
        {student?.linkedinUrl && (
          <a
            href={student.linkedinUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
          >
            <LinkedInIcon />
            LinkedIn profile
          </a>
        )}
        {student && (
          <span
            className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
              verified ? 'bg-success/15 text-success' : 'bg-tint-cream text-tint-cream-fg'
            }`}
          >
            {verified ? 'Verified' : verLabel(student.verificationStatus)}
          </span>
        )}

        {/* Profile completion ring, same visual language as Employability's readiness ring */}
        {student && (
          <div className="mt-5 flex w-full items-center gap-4 border-t border-border pt-5">
            <CircularProgress
              value={student.profileCompletion}
              size={64}
              strokeWidth={6}
              gradientFrom="#F2954A"
              gradientTo="#C2601F"
            >
              <span className="text-sm font-bold text-strong">{student.profileCompletion}%</span>
            </CircularProgress>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-semibold text-strong">Profile completion</p>
              <div className="mt-1.5 space-y-1">
                {student.profileSteps.map((s) => (
                  <div key={s.key} className="flex items-center justify-between text-xs">
                    <span className="text-subtle">{s.label}</span>
                    {s.percentage >= 100 ? (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success text-white">
                        <CheckGlyph />
                      </span>
                    ) : (
                      <span className="text-subtle">{s.completed}/{s.total}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Actions Required — dynamic nudges: incomplete profile, stale resume,
          inactivity with matching jobs open, a pending assessment. Ordered
          by the backend, profile completion first since it unlocks the rest. */}
      {actionItems.length > 0 && (
        <div className="space-y-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-subtle">
            Actions Required
          </p>
          {actionItems.map((item) => (
            <Link
              key={item.key}
              href={item.ctaHref}
              className="flex items-start gap-4 rounded-card border border-primary-200 bg-primary-50/60 p-4 transition hover:shadow-card"
            >
              <IconBox tint="cream">{ACTION_ITEM_ICON[item.key]}</IconBox>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-strong">{item.title}</p>
                <p className="mt-0.5 text-xs text-subtle">{item.body}</p>
                <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary-600">
                  {item.ctaLabel} <span className="text-sm">→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-subtle">
        Actions on your profile
      </p>

      {/* One grouped list, consistent row height/icon/chevron — a full-width
          card for a single "Personal details" row read as an oddly heavy
          block next to this list; it's just the first row here now. */}
      <Card className="divide-y divide-border p-0">
        {student && (
          <Row
            href="/me/profile/edit"
            title="Personal details"
            sub="Edit your academic & personal info"
            icon={<UserIcon />}
            tint="rose"
          />
        )}
        <Row href="/me/resume" title="Resume" sub="Upload & share your resume" icon={<DocIcon />} tint="lavender" />
        <Row href="/me/jobs" title="Jobs" sub="Browse & apply" icon={<BriefcaseIcon />} tint="mint" />
        <Row
          href="/me/applications"
          title="My applications"
          sub="Track your status"
          icon={<ListIcon />}
          tint="cream"
        />
        <Row
          href="/me/internships"
          title="Internships"
          sub="Add internships you found"
          icon={<StarIcon />}
          tint="rose"
        />
        <Row
          href="/me/feedback"
          title="Placement Feedback"
          sub="Share your end-of-season feedback"
          icon={<ChartIcon />}
          tint="lavender"
        />
        <Row
          href="/me/notifications"
          title="Notifications"
          sub="Alerts on your account"
          icon={<BellIcon />}
          tint="mint"
        />
        <Row
          href="/me/change-password"
          title="Change password"
          sub="Update your login password"
          icon={<LockIcon />}
          tint="cream"
        />
      </Card>

      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="flex w-full items-center gap-4 rounded-card border border-border bg-white p-4 text-left transition hover:shadow-card press press-bg disabled:opacity-60"
      >
        <IconBox>
          <LogoutIcon />
        </IconBox>
        <div className="flex-1">
          <p className="text-sm font-semibold text-danger">
            {signingOut ? 'Signing out…' : 'Sign out'}
          </p>
          <p className="text-xs text-subtle">
            {signingOut ? 'Please wait' : 'Log out of this device'}
          </p>
        </div>
      </button>
    </div>
  );
}

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

function Row({
  href,
  title,
  sub,
  icon,
  tint = 'lavender',
}: {
  href: string;
  title: string;
  sub: string;
  icon: React.ReactNode;
  tint?: Tint;
}) {
  return (
    <Link href={href} className="flex items-center gap-4 px-4 py-4 transition hover:bg-app/50 press press-bg">
      <IconBox tint={tint}>{icon}</IconBox>
      <div className="flex-1">
        <p className="text-sm font-semibold text-strong">{title}</p>
        <p className="text-xs text-subtle">{sub}</p>
      </div>
      <Arrow />
    </Link>
  );
}

function IconBox({ children, tint }: { children: React.ReactNode; tint?: Tint }) {
  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
        tint ? `${TINT_BG[tint]} ${TINT_FG[tint]}` : 'bg-app text-strong'
      }`}
    >
      {children}
    </div>
  );
}

function Arrow() {
  return <span className="shrink-0 text-lg text-subtle">→</span>;
}

function initial(name?: string): string {
  return (name?.trim()?.[0] ?? 'S').toUpperCase();
}
function verLabel(status: string): string {
  if (status === 'SUBMITTED') return 'Under review';
  if (status === 'REJECTED') return 'Needs changes';
  return 'Not verified';
}

// ── icons ──
const sv = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  className: 'h-5 w-5',
} as const;
function UserIcon() {
  return (
    <svg {...sv}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round" />
    </svg>
  );
}
function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
      <path d="m16.5 3.5 4 4L7 21l-4.5.5.5-4.5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-2.5 w-2.5">
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg {...sv}>
      <path d="M6 2h8l4 4v16H6z" strokeLinejoin="round" />
      <path d="M14 2v4h4M9 13h6M9 17h6" strokeLinecap="round" />
    </svg>
  );
}
function BriefcaseIcon() {
  return (
    <svg {...sv}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg {...sv}>
      <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" strokeLinecap="round" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg {...sv}>
      <path
        d="m12 3 2.5 5 5.5.8-4 3.9.9 5.5L12 21l-4.9 2.6.9-5.5-4-3.9 5.5-.8z"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg {...sv}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg {...sv}>
      <path
        d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9M10 21a2 2 0 0 0 4 0"
        strokeLinecap="round"
      />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg {...sv}>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg {...sv}>
      <path d="M15 12H3m0 0 4-4m-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M9 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
