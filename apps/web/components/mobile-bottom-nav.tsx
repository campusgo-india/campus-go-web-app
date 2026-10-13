'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@campusgo/ui';

const items = [
  { href: '/me', label: 'Home', icon: HomeIcon },
  { href: '/me/jobs', label: 'Jobs', icon: BriefcaseIcon },
  { href: '/me/training', label: 'Training', icon: DocIcon },
  { href: '/me/training/assessments', label: 'Assessments', icon: ClipboardIcon },
  { href: '/me/training/calendar', label: 'Sessions', icon: CalendarIcon },
];

// Main tabs only. Sub-screens (job detail, applications, edit profile, …) hide the
// global nav and show their own contextual sticky action instead. Exported so
// StudentBrandHeader can hide the college-logo banner on the same screens —
// an inner/detail page shouldn't repeat "you're in this college's app" chrome
// the user already saw on the tab root.
// Profile is reached from the avatar at the top of Home rather than a tab, but it
// is still a root screen, so it keeps the nav and the college header.
export const MAIN_ROUTES = new Set([...items.map((i) => i.href), '/me/profile']);

/** Icon-above-label bar with a soft pill behind the active icon — a bare
 * color change + tiny dot read as too weak a "you are here" signal (CRED/
 * Swiggy both give the active tab a filled background), so the active
 * icon now sits on its own tint-lavender pill instead. */
export function MobileBottomNav() {
  const pathname = usePathname();
  if (!MAIN_ROUTES.has(pathname)) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className="press flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-1.5"
            >
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full transition',
                  active && 'bg-tint-lavender',
                )}
              >
                <Icon
                  className={cn('h-5 w-5 transition', active ? 'text-primary-600' : 'text-subtle')}
                  strokeWidth={active ? 2.2 : 1.8}
                />
              </span>
              <span
                className={cn(
                  'text-[10px] transition',
                  active ? 'font-semibold text-primary-600' : 'font-medium text-subtle',
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M3 10.5L12 3l9 7.5M5 9.5V21h14V9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function BriefcaseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" />
    </svg>
  );
}
function CalendarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}
function ClipboardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <rect x="5" y="4" width="14" height="18" rx="2" />
      <path d="M9 4V3h6v1M9 13l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function DocIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M6 2h8l4 4v16H6z" strokeLinejoin="round" />
      <path d="M14 2v4h4M9 13h6M9 17h6M9 9h2" strokeLinecap="round" />
    </svg>
  );
}
