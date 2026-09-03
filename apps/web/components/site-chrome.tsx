import Link from 'next/link';
import { SiteMobileMenu } from './site-mobile-menu';

const NAV_LINKS = [
  { href: '/product', label: 'Platform' },
  { href: '/readiness', label: 'Readiness' },
  { href: '/mobile', label: 'Mobile app' },
  { href: '/insights', label: 'Reports' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

const FOOTER_PRODUCT = [
  { href: '/product', label: 'Platform' },
  { href: '/readiness', label: 'Career Readiness' },
  { href: '/mobile', label: 'Mobile app' },
  { href: '/insights', label: 'Reports & Insights' },
];

/** Shared header across every public marketing page. */
export function SiteHeader() {
  return (
    <header className="border-b border-border bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- static public asset, next/image not configured */}
          <img src="/site-logo.png" alt="CampusGO — From Campus to Career" className="h-11 w-auto sm:h-12" />
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-body hover:text-primary-600">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden h-10 shrink-0 items-center rounded-md bg-gradient-primary px-4 text-sm font-semibold text-primary-foreground shadow-nav hover:opacity-95 md:inline-flex"
          >
            Login
          </Link>
          <SiteMobileMenu links={NAV_LINKS} />
        </div>
      </div>
    </header>
  );
}

/** Shared dark footer across every public marketing page. */
export function SiteFooter() {
  return (
    <footer className="bg-[#0B1330] px-6 pb-7 pt-14">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 gap-8 border-b border-white/10 pb-10 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-1">
            <div className="text-lg font-extrabold">
              <span className="text-primary-300">Campus</span>
              <span className="text-primary-400">GO</span>
            </div>
            <p className="mt-1 text-xs font-medium text-white/50">From Campus to Career</p>
            <p className="mt-3 max-w-[220px] text-xs leading-relaxed text-white/50">
              The complete placement &amp; career readiness platform for colleges and universities.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/40">Product</p>
            <div className="mt-4 flex flex-col gap-2.5">
              {FOOTER_PRODUCT.map((p) => (
                <Link key={p.href} href={p.href} className="text-sm text-white/65 hover:text-white">
                  {p.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/40">Company</p>
            <div className="mt-4 flex flex-col gap-2.5">
              <Link href="/about" className="text-sm text-white/65 hover:text-white">About CampusGO</Link>
              <Link href="/contact" className="text-sm text-white/65 hover:text-white">Contact</Link>
              <Link href="/contact?intent=demo" className="text-sm text-white/65 hover:text-white">Request a Demo</Link>
              <Link href="/login" className="text-sm text-white/65 hover:text-white">Login</Link>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 pt-6 sm:flex-row sm:justify-between">
          <span className="text-xs text-white/35">© {new Date().getFullYear()} CampusGO. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="text-xs text-white/35 hover:text-white/60">Privacy</Link>
            <Link href="/terms" className="text-xs text-white/35 hover:text-white/60">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
