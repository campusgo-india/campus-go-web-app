'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@campusgo/ui';
import { UserRole } from '@campusgo/shared';
import { useSession } from '../lib/session';

interface NavItem {
  href: string;
  label: string;
}

// Platform Admin only provisions tenants — create a college + its super-admin.
// All student/company/job/alumni data lives inside each college, managed by
// that college's own admins/officers (never the platform).
const PLATFORM_NAV: NavItem[] = [
  { href: '/platform/dashboard', label: 'Dashboard' },
  { href: '/platform/colleges', label: 'Colleges' },
  { href: '/platform/jobs', label: 'Jobs' },
];

// College Admin + Placement Officer share the operational shell.
const COLLEGE_NAV: NavItem[] = [
  { href: '/placement', label: 'Dashboard' },
  { href: '/students', label: 'Students' },
  { href: '/companies', label: 'Companies' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/placement-policy', label: 'Placement Policy' },
  { href: '/alumni', label: 'Alumni' },
  { href: '/internships', label: 'Internships' },
  { href: '/training', label: 'Training' },
  { href: '/feedback', label: 'Feedback' },
  { href: '/reports', label: 'Reports' },
];

// Team (user management) and the school catalog are College Admin only.
const TEAM_NAV: NavItem = { href: '/settings/team', label: 'Team' };

// Offer-limit is a policy-level control (who gets blocked from applying, and
// the ability to change the threshold) — College Admin only, not Placement
// Officer/Coordinator (also enforced backend-side, see placement-policy
// controller).
const OFFER_LIMIT_NAV: NavItem = { href: '/offer-limit', label: 'Offer Limit' };

// Placement Coordinator: read-only, complete visibility into everything
// related to their department — students/jobs/internships are scoped to
// their assigned programmes; the placement dashboard and feedback views are
// currently college-wide (not yet programme-scoped).
const COORDINATOR_NAV: NavItem[] = [
  { href: '/placement', label: 'Dashboard' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/internships', label: 'Internships' },
  { href: '/training/dashboard', label: 'Training' },
  { href: '/feedback', label: 'Feedback' },
];

// Management: read-only, broader than a coordinator — visibility into every
// department's numbers, not just their own programmes (backend queries are
// college-wide, same as Coordinator). No Students/Placement Policy.
const MANAGEMENT_NAV: NavItem[] = [
  { href: '/placement', label: 'Dashboard' },
  { href: '/companies', label: 'Companies' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/alumni', label: 'Alumni' },
  { href: '/internships', label: 'Internships' },
  { href: '/training/dashboard', label: 'Training' },
  { href: '/feedback', label: 'Feedback' },
  { href: '/reports', label: 'Reports' },
];

// Training: the training department's own login — full manage access
// scoped to the Training module only (assessments/sessions/batches/
// attendance/feedback analytics), plus the read-only main dashboard.
const TRAINING_NAV: NavItem[] = [
  { href: '/placement', label: 'Dashboard' },
  { href: '/training', label: 'Training' },
];

function navFor(role: UserRole | undefined): NavItem[] {
  if (role === UserRole.PLATFORM_ADMIN) return PLATFORM_NAV;
  if (role === UserRole.COLLEGE_ADMIN) return [...COLLEGE_NAV, OFFER_LIMIT_NAV, TEAM_NAV];
  if (role === UserRole.PLACEMENT_OFFICER) return COLLEGE_NAV;
  if (role === UserRole.PLACEMENT_COORDINATOR) return COORDINATOR_NAV;
  if (role === UserRole.MANAGEMENT) return MANAGEMENT_NAV;
  if (role === UserRole.TRAINING) return TRAINING_NAV;
  return []; // unknown / still bootstrapping — render no role-specific links
}

// On a narrow screen — which is what the wrapped native app always is — a
// College Admin/Officer/Coordinator gets a reduced nav: Dashboard to get
// back to their home, Jobs, and Training. The full desktop sidebar is
// unaffected; this only trims the mobile drawer. Platform Admin's own nav is
// already this short (Dashboard/Colleges/Jobs), so it's left as-is rather
// than losing Colleges to the filter below.
const MOBILE_PRIMARY_LABELS = new Set(['Dashboard', 'Jobs', 'Training']);

function mobileNavFor(role: UserRole | undefined, fullNav: NavItem[]): NavItem[] {
  if (role === UserRole.PLATFORM_ADMIN) return fullNav;
  return fullNav.filter((item) => MOBILE_PRIMARY_LABELS.has(item.label));
}

function Brand({ college }: { college?: { name: string; logoUrl: string | null } | null }) {
  return college?.logoUrl ? (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- remote blob URL, next/image not configured */}
      <img src={college.logoUrl} alt={college.name} className="h-14 w-14 shrink-0 rounded-md object-contain" />
      <span className="text-sm font-semibold leading-tight text-strong">{college.name}</span>
    </div>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- static public asset, next/image not configured
    <img src="/logo.png" alt="CampusGo" className="h-11 w-auto object-contain" />
  );
}

function NavLinks({ nav, ready, onNavigate }: { nav: NavItem[]; ready: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {!ready &&
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="mx-1 my-1 h-7 animate-pulse rounded-md bg-primary-50" />
        ))}
      {nav.map(({ href, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              'rounded-md px-3 py-2.5 text-sm font-medium text-body transition hover:bg-primary-50',
              active && 'bg-primary-50 text-primary-700',
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Fixed sidebar on desktop (>=md); on smaller screens (needed now that
 * Placement Officers also use the wrapped phone app, not just College Admins
 * at a desk) it's replaced by a slide-in drawer, opened via the hamburger
 * button AdminTopbar renders on narrow screens.
 */
export function AdminSidebar({
  mobileOpen,
  onCloseMobile,
}: {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const { user, loading } = useSession();
  // Until the session resolves we don't know the role. Falling back to a default
  // nav here flashes the wrong menu on every reload (e.g. a Platform Admin
  // briefly sees college links). Show neutral placeholders until role is known.
  const ready = !loading && !!user;
  const nav = ready ? navFor(user.role) : [];
  const mobileNav = ready ? mobileNavFor(user.role, nav) : [];

  // Close the drawer automatically once a link has actually navigated.
  useEffect(() => {
    onCloseMobile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Portal to document.body — the admin shell's page-transition wrapper
  // (see (admin)/template.tsx) has a CSS transform animation, which
  // silently confines `fixed inset-0` to that ancestor's box instead of
  // the real viewport if rendered inline.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-white px-4 py-6 md:flex">
        <div className="px-3 pb-8">
          <Brand college={user?.college} />
        </div>
        <NavLinks nav={nav} ready={ready} />
      </aside>

      {mobileOpen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/40" onClick={onCloseMobile} />
            <aside className="animate-pop absolute inset-y-0 left-0 flex w-72 flex-col overflow-y-auto bg-white px-4 py-6 shadow-nav">
              <div className="flex items-center justify-between px-3 pb-8">
                <Brand college={user?.college} />
                <button
                  onClick={onCloseMobile}
                  aria-label="Close menu"
                  className="rounded-md p-1.5 text-subtle hover:bg-app hover:text-strong"
                >
                  ✕
                </button>
              </div>
              <NavLinks nav={mobileNav} ready={ready} onNavigate={onCloseMobile} />
            </aside>
          </div>,
          document.body,
        )}
    </>
  );
}
