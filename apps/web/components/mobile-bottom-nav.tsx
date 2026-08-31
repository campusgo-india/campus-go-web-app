'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@campusgo/ui';

const items = [
  { href: '/me', label: 'Home', icon: HomeIcon },
  { href: '/me/jobs', label: 'Jobs', icon: BriefcaseIcon },
  { href: '/me/training', label: 'Employability', icon: DocIcon },
  { href: '/me/profile', label: 'Profile', icon: UserIcon },
];

// Main tabs only. Sub-screens (job detail, applications, edit profile, …) hide the
// global nav and show their own contextual sticky action instead.
const MAIN_ROUTES = new Set(items.map((i) => i.href));

/** Clean icon-above-label bar — active tab just changes color, no pill
 * background. Matches the reference app's nav: white bar, colored active
 * icon+label, gray inactive, no floating/pill chrome. */
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
              className="press flex flex-col items-center gap-1 px-4 py-1.5"
            >
              <Icon
                className={cn('h-5 w-5 transition', active ? 'text-primary-600' : 'text-subtle')}
                strokeWidth={active ? 2.2 : 1.8}
              />
              <span
                className={cn(
                  'text-[11px] transition',
                  active ? 'font-semibold text-primary-600' : 'font-medium text-subtle',
                )}
              >
                {label}
              </span>
              <span
                className={cn(
                  'h-1 w-1 rounded-full transition',
                  active ? 'bg-primary-600' : 'bg-transparent',
                )}
              />
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
function UserIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round" />
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
