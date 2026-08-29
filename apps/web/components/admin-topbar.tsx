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

export function AdminTopbar() {
  const { user, loading, signOut } = useSession();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-white px-8">
      <input
        type="search"
        placeholder="Search…"
        className="h-10 w-72 rounded-pill border border-border bg-app px-4 text-sm outline-none transition focus:border-primary-400 focus:bg-white"
      />
      <div className="flex items-center gap-4">
        <NotificationBell href="/notifications" />

        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-sm font-semibold text-white">
            {loading || !user ? '··' : initials(user.fullName)}
          </span>
          <div className="leading-tight">
            <p className="text-sm font-medium text-strong">
              {loading ? 'Loading…' : (user?.fullName ?? 'Unknown')}
            </p>
            <p className="text-xs text-subtle">
              {user ? (ROLE_LABELS[user.role] ?? titleCaseRole(user.role)) : ''}
              {user?.college ? ` · ${user.college.name}` : ''}
            </p>
          </div>
        </div>

        <Link href="/settings/change-password">
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
