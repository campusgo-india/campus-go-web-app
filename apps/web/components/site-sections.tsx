import type { ReactNode } from 'react';

/* ────────────────────────────────────────────────────────────────────────────
 * Shared building blocks for the public marketing site (home + topic pages).
 * Tint/gradient maps, the content data, the icon set, illustrative product
 * mockups, and a couple of layout primitives — so every marketing page pulls
 * from one place instead of re-declaring it all.
 * ──────────────────────────────────────────────────────────────────────────── */

export type Tint = 'lavender' | 'mint' | 'cream' | 'rose';
export const TINTS: Tint[] = ['lavender', 'mint', 'cream', 'rose'];
export const TINT_BG: Record<Tint, string> = {
  lavender: 'bg-tint-lavender',
  mint: 'bg-tint-mint',
  cream: 'bg-tint-cream',
  rose: 'bg-tint-rose',
};
export const TINT_FG: Record<Tint, string> = {
  lavender: 'text-tint-lavender-fg',
  mint: 'text-tint-mint-fg',
  cream: 'text-tint-cream-fg',
  rose: 'text-tint-rose-fg',
};

export type Gradient = 'primary' | 'sunset' | 'ocean' | 'violet';
export const GRADIENT_BG: Record<Gradient, string> = {
  primary: 'bg-gradient-primary',
  sunset: 'bg-gradient-sunset',
  ocean: 'bg-gradient-ocean',
  violet: 'bg-gradient-violet',
};

/* ─────────────── Layout primitives ─────────────── */

/** A full-width marketing section. `alt` gives it the muted background — pages
 *  alternate white / muted down the page. */
export function Section({
  id,
  alt = false,
  className = '',
  children,
}: {
  id?: string;
  alt?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={alt ? 'bg-muted' : ''}>
      <div className={`mx-auto max-w-6xl px-6 py-16 ${className}`}>{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  center = true,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  center?: boolean;
}) {
  return (
    <div className={`${center ? 'mx-auto text-center' : ''} max-w-2xl`}>
      {eyebrow && (
        <span className="text-xs font-semibold uppercase tracking-wider text-primary-600">
          {eyebrow}
        </span>
      )}
      <h2 className="mt-2.5 text-3xl font-extrabold tracking-tight text-strong">{title}</h2>
      {subtitle && <p className="mt-3.5 text-sm leading-relaxed text-subtle">{subtitle}</p>}
    </div>
  );
}

/* ─────────────── Content data ─────────────── */

export const CORE_FEATURES: { title: string; body: string; tint: Tint; icon: ReactNode }[] = [
  { title: 'Student Data', body: 'Build a centralized and structured student database.', tint: 'lavender', icon: <DatabaseIcon /> },
  { title: 'Career Readiness', body: 'Understand student preparedness across four core employability pillars.', tint: 'mint', icon: <TargetIcon /> },
  { title: 'Training & Assessments', body: 'Develop skills and measure improvement.', tint: 'cream', icon: <GraduationCapIcon /> },
  { title: 'Companies & Opportunities', body: 'Manage recruiters and connect students with relevant opportunities.', tint: 'rose', icon: <HandshakeIcon /> },
  { title: 'Applications & Recruitment', body: 'Track the complete recruitment journey.', tint: 'lavender', icon: <PipelineIcon /> },
  { title: 'Placements & Offers', body: 'Record selections, offers and final outcomes.', tint: 'mint', icon: <AwardIcon /> },
  { title: 'Alumni', body: 'Retain graduate information and continuously build the institutional alumni network.', tint: 'cream', icon: <UsersIcon /> },
  { title: 'Reports & Analytics', body: 'Turn everyday placement activities into structured institutional insights.', tint: 'rose', icon: <ChartIcon /> },
];

export const JOURNEY_STEPS: { n: string; title: string; body: string; gradient: Gradient }[] = [
  { n: '01', title: 'Understand', body: 'Build complete student profiles and understand their current readiness.', gradient: 'primary' },
  { n: '02', title: 'Develop', body: 'Identify areas for improvement and provide relevant training.', gradient: 'ocean' },
  { n: '03', title: 'Connect', body: 'Create opportunities and connect eligible students with recruiters.', gradient: 'violet' },
  { n: '04', title: 'Apply', body: 'Students discover opportunities and apply through CampusGo.', gradient: 'sunset' },
  { n: '05', title: 'Recruit', body: 'Track assessments, interviews and recruitment stages.', gradient: 'primary' },
  { n: '06', title: 'Place', body: 'Record selections, offers and placement outcomes.', gradient: 'ocean' },
  { n: '07', title: 'Engage', body: 'Move graduating students into the alumni ecosystem.', gradient: 'violet' },
  { n: '08', title: 'Measure', body: 'Analyse placement performance, student development and institutional outcomes.', gradient: 'sunset' },
];

export const READINESS_PILLARS: { title: string; items: string[]; tint: Tint; icon: ReactNode }[] = [
  { title: 'Aptitude & Reasoning', items: ['Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability'], tint: 'lavender', icon: <PuzzleIcon /> },
  { title: 'Technical & Tools', items: ['Excel', 'Power BI', 'Programming / Domain Skills'], tint: 'mint', icon: <ToolsIcon /> },
  { title: 'Soft Skills & Communication', items: ['Verbal Communication', 'Written Communication', 'Group Discussion'], tint: 'cream', icon: <ChatIcon /> },
  { title: 'Career Readiness', items: ['Resume', 'LinkedIn & Personal Branding', 'Interview Skills', 'Mock Interview Performance'], tint: 'rose', icon: <BriefcaseIcon /> },
];

export const RECRUITMENT_TOPICS: { title: string; body: string }[] = [
  { title: 'Smart Student Management', body: "One student, one complete career profile — registration, academic records, programme &amp; batch, resume, LinkedIn, skills, applications, interviews and offer details, maintained throughout the student's institutional journey." },
  { title: 'Smarter Eligibility Management', body: 'Create opportunities with defined eligibility criteria — programme, batch, academic performance, backlogs and more — and go from thousands of students to the right shortlist automatically.' },
  { title: 'Jobs & Opportunities', body: 'Company, role, eligibility, JD, compensation, location and deadline — every opportunity lives in one place. Update it once in CampusGo instead of managing versions across email and spreadsheets.' },
  { title: 'Recruitment Tracking', body: 'Recruitment stages differ by company — configure the actual hiring process, from Applied → Aptitude → GD → Technical → HR → Selected, or a simple Round 1 → Round 2 → Round 3. Nothing gets lost in between.' },
];

export const STUDENT_FEATURES: { title: string; body: string; tint: Tint }[] = [
  { title: 'Placement Readiness', body: 'View overall readiness and performance across the four core employability pillars.', tint: 'lavender' },
  { title: 'New Opportunities', body: 'See relevant placement opportunities and application deadlines.', tint: 'mint' },
  { title: 'My Applications', body: 'Track every application and its current recruitment stage.', tint: 'cream' },
  { title: 'Upcoming Activities', body: 'Stay informed about assessments, interviews and other placement activities.', tint: 'rose' },
  { title: 'Profile', body: 'Maintain the information required for placement participation.', tint: 'lavender' },
];

/** Real student-app captures (in apps/web/public/screenshots/). Pick individual
 *  entries for a lone PhoneShot, or pass STUDENT_SHOT_LIST to <PhoneCarousel>. */
export interface PhoneShotData {
  src: string;
  alt: string;
  caption: string;
}
export const STUDENT_SHOTS = {
  home: {
    src: '/screenshots/student-home.png',
    alt: 'Student app home — readiness banner, quick actions and a live list of applications',
    caption: 'Home — readiness & applications at a glance',
  },
  employability: {
    src: '/screenshots/student-employability.png',
    alt: 'My Employability — readiness score, department rank, tier badge and a placement roadmap',
    caption: 'Employability — readiness, tier & roadmap',
  },
  jobs: {
    src: '/screenshots/student-jobs.png',
    alt: 'Jobs list — Open / Applied / Closed tabs with per-job lifecycle and application status',
    caption: 'Jobs — filtered by where each one stands',
  },
  applications: {
    src: '/screenshots/student-applications.png',
    alt: 'Application timeline — every round, cleared or not, and the offer when selected',
    caption: 'Applications — round-by-round timeline',
  },
  tracker: {
    src: '/screenshots/student-tracker.png',
    alt: 'Placement Tracker — applications, interviews, selections and an application funnel',
    caption: 'Tracker — the season in one view',
  },
  notifications: {
    src: '/screenshots/student-notifications.png',
    alt: 'Notifications — new jobs, scheduled rounds, results and offer updates',
    caption: 'Notifications — the moment things happen',
  },
} satisfies Record<string, PhoneShotData>;
export const STUDENT_SHOT_LIST: PhoneShotData[] = [
  STUDENT_SHOTS.home,
  STUDENT_SHOTS.employability,
  STUDENT_SHOTS.jobs,
  STUDENT_SHOTS.applications,
  STUDENT_SHOTS.tracker,
  STUDENT_SHOTS.notifications,
];

export const EXTENDED_TOPICS: { title: string; eyebrow: string; body: string }[] = [
  { title: 'Companies & Recruiters', eyebrow: 'Build a stronger recruiter ecosystem', body: 'Maintain a structured record of company profiles, recruiter contacts, job opportunities, recruitment history, selections and engagement — turning every interaction into institutional knowledge.' },
  { title: 'Placement Communication', eyebrow: 'Reach the right students at the right time', body: 'No more manually maintained mailing lists. CampusGo identifies relevant students and sends individual notifications — new jobs, interview schedules, deadlines, shortlists and placement updates.' },
];

export const REPORT_CATEGORIES: { title: string; items: string[]; tint: Tint }[] = [
  { title: 'Placement', items: ['Placement percentage', 'Students placed', 'Programme-wise placement', 'Highest & average package', 'Offers extended'], tint: 'lavender' },
  { title: 'Recruitment', items: ['Opportunities & eligible students', 'Applications', 'Recruitment stages', 'Shortlists, selections & rejections'], tint: 'mint' },
  { title: 'Training', items: ['Training participation', 'Assessment performance', 'Pre- vs post-assessment scores', 'Improvement by pillar'], tint: 'cream' },
  { title: 'Internships & PPOs', items: ['Internship participation', 'Companies', 'Completion', 'PPOs'], tint: 'rose' },
  { title: 'Alumni', items: ['Alumni database', 'Employment information', 'Companies', 'Alumni engagement'], tint: 'lavender' },
];

export const STAKEHOLDERS: { title: string; body: string; tint: Tint; icon: ReactNode }[] = [
  { title: 'Placement Officers', body: 'Manage students, companies, opportunities, applications, recruitment and placement outcomes from one platform.', tint: 'lavender', icon: <TeamIcon /> },
  { title: 'Coordinators & Faculty', body: 'Support student participation, communication and department-level placement activities.', tint: 'mint', icon: <UsersIcon /> },
  { title: 'Students', body: 'Manage profiles, discover opportunities, apply for jobs and track placement progress.', tint: 'cream', icon: <GraduationCapIcon /> },
  { title: 'Institution Leadership', body: 'Access structured placement data, progress and institutional insights.', tint: 'rose', icon: <BuildingIcon /> },
  { title: 'Alumni', body: "Remain part of the institution's growing career network.", tint: 'lavender', icon: <NetworkIcon /> },
];

export const WHY_CAMPUSGO: { title: string; body: string; accent: string }[] = [
  { title: 'Connected', body: 'Bring student, training, opportunity, recruitment, placement and alumni information together.', accent: '#3B6EF5' },
  { title: 'Student-Centric', body: 'Give students visibility into their readiness, opportunities and recruitment progress.', accent: '#1F9D6B' },
  { title: 'Data-Driven', body: 'Make placement decisions using structured, current and historical information.', accent: '#C98A1B' },
  { title: 'Measurable', body: 'Connect training and assessments with measurable student development.', accent: '#E5484D' },
  { title: 'Efficient', body: 'Reduce repetitive administrative work and dependency on disconnected spreadsheets.', accent: '#7C8BFF' },
  { title: 'Scalable', body: 'Support multiple schools, departments, programmes and batches.', accent: '#E28040' },
  { title: 'Built for Continuity', body: 'Retain institutional knowledge beyond graduation and continuously grow the alumni ecosystem.', accent: '#F78CA0' },
];

export const ADVANTAGE_FLOW: { label: string; tint: Tint }[] = [
  { label: 'Student', tint: 'lavender' },
  { label: 'Career Readiness', tint: 'mint' },
  { label: 'Training', tint: 'cream' },
  { label: 'Opportunity', tint: 'rose' },
  { label: 'Application', tint: 'lavender' },
  { label: 'Recruitment', tint: 'mint' },
  { label: 'Placement', tint: 'cream' },
  { label: 'Alumni', tint: 'rose' },
  { label: 'Institutional Network', tint: 'lavender' },
];

/* ─────────────── Small helpers ─────────────── */

export function TrustItem({ color, children }: { color: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-sm text-body">{children}</span>
    </div>
  );
}

export function ValueStat({
  tint,
  icon,
  label,
  body,
}: {
  tint: Tint;
  icon: ReactNode;
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

export function FunnelPill({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex w-fit items-center rounded-pill border border-border bg-card px-3.5 py-2 text-xs font-medium text-body shadow-card">
      {children}
    </div>
  );
}

export function AlumniYear({ year, body, tint }: { year: string; body: string; tint: Tint }) {
  return (
    <div className={`rounded-card p-4 ${TINT_BG[tint]}`}>
      <p className={`text-sm font-extrabold ${TINT_FG[tint]}`}>{year}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-body">{body}</p>
    </div>
  );
}

/** Institution → School → Programme → Batch → Students, as a connected chain. */
export function HierarchyDiagram() {
  const levels: { label: string; gradient: Gradient }[] = [
    { label: 'Institution', gradient: 'primary' },
    { label: 'School / Department', gradient: 'ocean' },
    { label: 'Programme', gradient: 'violet' },
    { label: 'Batch', gradient: 'sunset' },
    { label: 'Students', gradient: 'primary' },
  ];
  return (
    <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-3">
      {levels.map((l, i) => (
        <div key={l.label} className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
          <div
            className={`flex h-16 w-40 items-center justify-center rounded-card text-center text-sm font-bold text-white shadow-card ${GRADIENT_BG[l.gradient]}`}
          >
            {l.label}
          </div>
          {i < levels.length - 1 && (
            <span className="text-lg text-subtle">
              <span className="sm:hidden">↓</span>
              <span className="hidden sm:inline">→</span>
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─────────────── Illustrative product mockups ───────────────
 * Stylized fake-UI — no real numbers or customer data. When real product
 * screenshots are captured (apps/web/scripts/shoot-marketing.mjs), swap the
 * mockup inside a frame for <img src="/screenshots/<name>.png" />. */

export function BrowserFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-white shadow-card">
      <div className="flex items-center gap-1.5 border-b border-border bg-app px-3.5 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-tint-rose-fg/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-tint-cream-fg/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-tint-mint-fg/60" />
        <span className="ml-3 h-4 flex-1 rounded bg-white" />
      </div>
      {children}
    </div>
  );
}

/* ── Real product captures (PII-safe demo data) ──────────────────────────────
 * Files live in apps/web/public/screenshots/. Shot goes inside a BrowserFrame;
 * PhoneShot is its own device frame (no notch — the student capture already
 * includes the phone status bar). */

export function Shot({ src, alt }: { src: string; alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className="block w-full" loading="lazy" />;
}

export function PhoneShot({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="w-full max-w-[244px] overflow-hidden rounded-[36px] bg-strong p-[6px] shadow-2xl ring-1 ring-black/10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="block w-full rounded-[30px]" loading="lazy" />
    </div>
  );
}

/* ─────────────── Icons (stroke, 24px grid) ─────────────── */

const sv = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, className: 'h-5 w-5' } as const;

export function PipelineIcon() {
  return (
    <svg {...sv}>
      <rect x="3" y="4" width="7" height="7" rx="1.5" />
      <rect x="14" y="4" width="7" height="7" rx="1.5" />
      <rect x="3" y="13" width="7" height="7" rx="1.5" />
      <rect x="14" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}
export function ChartIcon() {
  return (
    <svg {...sv}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function TeamIcon() {
  return (
    <svg {...sv}>
      <rect x="3" y="3" width="7" height="18" rx="1.5" />
      <rect x="14" y="3" width="7" height="10" rx="1.5" />
    </svg>
  );
}
export function BoltIcon() {
  return (
    <svg {...sv}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function BuildingIcon() {
  return (
    <svg {...sv}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v3M16 3v3" strokeLinecap="round" />
    </svg>
  );
}
export function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function DatabaseIcon() {
  return (
    <svg {...sv}>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" strokeLinecap="round" />
      <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" strokeLinecap="round" />
    </svg>
  );
}
export function TargetIcon() {
  return (
    <svg {...sv}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}
export function GraduationCapIcon() {
  return (
    <svg {...sv}>
      <path d="M2 9 12 4l10 5-10 5-10-5Z" strokeLinejoin="round" />
      <path d="M6 11.5V17c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5.5" strokeLinecap="round" />
      <path d="M22 9v6" strokeLinecap="round" />
    </svg>
  );
}
export function HandshakeIcon() {
  return (
    <svg {...sv}>
      <path d="M2 12l4-4 4 3 3-3 3 3 4-4 2 2-5 8-4-2-4 2-5-5Z" strokeLinejoin="round" />
    </svg>
  );
}
export function AwardIcon() {
  return (
    <svg {...sv}>
      <circle cx="12" cy="8" r="5.5" />
      <path d="M8.5 13 7 21l5-2.5L17 21l-1.5-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function UsersIcon() {
  return (
    <svg {...sv}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" strokeLinecap="round" />
      <circle cx="18" cy="8.5" r="2.5" />
      <path d="M15.5 13.5c2.9.4 5 2.9 5 6" strokeLinecap="round" />
    </svg>
  );
}
export function PuzzleIcon() {
  return (
    <svg {...sv}>
      <path d="M9 4h4v2.2a1.8 1.8 0 1 0 0 3.6V12h2.2a1.8 1.8 0 1 1 0 3.6H15v4H4v-4h2.2a1.8 1.8 0 1 0 0-3.6H4V4h5Z" strokeLinejoin="round" />
    </svg>
  );
}
export function ToolsIcon() {
  return (
    <svg {...sv}>
      <path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4l-3-3-2.7 2.7" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
export function ChatIcon() {
  return (
    <svg {...sv}>
      <path d="M4 5h16v11H8l-4 4V5Z" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M8 9h8M8 12.5h5" strokeLinecap="round" />
    </svg>
  );
}
export function BriefcaseIcon() {
  return (
    <svg {...sv}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" />
    </svg>
  );
}
export function MailIcon() {
  return (
    <svg {...sv}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 6.5 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function NetworkIcon() {
  return (
    <svg {...sv}>
      <circle cx="12" cy="5" r="2.5" />
      <circle cx="5" cy="18" r="2.5" />
      <circle cx="19" cy="18" r="2.5" />
      <path d="M12 7.5v4M10.2 13.7 6.8 16M13.8 13.7l3.4 2.3" strokeLinecap="round" />
    </svg>
  );
}
export function PhoneIcon() {
  return (
    <svg {...sv}>
      <rect x="7" y="2" width="10" height="20" rx="2.5" />
      <path d="M11 18h2" strokeLinecap="round" />
    </svg>
  );
}
export function BellIcon() {
  return (
    <svg {...sv}>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 8H4c0-2 2-3 2-8M10 20a2 2 0 0 0 4 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
