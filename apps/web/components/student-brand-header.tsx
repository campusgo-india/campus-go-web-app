'use client';

import { usePathname } from 'next/navigation';
import { useSession } from '../lib/session';
import { MAIN_ROUTES } from './mobile-bottom-nav';
import { NotificationBell } from './notification-bell';

/**
 * Top strip of the student shell.
 *
 * - Home (`/me`): a personal greeting row — avatar, "Good evening!" + the
 *   student's first name · college, and the notification bell (the Swiggy-style
 *   Home header in the reference mockup).
 * - Other tab roots (Jobs / Employability / Profile): just the college name in
 *   small muted text, matching those mockups.
 * - Inner / detail screens: nothing — the user already knows which app they're
 *   in, and repeating the chrome only eats vertical space.
 */
export function StudentBrandHeader() {
  const { user } = useSession();
  const pathname = usePathname();
  if (!MAIN_ROUTES.has(pathname)) return null;

  const collegeName = user?.college?.name ?? 'CampusGo';

  if (pathname !== '/me') {
    return (
      <header className="px-5 pt-3">
        <p className="truncate text-sm font-semibold text-subtle">{collegeName}</p>
      </header>
    );
  }

  const fullName = user?.fullName?.trim() ?? '';
  const firstName = fullName.split(/\s+/)[0] || 'there';

  return (
    <header className="flex items-center justify-between gap-3 px-5 pt-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-700 text-base font-bold text-white shadow-nav">
          {(fullName[0] ?? 'S').toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-xs text-subtle">{greeting()}</p>
          <p className="truncate text-sm font-bold text-strong">
            {firstName} · {collegeName}
          </p>
        </div>
      </div>
      <NotificationBell
        href="/me/notifications"
        className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tint-lavender text-tint-lavender-fg"
      />
    </header>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning!';
  if (h < 17) return 'Good afternoon!';
  return 'Good evening!';
}
