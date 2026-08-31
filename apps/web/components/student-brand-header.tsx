'use client';

import { usePathname } from 'next/navigation';
import { useSession } from '../lib/session';
import { MAIN_ROUTES } from './mobile-bottom-nav';
import { NotificationBell } from './notification-bell';

/**
 * Slim brand strip at the top of the student shell — college icon/logo +
 * name on the left, the notification bell on the right (the reference
 * mockup's Home header). Only rendered on the 4 tab-root screens —
 * repeating "you're in St Francis de Sales' app" chrome on every
 * inner/detail screen just eats vertical space for something the user
 * already knows (Swiggy/CRED drop this kind of banner entirely on inner
 * screens).
 */
export function StudentBrandHeader() {
  const { user } = useSession();
  const pathname = usePathname();
  if (!MAIN_ROUTES.has(pathname)) return null;
  return (
    <header className="flex h-16 items-center justify-between px-5">
      {user?.college?.logoUrl ? (
        <div className="flex min-w-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- remote blob URL, next/image not configured */}
          <img
            src={user.college.logoUrl}
            alt={user.college.name}
            className="h-11 w-11 shrink-0 rounded-md object-contain"
          />
          <span className="truncate text-sm font-semibold text-strong">{user.college.name}</span>
        </div>
      ) : (
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-tint-lavender text-tint-lavender-fg">
            <CapIcon />
          </span>
          <span className="truncate text-sm font-semibold text-strong">
            {user?.college?.name ?? 'CampusGo'}
          </span>
        </div>
      )}
      <NotificationBell
        href="/me/notifications"
        className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tint-lavender text-tint-lavender-fg"
      />
    </header>
  );
}

function CapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-[18px] w-[18px]">
      <path d="M2 9l10-5 10 5-10 5-10-5Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 11v5c0 1.5 2.5 3 6 3s6-1.5 6-3v-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 9v6" strokeLinecap="round" />
    </svg>
  );
}
