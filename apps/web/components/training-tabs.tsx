'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@campusgo/ui';

const TABS: Array<{ href: string; label: string }> = [
  { href: '/training/dashboard', label: 'Dashboard' },
  { href: '/training', label: 'Assessments' },
  { href: '/training/sessions', label: 'Sessions' },
  { href: '/training/batches', label: 'Batches' },
  { href: '/training/feedback', label: 'Feedback' },
];

/**
 * Shared tab strip across every Training screen (Dashboard / Assessments /
 * Sessions / Batches / Feedback) so the module reads as one connected
 * workspace instead of five separate pages each sideways-linking to the
 * others via a scatter of outline buttons.
 */
export function TrainingTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border">
      {TABS.map((tab) => {
        // Assessments lives at the bare /training route, so match it
        // exactly; every other tab owns a whole subtree (e.g. a session's
        // /training/sessions/[id]/edit should still highlight "Sessions").
        const active = tab.href === '/training' ? pathname === '/training' : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition',
              active ? 'border-primary-600 text-primary-700' : 'border-transparent text-subtle hover:text-body',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
