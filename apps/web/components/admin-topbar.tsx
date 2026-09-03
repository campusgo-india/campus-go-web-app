'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from '../lib/session';
import { NotificationBell } from './notification-bell';

const ROLE_LABELS: Record<string, string> = {
  PLATFORM_ADMIN: 'Platform Admin',
  COLLEGE_ADMIN: 'College Admin',
  PLACEMENT_OFFICER: 'Placement Officer',
  PLACEMENT_COORDINATOR: 'Placement Coordinator',
  MANAGEMENT: 'Management',
  TRAINING: 'Training',
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const roleLine = user
    ? `${ROLE_LABELS[user.role] ?? titleCaseRole(user.role)}${user.college ? ` · ${user.college.name}` : ''}`
    : '';

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

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-2.5 rounded-pill py-1 pl-1 pr-2 transition hover:bg-app"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-sm font-semibold text-white">
              {loading || !user ? '··' : initials(user.fullName)}
            </span>
            <span className="hidden leading-tight lg:block">
              <span className="block text-sm font-medium text-strong">
                {loading ? 'Loading…' : (user?.fullName ?? 'Unknown')}
              </span>
              <span className="block text-xs text-subtle">{roleLine}</span>
            </span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className={`hidden h-4 w-4 text-subtle transition sm:block ${menuOpen ? 'rotate-180' : ''}`}
            >
              <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-card border border-border bg-white py-1 shadow-card"
            >
              <div className="border-b border-border px-4 py-3 lg:hidden">
                <p className="text-sm font-medium text-strong">{user?.fullName ?? 'Unknown'}</p>
                <p className="text-xs text-subtle">{roleLine}</p>
              </div>
              <Link
                href="/settings/profile"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-sm text-body transition hover:bg-app"
              >
                Profile
              </Link>
              <Link
                href="/settings/change-password"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-sm text-body transition hover:bg-app"
              >
                Change password
              </Link>
              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  signOut();
                }}
                className="block w-full px-4 py-2.5 text-left text-sm text-danger transition hover:bg-app"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
