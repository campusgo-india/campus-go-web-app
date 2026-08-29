import Link from 'next/link';

export const metadata = {
  title: 'CampusGO — Placement Intelligence & Career Success Platform',
  description:
    'CampusGO automates campus placements end-to-end: job postings, interview pipelines, notifications, and reporting for colleges — so placement teams save time and students never miss an opportunity.',
};

const STAKEHOLDER_FEATURES = [
  {
    title: 'Applications & pipeline',
    body: 'Post a job once and track every applicant through Applied → Shortlisted → Interview rounds → Offer, with a live funnel instead of spreadsheets.',
    tint: 'lavender' as const,
    icon: <PipelineIcon />,
  },
  {
    title: 'Notifications, not follow-ups',
    body: 'Every stage change notifies the student automatically, in-app and by email, sent from your own college identity.',
    tint: 'mint' as const,
    icon: <BellIcon />,
  },
  {
    title: 'Reports in one click',
    body: 'Export applicant lists, placement stats, and funnel breakdowns as CSV or Excel — named and ready for recruiters.',
    tint: 'cream' as const,
    icon: <ChartIcon />,
  },
  {
    title: 'A team, not a login',
    body: 'Bring on placement officers with scoped access, keep a record of who did what, and manage everything from one dashboard.',
    tint: 'rose' as const,
    icon: <TeamIcon />,
  },
];

const PROCESS_STEPS = [
  {
    n: '1',
    title: 'Post',
    accent: '#3B6EF5',
    items: ['Job postings & eligibility rules', 'Résumé & profile verification', 'Company & alumni records'],
  },
  {
    n: '2',
    title: 'Track',
    accent: '#1F9D6B',
    items: ['Live applicant funnel', 'Interview rounds & cohorts', 'Offer & CTC records'],
  },
  {
    n: '3',
    title: 'Notify',
    accent: '#C98A1B',
    items: ['In-app + email, automatic', 'Sent from your college identity', 'Every stage change, covered'],
  },
  {
    n: '4',
    title: 'Report',
    accent: '#E5484D',
    items: ['Funnel & placement analytics', 'CSV / Excel exports', 'Programme-wise breakdowns'],
  },
];

const STUDENT_FEATURES = [
  {
    title: 'Never miss an opening',
    body: 'New jobs and deadlines reach you the moment they’re posted, as a phone notification.',
    tint: 'lavender' as const,
  },
  {
    title: 'Apply in one tap',
    body: 'Eligibility is checked automatically, so the jobs you see are the ones you can actually apply to.',
    tint: 'mint' as const,
  },
  {
    title: 'Know where you stand',
    body: "Every application's status is visible in one place, updated the moment your placement team acts.",
    tint: 'cream' as const,
  },
];

const TINT_BG: Record<'lavender' | 'mint' | 'cream' | 'rose', string> = {
  lavender: 'bg-tint-lavender',
  mint: 'bg-tint-mint',
  cream: 'bg-tint-cream',
  rose: 'bg-tint-rose',
};
const TINT_FG: Record<'lavender' | 'mint' | 'cream' | 'rose', string> = {
  lavender: 'text-tint-lavender-fg',
  mint: 'text-tint-mint-fg',
  cream: 'text-tint-cream-fg',
  rose: 'text-tint-rose-fg',
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-app">
      {/* ============ HEADER ============ */}
      <header className="bg-[#0B1330]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="text-xl font-extrabold tracking-tight sm:text-2xl">
            <span className="text-primary-300">Campus</span>
            <span className="text-primary-400">GO</span>
          </span>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#platform" className="text-sm font-medium text-white/75 hover:text-white">
              Product
            </a>
            <a href="#officers" className="text-sm font-medium text-white/75 hover:text-white">
              For officers
            </a>
            <a href="#students" className="text-sm font-medium text-white/75 hover:text-white">
              For students
            </a>
          </nav>
          <Link
            href="/login"
            className="inline-flex h-10 items-center rounded-md border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white/95 hover:bg-white/15"
          >
            Login
          </Link>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-[#0B1330]">
        <div
          className="pointer-events-none absolute -right-24 -top-40 h-[560px] w-[560px] rounded-full opacity-70"
          style={{ background: 'radial-gradient(circle, rgba(91,141,239,0.35) 0%, rgba(11,19,48,0) 70%)' }}
        />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-12 px-6 py-16 sm:py-20 lg:flex-row lg:items-center lg:py-24">
          <div className="w-full max-w-xl text-center lg:text-left">
            <span className="inline-flex items-center rounded-full bg-primary-400/15 px-3.5 py-1.5 text-xs font-medium text-primary-300">
              Placement Intelligence &amp; Career Success Platform
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
              Campus placements,
              <br />
              run on autopilot.
            </h1>
            <p className="mt-3 text-xl font-semibold text-primary-400 sm:text-2xl">
              {'{ without the spreadsheets and WhatsApp follow-ups }'}
            </p>
            <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-white/60 lg:mx-0">
              CampusGO replaces spreadsheets, WhatsApp groups, and manual follow-ups with one
              platform — job postings, interview pipelines, and notifications that run themselves —
              so placement teams get their time back and no student misses an opportunity.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/login"
                className="inline-flex h-12 items-center rounded-md bg-gradient-primary px-6 text-sm font-semibold text-primary-foreground shadow-nav hover:opacity-95"
              >
                Login to your college
              </Link>
              <a href="#platform" className="text-sm font-semibold text-white/85 hover:text-white">
                See how it works ↓
              </a>
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 lg:justify-start">
              <TrustItem color="#6488FB">One branded portal per college</TrustItem>
              <TrustItem color="#5FD99E">In-app + email notifications, automatic</TrustItem>
              <TrustItem color="#F7B267">Multi-college, tenant-isolated by design</TrustItem>
            </div>
          </div>

          <div className="w-full max-w-md flex-shrink-0 lg:w-[420px]">
            <HeroGraphic />
          </div>
        </div>
      </section>

      {/* ============ VALUE STRIP ============ */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <ValueStat tint="lavender" icon={<BoltIcon />} label="Less manual work" body="Rounds, notifications, and reports that used to take hours now run automatically." />
          <ValueStat tint="mint" icon={<BellIcon />} label="Zero missed deadlines" body="Students get notified the instant something changes — no more checking a noticeboard." />
          <ValueStat tint="cream" icon={<BuildingIcon />} label="Built for many colleges" body="Each college gets its own branded, isolated portal — logo, email identity, and data." />
        </div>
      </section>

      {/* ============ ONE PLATFORM, EVERY STAKEHOLDER ============ */}
      <section id="platform" className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex flex-col items-start gap-12 lg:flex-row">
          <div className="w-full lg:w-[420px] lg:flex-shrink-0">
            <h2 className="text-3xl font-extrabold tracking-tight text-strong">
              One platform, every stakeholder
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-subtle">
              The same system that runs your placement season also gives students, officers, and
              college leadership their own view of it — no separate spreadsheets to keep in sync.
            </p>
            <div className="mt-7 overflow-hidden rounded-card shadow-card">
              <DashboardMockup />
            </div>
          </div>
          <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2">
            {STAKEHOLDER_FEATURES.map((f) => (
              <div key={f.title}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-md ${TINT_BG[f.tint]}`}>
                  <span className={TINT_FG[f.tint]}>{f.icon}</span>
                </div>
                <p className="mt-3.5 text-sm font-bold text-strong">{f.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-subtle">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PROCESS ============ */}
      <section className="bg-muted py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-strong">
              From spreadsheets to autopilot
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-subtle">
              We take a placement season from scattered spreadsheets and WhatsApp groups to one
              running system, in four steps.
            </p>
          </div>
          <div className="mt-11 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS_STEPS.map((s) => (
              <div
                key={s.n}
                className="rounded-card bg-card p-6 shadow-card"
                style={{ borderTop: `3px solid ${s.accent}` }}
              >
                <p className="text-2xl font-extrabold" style={{ color: s.accent }}>
                  {s.n}
                </p>
                <p className="mt-1.5 text-sm font-bold text-strong">{s.title}</p>
                <div className="mt-3.5 flex flex-col gap-2">
                  {s.items.map((it) => (
                    <span key={it} className="text-xs text-body">
                      {it}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FOR STUDENTS ============ */}
      <section id="students" className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-col items-center gap-12 lg:flex-row">
          <div className="w-full max-w-md text-center lg:max-w-none lg:flex-1 lg:text-left">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-600">
              For students
            </span>
            <h2 className="mt-2.5 text-3xl font-extrabold tracking-tight text-strong">
              Your placement journey, on your phone.
            </h2>
            <p className="mx-auto mt-3.5 max-w-md text-sm leading-relaxed text-subtle lg:mx-0">
              Install it like an app — new jobs, eligibility, and offer updates reach students the
              moment they happen, not on a noticeboard they have to walk past.
            </p>
            <div className="mx-auto mt-8 flex max-w-md flex-col gap-5 text-left lg:mx-0">
              {STUDENT_FEATURES.map((f) => (
                <div key={f.title} className="flex gap-3.5">
                  <div className={`flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-md ${TINT_BG[f.tint]}`}>
                    <span className={TINT_FG[f.tint]}>
                      <CheckIcon />
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-strong">{f.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-subtle">{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex w-full max-w-[260px] flex-shrink-0 justify-center lg:w-[300px]">
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="relative overflow-hidden rounded-card bg-[#0B1330] px-8 py-12 sm:px-14">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(91,141,239,0.4) 0%, rgba(11,19,48,0) 70%)' }}
          />
          <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="max-w-md">
              <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-[28px]">
                Ready to run this season on autopilot?
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-white/60">
                Placement officers, college admins, and students all sign in from the same place —
                no separate app to install.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex h-12 flex-shrink-0 items-center rounded-md bg-gradient-primary px-6 text-sm font-semibold text-primary-foreground shadow-nav hover:opacity-95"
            >
              Login to your college
            </Link>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="bg-[#0B1330] px-6 pb-7 pt-14">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 gap-8 border-b border-white/10 pb-10 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <div className="text-lg font-extrabold">
                <span className="text-primary-300">Campus</span>
                <span className="text-primary-400">GO</span>
              </div>
              <p className="mt-3 max-w-[220px] text-xs leading-relaxed text-white/50">
                Placement Intelligence &amp; Career Success Platform — one system for job postings,
                interview pipelines, and notifications.
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/40">Product</p>
              <div className="mt-4 flex flex-col gap-3">
                <a href="#officers" className="text-sm text-white/65 hover:text-white">For placement officers</a>
                <a href="#students" className="text-sm text-white/65 hover:text-white">For students</a>
                <Link href="/login" className="text-sm text-white/65 hover:text-white">Login</Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/40">Company</p>
              <div className="mt-4 flex flex-col gap-3">
                <span className="text-sm text-white/65">About</span>
                <span className="text-sm text-white/65">Blog</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/40">Contact</p>
              <div className="mt-4 flex flex-col gap-3">
                <a href="mailto:campusgo@campusgoindia.com" className="text-sm text-white/65 hover:text-white">
                  campusgo@campusgoindia.com
                </a>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3 pt-6 sm:flex-row sm:justify-between">
            <span className="text-xs text-white/35">© {new Date().getFullYear()} CampusGO. All rights reserved.</span>
            <div className="flex gap-4">
              <Link href="/privacy" className="text-xs text-white/35 hover:text-white/60">
                Privacy
              </Link>
              <Link href="/terms" className="text-xs text-white/35 hover:text-white/60">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TrustItem({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-sm text-white/70">{children}</span>
    </div>
  );
}

function ValueStat({
  tint,
  icon,
  label,
  body,
}: {
  tint: 'lavender' | 'mint' | 'cream';
  icon: React.ReactNode;
  label: string;
  body: string;
}) {
  return (
    <div className="rounded-card bg-card p-6 shadow-card">
      <div className={`flex h-11 w-11 items-center justify-center rounded-md ${TINT_BG[tint]}`}>
        <span className={TINT_FG[tint]}>{icon}</span>
      </div>
      <p className="mt-4 text-sm font-bold text-strong">{label}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-subtle">{body}</p>
    </div>
  );
}

/** Abstract "pipeline" hero graphic — stylized job cards flowing through stages,
 * not a screenshot of the real product (no fabricated data). */
function HeroGraphic() {
  return (
    <svg viewBox="0 0 420 460" fill="none" className="w-full">
      <defs>
        <linearGradient id="hg1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7CC0FF" /><stop offset="1" stopColor="#5B8DEF" />
        </linearGradient>
        <linearGradient id="hg2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A9B6FF" /><stop offset="1" stopColor="#7C8BFF" />
        </linearGradient>
        <linearGradient id="hg3" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5B8DEF" /><stop offset="1" stopColor="#3B6EF5" />
        </linearGradient>
      </defs>
      <line x1="70" y1="90" x2="330" y2="370" stroke="rgba(255,255,255,0.16)" strokeWidth="2" strokeDasharray="3 8" />
      <rect x="20" y="40" width="200" height="88" rx="16" fill="url(#hg1)" opacity="0.92" transform="rotate(-6 120 84)" />
      <rect x="150" y="160" width="220" height="88" rx="16" fill="url(#hg2)" opacity="0.95" transform="rotate(4 260 204)" />
      <rect x="60" y="290" width="230" height="88" rx="16" fill="url(#hg3)" transform="rotate(-3 175 334)" />
      <circle cx="330" cy="120" r="26" fill="#0B1330" stroke="#6488FB" strokeWidth="2" />
      <path d="M320 120l7 7 13-14" stroke="#8FAEFF" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="60" cy="380" r="5" fill="#8FAEFF" />
      <circle cx="380" cy="40" r="5" fill="#A9B6FF" />
    </svg>
  );
}

/** Stylized dashboard mockup with a couple of skeleton-loading bars for
 * authenticity — no real numbers or customer data, purely illustrative. */
function DashboardMockup() {
  return (
    <svg viewBox="0 0 420 280" fill="none" className="w-full">
      <rect width="420" height="280" fill="#EEF3FF" />
      <rect x="24" y="24" width="180" height="110" rx="10" fill="#fff" stroke="#E6E9F0" />
      <rect x="40" y="40" width="90" height="10" rx="5" fill="#DCE6FF" />
      <rect x="40" y="60" width="140" height="8" rx="4" fill="#EDF0F6" />
      <rect x="40" y="76" width="120" height="8" rx="4" fill="#EDF0F6" />
      <rect x="40" y="100" width="60" height="22" rx="6" fill="#3B6EF5" />
      <rect x="216" y="24" width="180" height="110" rx="10" fill="#fff" stroke="#E6E9F0" />
      <circle cx="250" cy="60" r="16" fill="#E7F6EF" />
      <rect x="276" y="52" width="100" height="8" rx="4" fill="#EDF0F6" />
      <rect x="276" y="66" width="70" height="8" rx="4" fill="#EDF0F6" />
      <rect x="236" y="96" width="140" height="8" rx="4" fill="#FFF4E0" />
      <rect x="24" y="146" width="372" height="110" rx="10" fill="#fff" stroke="#E6E9F0" />
      <rect x="44" y="164" width="332" height="10" rx="5" fill="#F4F6FB" className="animate-pulse" />
      <rect x="44" y="184" width="220" height="10" rx="5" fill="#F4F6FB" className="animate-pulse" />
      <rect x="44" y="204" width="200" height="10" rx="5" fill="#DCE6FF" />
      <rect x="44" y="228" width="90" height="20" rx="6" fill="#1F9D6B" opacity="0.85" />
    </svg>
  );
}

/** Illustrative phone mockup of the student applications view — sample
 * companies/roles, not real student data. */
function PhoneMockup() {
  return (
    <div className="w-full max-w-[260px] rounded-[32px] bg-strong p-2.5 shadow-2xl">
      <div className="overflow-hidden rounded-3xl bg-app">
        <div className="flex h-[108px] flex-col justify-end bg-gradient-primary px-4 pb-4">
          <span className="text-[11px] text-white/80">Welcome back</span>
          <span className="text-base font-bold text-white">Hi, Aditi</span>
        </div>
        <div className="flex flex-col gap-2.5 p-3.5">
          <PhoneCard title="Software Engineer" company="Acme Technologies" tint="mint" status="Selected" />
          <PhoneCard title="Data Analyst" company="Nova Systems" tint="lavender" status="Round 2" />
          <PhoneCard title="Product Intern" company="Bright Labs" tint="cream" status="Applied" />
          <div className="flex flex-col gap-1.5 rounded-md bg-card p-3 shadow-card">
            <div className="h-3 w-[60%] animate-pulse rounded-md bg-app" />
            <div className="h-2 w-[40%] animate-pulse rounded-md bg-app" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PhoneCard({
  title,
  company,
  status,
  tint,
}: {
  title: string;
  company: string;
  status: string;
  tint: 'lavender' | 'mint' | 'cream';
}) {
  return (
    <div className="rounded-md bg-card p-3 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-bold text-strong">{title}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TINT_BG[tint]} ${TINT_FG[tint]}`}>
          {status}
        </span>
      </div>
      <span className="text-[10.5px] text-subtle">{company}</span>
    </div>
  );
}

// ── icons (stroke-based, 24px grid, no emoji) ──
const sv = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, className: 'h-5 w-5' } as const;
function PipelineIcon() {
  return (
    <svg {...sv}>
      <rect x="3" y="4" width="7" height="7" rx="1.5" />
      <rect x="14" y="4" width="7" height="7" rx="1.5" />
      <rect x="3" y="13" width="7" height="7" rx="1.5" />
      <rect x="14" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg {...sv}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9M10 21a2 2 0 0 0 4 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg {...sv}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function TeamIcon() {
  return (
    <svg {...sv}>
      <rect x="3" y="3" width="7" height="18" rx="1.5" />
      <rect x="14" y="3" width="7" height="10" rx="1.5" />
    </svg>
  );
}
function BoltIcon() {
  return (
    <svg {...sv}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function BuildingIcon() {
  return (
    <svg {...sv}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v3M16 3v3" strokeLinecap="round" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
