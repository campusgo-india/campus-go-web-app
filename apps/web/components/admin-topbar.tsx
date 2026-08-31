'use client';

import Link from 'next/link';
import { Button } from '@campusgo/ui';
import { useSession } from '../lib/session';
import { NotificationBell } from './notification-bell';

const ROLE_LABELS: Record<string, string> = {
  PLATFORM_ADMIN: 'Platform Admin',
  COLLEGE_ADMIN: 'College Admin',
  PLACEMENT_OFFICER: 'Placement Officer',
  PLACEMENT_COORDINATOR: 'Placement Coordinator',
  STUDENT: 'Student',
};

/** Fallback for any role added later without a ROLE_LABELS entry — turns
 * SCREAMING_SNAKE_CASE into Title Case instead of leaking the raw enum. */
function titleCaseRole(role: string): string {
  return role
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function AdminTopbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, loading, signOut } = useSession();

  return (
    <header className="flex h-16 items-center justify-between gap-3 border-b border-border bg-white px-4 md:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="shrink-0 rounded-md p-2 text-body hover:bg-app md:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        </button>
        <input
          type="search"
          placeholder="Search…"
          className="hidden h-10 w-72 rounded-pill border border-border bg-app px-4 text-sm outline-none transition focus:border-primary-400 focus:bg-white md:block"
        />
      </div>
      <div className="flex shrink-0 items-center gap-2 md:gap-4">
        <NotificationBell href="/notifications" />

        <div className="hidden items-center gap-3 sm:flex">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-sm font-semibold text-white">
            {loading || !user ? '··' : initials(user.fullName)}
          </span>
          <div className="hidden leading-tight lg:block">
            <p className="text-sm font-medium text-strong">
              {loading ? 'Loading…' : (user?.fullName ?? 'Unknown')}
            </p>
            <p className="text-xs text-subtle">
              {user ? (ROLE_LABELS[user.role] ?? titleCaseRole(user.role)) : ''}
              {user?.college ? ` · ${user.college.name}` : ''}
            </p>
          </div>
        </div>

        <Link href="/settings/change-password" className="hidden md:block">
          <Button variant="ghost" size="sm">
            Change password
          </Button>
        </Link>

        <Button variant="ghost" size="sm" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
