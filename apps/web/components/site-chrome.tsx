import Link from 'next/link';

const FOOTER_PLATFORM = [
  'Student Management',
  'Companies & Recruiters',
  'Jobs & Opportunities',
  'Training & Assessments',
  'Applications & Recruitment',
  'Internships & PPOs',
  'Alumni',
  'Communication',
  'Reports & Analytics',
];
const FOOTER_FOR = ['Colleges', 'Universities', 'Placement Teams', 'Students'];

/** Shared dark header across every public marketing page (home, about, contact). */
export function SiteHeader() {
  return (
    <header className="bg-[#0B1330]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-xl font-extrabold tracking-tight sm:text-2xl">
          <span className="text-primary-300">Campus</span>
          <span className="text-primary-400">Go</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/#platform" className="text-sm font-medium text-white/75 hover:text-white">Platform</Link>
          <Link href="/#readiness" className="text-sm font-medium text-white/75 hover:text-white">Readiness</Link>
          <Link href="/about" className="text-sm font-medium text-white/75 hover:text-white">About</Link>
          <Link href="/contact" className="text-sm font-medium text-white/75 hover:text-white">Contact</Link>
        </nav>
        <Link
          href="/login"
          className="inline-flex h-10 items-center rounded-md border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white/95 hover:bg-white/15"
        >
          Login
        </Link>
      </div>
    </header>
  );
}

/** Shared dark footer across every public marketing page (home, about, contact). */
export function SiteFooter() {
  return (
    <footer className="bg-[#0B1330] px-6 pb-7 pt-14">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 gap-8 border-b border-white/10 pb-10 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <div className="text-lg font-extrabold">
              <span className="text-primary-300">Campus</span>
              <span className="text-primary-400">Go</span>
            </div>
            <p className="mt-1 text-xs font-medium text-white/50">From Campus to Career</p>
            <p className="mt-3 max-w-[220px] text-xs leading-relaxed text-white/50">
              The complete placement &amp; career readiness platform for colleges and universities.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/40">Platform</p>
            <div className="mt-4 flex flex-col gap-2.5">
              {FOOTER_PLATFORM.map((p) => (
                <span key={p} className="text-sm text-white/65">{p}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/40">For</p>
            <div className="mt-4 flex flex-col gap-2.5">
              {FOOTER_FOR.map((f) => (
                <span key={f} className="text-sm text-white/65">{f}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/40">Company</p>
            <div className="mt-4 flex flex-col gap-2.5">
              <Link href="/about" className="text-sm text-white/65 hover:text-white">About CampusGo</Link>
              <Link href="/contact" className="text-sm text-white/65 hover:text-white">Contact</Link>
              <Link href="/contact?intent=demo" className="text-sm text-white/65 hover:text-white">Request a Demo</Link>
              <Link href="/login" className="text-sm text-white/65 hover:text-white">Login</Link>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 pt-6 sm:flex-row sm:justify-between">
          <span className="text-xs text-white/35">© {new Date().getFullYear()} CampusGo. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="text-xs text-white/35 hover:text-white/60">Privacy</Link>
            <Link href="/terms" className="text-xs text-white/35 hover:text-white/60">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
