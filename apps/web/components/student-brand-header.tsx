'use client';

import { useSession } from '../lib/session';

/**
 * Slim brand strip at the top of the student shell. Shows the college's logo
 * when the Platform Admin uploaded one; otherwise the CampusGO wordmark.
 */
export function StudentBrandHeader() {
  const { user } = useSession();
  return (
    <header className="flex h-16 items-center px-5">
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
        // eslint-disable-next-line @next/next/no-img-element -- static public asset, next/image not configured
        <img src="/logo.png" alt="CampusGo" className="h-9 w-auto object-contain" />
      )}
    </header>
  );
}
