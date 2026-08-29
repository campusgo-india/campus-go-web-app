'use client';

import { useEffect } from 'react';
import { detectAppShell } from '../lib/app-shell';

/**
 * Mounted once in the root layout, above every route. Marks this browser
 * instance as the wrapped native app (see lib/app-shell.ts) if the cold-start
 * URL carries the launch marker. Renders nothing — this only needs to run
 * once, as early as possible, before SessionProvider's bootstrap fetch
 * resolves.
 */
export function AppShellBoundary() {
  useEffect(() => {
    detectAppShell();
  }, []);
  return null;
}
