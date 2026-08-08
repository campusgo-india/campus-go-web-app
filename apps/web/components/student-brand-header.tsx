'use client';

import { useSession } from '../lib/session';

/**
 * Slim brand strip at the top of the student shell. Shows the college's logo
 * when the Platform Admin uploaded one; otherwise the CampusGO wordmark.
 */
export function StudentBrandHeader() {
  const { user } = useSession();
  return (
    <header className="flex h-12 items-center px-5">
      {user?.college?.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote blob URL, next/image not configured
        <img
          src={user.college.logoUrl}
          alt={user.college.name}
          className="h-7 w-auto max-w-[70%] object-contain"
        />
      ) : (
        <span className="text-lg font-bold">
          <span className="text-primary-700">Campus</span>
          <span className="text-primary-400">GO</span>
        </span>
      )}
    </header>
  );
}
