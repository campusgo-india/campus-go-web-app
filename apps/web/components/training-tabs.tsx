'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@campusgo/ui';
import { useSession } from '../lib/session';

const TABS: Array<{ href: string; label: string }> = [
  { href: '/training/dashboard', label: 'Dashboard' },
  { href: '/training', label: 'Assessments' },
  { href: '/training/sessions', label: 'Sessions' },
  { href: '/training/batches', label: 'Batches' },
  { href: '/training/feedback', label: 'Feedback' },
];

// Placement Coordinator and Management only have read access to the rollup
// Dashboard + Feedback analytics (see training/dashboard and
// training/feedback controllers) — Assessments/Sessions/Batches would 403,
// so those tabs are hidden rather than shown as a dead end.
const READ_ONLY_LABELS = new Set(['Dashboard', 'Feedback']);
const READ_ONLY_ROLES = new Set(['PLACEMENT_COORDINATOR', 'MANAGEMENT']);

/**
 * Shared tab strip across every Training screen (Dashboard / Assessments /
 * Sessions / Batches / Feedback) so the module reads as one connected
 * workspace instead of five separate pages each sideways-linking to the
 * others via a scatter of outline buttons.
 */
export function TrainingTabs() {
  const pathname = usePathname();
  const { user } = useSession();
  const tabs = user && READ_ONLY_ROLES.has(user.role)
    ? TABS.filter((t) => READ_ONLY_LABELS.has(t.label))
    : TABS;
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((tab) => {
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
