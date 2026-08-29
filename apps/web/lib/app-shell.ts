'use client';

const KEY = 'cg_app_shell';

/**
 * Call once, early, on every page load (see AppShellBoundary, mounted in the
 * root layout). If the URL carries the wrapped app's launch marker
 * (`?src=app` — set as the TWA's start_url in manifest.webmanifest),
 * persist it to localStorage: later client-side navigations/redirects won't
 * carry the query param, but the app still needs to know it's running
 * inside the native shell (see the student-only gate in lib/session.tsx).
 */
export function detectAppShell(): void {
  if (typeof window === 'undefined') return;
  try {
    if (new URLSearchParams(window.location.search).get('src') === 'app') {
      localStorage.setItem(KEY, '1');
    }
  } catch {
    // localStorage unavailable (private mode, storage disabled) — app-shell
    // gating just won't apply; the regular website behaviour is the safe
    // fallback, not a security hole (the backend has no notion of "app").
  }
}

/** True once this browser/app instance has been marked as the wrapped native app. */
export function isAppShell(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}
