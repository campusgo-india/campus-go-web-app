'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@campusgo/shared';
import { api, getAccessToken, setAccessToken, tryRefresh } from './api';
import { mutate } from './use-api';

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  collegeId: string | null;
  avatarUrl: string | null;
  mustChangePassword?: boolean;
  /** True if this College Admin is the designated College Head. */
  isCollegeHead?: boolean;
  /** PLACEMENT_COORDINATOR only: the programmes they're responsible for. */
  assignedProgrammes?: string[];
  college?: { id: string; name: string; slug: string; logoUrl: string | null } | null;
}

interface SessionContextValue {
  user: SessionUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const clearRoleCookie = () => {
  document.cookie = 'campusgo_role=; path=/; max-age=0';
};

/**
 * Bootstraps and holds the client session. On mount (e.g. after a page reload
 * that clears the in-memory access token) it restores the token from the
 * httpOnly refresh cookie, then loads the current user. If there's no valid
 * session it clears the routing cookie and redirects to `loginPath`.
 *
 * `loginPath` defaults to /login (the shared staff+student form); the
 * student route group passes /student-login instead, so an unauthenticated
 * visit anywhere under /me lands on the student-only entry point rather than
 * the general one — this is also what makes the wrapped native app (which
 * only ever opens /me) effectively student-only, with no separate "app
 * mode" detection needed.
 */
export function SessionProvider({
  children,
  loginPath = '/login',
}: {
  children: React.ReactNode;
  loginPath?: string;
}) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!getAccessToken()) {
          // Shared/deduped with any concurrent page data-fetch refresh so the
          // single-use refresh cookie isn't rotated twice in parallel.
          await tryRefresh();
        }
        const me = await api<SessionUser>('/auth/me');
        if (active) setUser(me);
      } catch {
        if (active) {
          setAccessToken(null);
          clearRoleCookie();
          setUser(null);
          router.replace(loginPath);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [router, loginPath]);

  const signOut = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      /* ignore — clear locally regardless */
    } finally {
      setAccessToken(null);
      clearRoleCookie();
      setUser(null);
      await mutate(() => true, undefined, { revalidate: false });
      router.replace(loginPath);
    }
  }, [router, loginPath]);

  return (
    <SessionContext.Provider value={{ user, loading, signOut }}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
