import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader, SiteFooter } from '../../components/site-chrome';
import { PhoneCarousel } from '../../components/phone-carousel';
import {
  BellIcon,
  BrowserFrame,
  CheckIcon,
  PhoneIcon,
  PhoneShot,
  Section,
  Shot,
  STUDENT_FEATURES,
  STUDENT_SHOTS,
  STUDENT_SHOT_LIST,
  TINT_BG,
  TINT_FG,
} from '../../components/site-sections';

export const metadata: Metadata = {
  title: 'CampusGO on Mobile',
  description:
    'A focused app for students — readiness, opportunities, applications and offer updates in their pocket — and an on-the-go view for placement teams. Installs like an app; nothing to update.',
  alternates: { canonical: '/mobile' },
};

export default function MobilePage() {
  return (
    <div className="min-h-screen bg-app">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden bg-white">
        <div
          className="pointer-events-none absolute -right-20 -top-32 h-[480px] w-[480px] rounded-full opacity-70"
          style={{ background: 'radial-gradient(circle, rgba(59,110,245,0.08) 0%, rgba(255,255,255,0) 70%)' }}
        />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-12 px-6 py-16 sm:py-20 lg:flex-row">
          <div className="w-full max-w-xl text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3.5 py-1.5 text-xs font-medium text-primary-600">
              <PhoneIcon /> CampusGO on Mobile
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-strong sm:text-5xl">
              The Placement Journey,
              <br />
              in Your Pocket.
            </h1>
            <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-subtle lg:mx-0">
              Students get a focused app for their readiness, opportunities and offers. Placement
              teams get the same portal on their phone for approvals and updates on the move. It
              installs from the browser like a native app — and because it&rsquo;s the web app, there&rsquo;s
              nothing to update.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
              <Link
                href="/login"
                className="inline-flex h-12 items-center rounded-md bg-gradient-primary px-6 text-sm font-semibold text-primary-foreground shadow-nav hover:opacity-95"
              >
                Open CampusGO
              </Link>
              <Link href="/contact?intent=demo" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
                Request a Demo →
              </Link>
            </div>
          </div>
          <div className="flex w-full justify-center lg:w-auto">
            <PhoneShot src={STUDENT_SHOTS.employability.src} alt={STUDENT_SHOTS.employability.alt} />
          </div>
        </div>
      </section>

      {/* FOR STUDENTS */}
      <Section alt>
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-600">For Students</span>
          <h2 className="mt-2.5 text-3xl font-extrabold tracking-tight text-strong">Clarity. Not Complexity.</h2>
          <p className="mt-3.5 text-sm leading-relaxed text-subtle">
            A focused view of the placement journey — new jobs, deadlines and offer updates reach
            students the moment they happen.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STUDENT_FEATURES.map((f) => (
            <div key={f.title} className="flex gap-3 rounded-card bg-card p-5 shadow-card">
              <div className={`mt-0.5 flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-md ${TINT_BG[f.tint]}`}>
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

        <div className="mt-12">
          <PhoneCarousel shots={STUDENT_SHOT_LIST} />
        </div>
      </Section>

      {/* FOR PLACEMENT TEAMS */}
      <Section>
        <div className="flex flex-col items-start gap-12 lg:flex-row">
          <div className="w-full lg:w-[380px] lg:flex-shrink-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-600">For Placement Teams</span>
            <h2 className="mt-2.5 text-3xl font-extrabold tracking-tight text-strong">
              Run the Drive From Anywhere
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-subtle">
              The placement-officer portal works on the phone and the desktop — the same data,
              the same actions. Approve an offer, record a round result, or check where a drive
              stands between meetings.
            </p>
            <ul className="mt-6 space-y-3">
              <li className="flex gap-3 text-sm leading-relaxed text-body">
                <span className="mt-0.5 text-primary-600"><BellIcon /></span>
                Notifications for results due, offers to verify and new applications.
              </li>
              <li className="flex gap-3 text-sm leading-relaxed text-body">
                <span className="mt-0.5 text-primary-600"><CheckIcon /></span>
                Round decisions and candidate selection on a touch screen.
              </li>
              <li className="flex gap-3 text-sm leading-relaxed text-body">
                <span className="mt-0.5 text-primary-600"><PhoneIcon /></span>
                Placement progress, eligible-student lists and reports, mobile-friendly.
              </li>
            </ul>
          </div>
          <div className="w-full flex-1">
            <BrowserFrame>
              <Shot
                src="/screenshots/officer-dashboard.png"
                alt="Placement officer dashboard — total students, placed students, offers extended, placement progress by track and drive trend"
              />
            </BrowserFrame>
            <p className="mt-2 text-xs text-subtle">
              The full placement dashboard — the same view scales down to the phone.
            </p>
          </div>
        </div>
      </Section>

      {/* PWA NOTE */}
      <Section alt>
        <div className="mx-auto max-w-2xl rounded-card bg-card p-8 text-center shadow-card">
          <h2 className="text-xl font-extrabold tracking-tight text-strong">Install It Like an App</h2>
          <p className="mt-3 text-sm leading-relaxed text-subtle">
            CampusGO is a Progressive Web App. On Android it&rsquo;s also available as a lightweight app
            wrapper. Either way it&rsquo;s the same live product — new features appear the moment they
            ship, with no store update to wait for.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex h-12 items-center rounded-md bg-gradient-primary px-6 text-sm font-semibold text-primary-foreground shadow-nav hover:opacity-95"
          >
            Open CampusGO
          </Link>
        </div>
      </Section>

      <SiteFooter />
    </div>
  );
}
