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

/** A realistic phone device: thick dark bezel, rounded corners, a notch and
 *  side buttons. Children fill the screen. */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-full max-w-[248px]">
      {/* side buttons */}
      <span className="absolute -left-[3px] top-[92px] h-8 w-[3px] rounded-l bg-strong/80" />
      <span className="absolute -left-[3px] top-[138px] h-12 w-[3px] rounded-l bg-strong/80" />
      <span className="absolute -right-[3px] top-[116px] h-16 w-[3px] rounded-r bg-strong/80" />
      {/* body */}
      <div className="rounded-[42px] bg-strong p-[9px] shadow-2xl ring-1 ring-black/10">
        <div className="relative overflow-hidden rounded-[34px] bg-app">
          {/* notch */}
          <div className="pointer-events-none absolute left-1/2 top-0 z-10 h-[22px] w-[110px] -translate-x-1/2 rounded-b-2xl bg-strong" />
          {children}
        </div>
      </div>
    </div>
  );
}

/** Realistic app-screenshot mock for the hero — sidebar, KPI cards and a
 *  placement funnel. Swap for a real /screenshots/officer-placement.png. */
export function HeroDashboard() {
  const funnel: [string, number, string][] = [
    ['Applied', 100, '#5B8DEF'],
    ['Attended', 82, '#5B8DEF'],
    ['Round 2', 61, '#7C8BFF'],
    ['Round 3', 44, '#7C8BFF'],
    ['Selected', 28, '#1F9D6B'],
    ['Offered', 28, '#1F9D6B'],
  ];
  return (
    <svg viewBox="0 0 720 460" className="w-full" fill="none" fontFamily="ui-sans-serif, system-ui, sans-serif">
      <rect width="720" height="460" fill="#F4F6FB" />

      {/* sidebar */}
      <rect width="86" height="460" fill="#14245C" />
      <circle cx="43" cy="34" r="11" fill="#5B8DEF" />
      {[70, 106, 142, 178, 214].map((y, i) => (
        <rect key={y} x="18" y={y} width="50" height="20" rx="6" fill={i === 1 ? '#2E4CA6' : 'rgba(255,255,255,0.10)'} />
      ))}

      {/* top bar */}
      <rect x="86" width="634" height="52" fill="#fff" />
      <text x="112" y="32" fontSize="15" fontWeight="700" fill="#1B2333">
        Placement Dashboard
      </text>
      <rect x="520" y="15" width="120" height="22" rx="11" fill="#F4F6FB" />
      <circle cx="672" cy="26" r="14" fill="#5B8DEF" />
      <text x="672" y="30" fontSize="10" fontWeight="700" fill="#fff" textAnchor="middle">
        JB
      </text>

      {/* KPI cards */}
      {[
        ['Placed', '6', '↑ 7.7%'],
        ['Offers extended', '8', 'this season'],
        ['Avg package', '₹4.9 LPA', 'UG + PG'],
      ].map(([label, value, sub], i) => (
        <g key={label as string} transform={`translate(${110 + i * 200}, 74)`}>
          <rect width="182" height="92" rx="12" fill="#fff" stroke="#E6E9F0" />
          <text x="18" y="28" fontSize="11" fill="#98A2B3">
            {label}
          </text>
          <text x="18" y="58" fontSize="24" fontWeight="800" fill="#1B2333">
            {value}
          </text>
          <text x="18" y="78" fontSize="10" fill="#1F9D6B">
            {sub}
          </text>
        </g>
      ))}

      {/* funnel panel */}
      <g transform="translate(110, 186)">
        <rect width="582" height="252" rx="14" fill="#fff" stroke="#E6E9F0" />
        <text x="22" y="34" fontSize="13" fontWeight="700" fill="#1B2333">
          Placement Progress
        </text>
        <text x="560" y="34" fontSize="10" fill="#98A2B3" textAnchor="end">
          Stage by stage
        </text>
        {funnel.map(([name, pct, color], i) => (
          <g key={name} transform={`translate(22, ${58 + i * 30})`}>
            <text x="0" y="12" fontSize="10.5" fill="#4A5468">
              {name}
            </text>
            <rect x="86" y="2" width="400" height="12" rx="6" fill="#EDF0F6" />
            <rect x="86" y="2" width={(pct / 100) * 400} height="12" rx="6" fill={color} />
            <text x="500" y="12" fontSize="10.5" fontWeight="700" fill="#1B2333">
              {Math.round((pct / 100) * 54)}
            </text>
          </g>
        ))}
      </g>

      {/* floating notification chip */}
      <g transform="translate(486, 150)">
        <rect width="196" height="40" rx="12" fill="#0B1330" />
        <circle cx="24" cy="20" r="9" fill="#1F9D6B" />
        <path d="M20 20l3 3 6-6" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="42" y="24" fontSize="10.5" fill="#fff">
          Offer verified — Infosys
        </text>
      </g>
    </svg>
  );
}

/* ── Flat illustrations: a graduate, and the campus → career path ── */

const FIG = {
  skin: '#F1B98E',
  gown: '#3B6EF5',
  gownDark: '#2E4CA6',
  cap: '#14245C',
  tassel: '#E28040',
};

function Graduate({ x = 0, y = 0, scale = 1, gown = FIG.gown }: { x?: number; y?: number; scale?: number; gown?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {/* gown / body */}
      <path d="M18 92c0-24 12-40 32-40s32 16 32 40v6H18z" fill={gown} />
      <path d="M50 52c-12 0-21 6-26 16l26 10 26-10c-5-10-14-16-26-16z" fill={FIG.gownDark} />
      {/* head */}
      <circle cx="50" cy="34" r="15" fill={FIG.skin} />
      {/* mortarboard */}
      <rect x="41" y="18" width="18" height="9" rx="2" fill={FIG.cap} />
      <path d="M50 6 78 17 50 28 22 17z" fill={FIG.cap} />
      <circle cx="50" cy="17" r="3" fill={FIG.cap} />
      <path d="M50 17v12" stroke={FIG.tassel} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="50" cy="31" r="3" fill={FIG.tassel} />
      {/* diploma */}
      <rect x="70" y="70" width="26" height="9" rx="4" fill="#FFF4E0" stroke={FIG.tassel} strokeWidth="1.5" transform="rotate(18 83 74)" />
    </g>
  );
}

/** Graduation moment — for alumni / outcomes sections. */
export function GraduationScene() {
  return (
    <svg viewBox="0 0 420 260" fill="none" className="w-full">
      <defs>
        <linearGradient id="gs-blob" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E7F6EF" />
          <stop offset="1" stopColor="#EDF0FE" />
        </linearGradient>
      </defs>
      <path d="M20 210c60-60 320-60 380 0v40H20z" fill="url(#gs-blob)" />
      <Graduate x={110} y={40} scale={1.7} gown="#3B6EF5" />
      <Graduate x={210} y={58} scale={1.5} gown="#7C8BFF" />
      {/* thrown cap */}
      <g transform="translate(300 40) rotate(-20)">
        <rect x="-9" y="-4" width="18" height="9" rx="2" fill={FIG.cap} />
        <path d="M0 -16 28 -5 0 6 -28 -5z" fill={FIG.cap} />
        <path d="M0 -5v14" stroke={FIG.tassel} strokeWidth="2.5" strokeLinecap="round" />
      </g>
      {/* confetti */}
      {[
        [60, 60, '#F78CA0'],
        [370, 70, '#E28040'],
        [90, 150, '#7C8BFF'],
        [340, 150, '#1F9D6B'],
        [200, 30, '#5B8DEF'],
      ].map(([cx, cy, c], i) => (
        <circle key={i} cx={cx as number} cy={cy as number} r="4" fill={c as string} />
      ))}
    </svg>
  );
}

/** An interview / assessment scene — two figures across a desk. */
export function InterviewScene() {
  return (
    <svg viewBox="0 0 420 260" fill="none" className="w-full">
      <defs>
        <linearGradient id="is-blob" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#EDF0FE" />
          <stop offset="1" stopColor="#FEECEC" />
        </linearGradient>
      </defs>
      <ellipse cx="210" cy="140" rx="200" ry="120" fill="url(#is-blob)" />

      {/* candidate (left) */}
      <g transform="translate(70 90)">
        <path d="M6 90c0-26 12-42 30-42s30 16 30 42z" fill="#7C8BFF" />
        <circle cx="36" cy="34" r="15" fill={FIG.skin} />
        <path d="M22 26c0-9 7-15 14-15s14 6 14 13c-6 1-10 4-14 4s-9-1-14-2z" fill="#14245C" />
      </g>

      {/* interviewer (right) */}
      <g transform="translate(284 92)">
        <path d="M6 88c0-24 11-40 28-40s28 16 28 40z" fill="#3B6EF5" />
        <circle cx="34" cy="34" r="14" fill={FIG.skin} />
        <path d="M21 30c1-10 7-16 13-16s12 5 13 14c-9 2-18 3-26 2z" fill="#2E4CA6" />
        {/* clipboard */}
        <rect x="-6" y="52" width="26" height="34" rx="3" fill="#FFF4E0" stroke="#E28040" strokeWidth="1.5" />
        <path d="M0 60h16M0 68h16M0 76h10" stroke="#E28040" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* desk */}
      <rect x="120" y="176" width="180" height="14" rx="4" fill="#14245C" />
      <rect x="150" y="150" width="54" height="30" rx="4" fill="#fff" stroke="#E6E9F0" />
      <rect x="150" y="150" width="54" height="30" rx="4" fill="none" stroke="#5B8DEF" strokeWidth="2" />

      {/* speech bubble with a check */}
      <g transform="translate(196 66)">
        <rect width="52" height="38" rx="10" fill="#fff" stroke="#E6E9F0" />
        <path d="M18 38l6 9 5-9z" fill="#fff" stroke="#E6E9F0" />
        <path d="M16 20l7 7 13-14" stroke="#1F9D6B" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function PhoneMockup() {
  return (
    <PhoneFrame>
      <div className="flex h-[108px] flex-col justify-end bg-gradient-primary px-4 pb-4">
        <span className="text-[11px] text-white/80">Placement Readiness</span>
        <span className="text-base font-bold text-white">78% ready</span>
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
    </PhoneFrame>
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
  tint: Tint;
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
