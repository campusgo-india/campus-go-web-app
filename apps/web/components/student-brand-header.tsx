'use client';

import { usePathname } from 'next/navigation';
import { useSession } from '../lib/session';
import { MAIN_ROUTES } from './mobile-bottom-nav';

/**
 * Slim brand strip at the top of the student shell. Shows the college's logo
 * when the Platform Admin uploaded one; otherwise the CampusGO wordmark.
 * Only rendered on the 4 tab-root screens — repeating "you're in St Francis
 * de Sales' app" chrome on every inner/detail screen just eats vertical
 * space for something the user already knows (Swiggy/CRED drop this kind of
 * banner entirely on inner screens).
 */
export function StudentBrandHeader() {
  const { user } = useSession();
  const pathname = usePathname();
  if (!MAIN_ROUTES.has(pathname)) return null;
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
