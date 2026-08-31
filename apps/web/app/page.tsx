import Link from 'next/link';
import { SiteHeader, SiteFooter } from '../components/site-chrome';

export const metadata = {
  title: 'CampusGo — From Campus to Career',
  description:
    'CampusGo connects students, training, employers, opportunities, recruitment and placement outcomes in one centralized platform — the complete placement & career readiness platform for colleges and universities.',
};

type Tint = 'lavender' | 'mint' | 'cream' | 'rose';
const TINTS: Tint[] = ['lavender', 'mint', 'cream', 'rose'];
const TINT_BG: Record<Tint, string> = {
  lavender: 'bg-tint-lavender',
  mint: 'bg-tint-mint',
  cream: 'bg-tint-cream',
  rose: 'bg-tint-rose',
};
const TINT_FG: Record<Tint, string> = {
  lavender: 'text-tint-lavender-fg',
  mint: 'text-tint-mint-fg',
  cream: 'text-tint-cream-fg',
  rose: 'text-tint-rose-fg',
};

type Gradient = 'primary' | 'sunset' | 'ocean' | 'violet';
const GRADIENTS: Gradient[] = ['primary', 'sunset', 'ocean', 'violet'];
const GRADIENT_BG: Record<Gradient, string> = {
  primary: 'bg-gradient-primary',
  sunset: 'bg-gradient-sunset',
  ocean: 'bg-gradient-ocean',
  violet: 'bg-gradient-violet',
};

// ─────────────── "More Than Placement Management" — 8 pieces of the platform ───────────────
const CORE_FEATURES: { title: string; body: string; tint: Tint; icon: React.ReactNode }[] = [
  { title: 'Student Data', body: 'Build a centralized and structured student database.', tint: 'lavender', icon: <DatabaseIcon /> },
  { title: 'Career Readiness', body: 'Understand student preparedness across four core employability pillars.', tint: 'mint', icon: <TargetIcon /> },
  { title: 'Training & Assessments', body: 'Develop skills and measure improvement.', tint: 'cream', icon: <GraduationCapIcon /> },
  { title: 'Companies & Opportunities', body: 'Manage recruiters and connect students with relevant opportunities.', tint: 'rose', icon: <HandshakeIcon /> },
  { title: 'Applications & Recruitment', body: 'Track the complete recruitment journey.', tint: 'lavender', icon: <PipelineIcon /> },
  { title: 'Placements & Offers', body: 'Record selections, offers and final outcomes.', tint: 'mint', icon: <AwardIcon /> },
  { title: 'Alumni', body: 'Retain graduate information and continuously build the institutional alumni network.', tint: 'cream', icon: <UsersIcon /> },
  { title: 'Reports & Analytics', body: 'Turn everyday placement activities into structured institutional insights.', tint: 'rose', icon: <ChartIcon /> },
];

// ─────────────── "One Connected Journey" — 8-step flow ───────────────
const JOURNEY_STEPS: { n: string; title: string; body: string; gradient: Gradient }[] = [
  { n: '01', title: 'Understand', body: 'Build complete student profiles and understand their current readiness.', gradient: 'primary' },
  { n: '02', title: 'Develop', body: 'Identify areas for improvement and provide relevant training.', gradient: 'ocean' },
  { n: '03', title: 'Connect', body: 'Create opportunities and connect eligible students with recruiters.', gradient: 'violet' },
  { n: '04', title: 'Apply', body: 'Students discover opportunities and apply through CampusGo.', gradient: 'sunset' },
  { n: '05', title: 'Recruit', body: 'Track assessments, interviews and recruitment stages.', gradient: 'primary' },
  { n: '06', title: 'Place', body: 'Record selections, offers and placement outcomes.', gradient: 'ocean' },
  { n: '07', title: 'Engage', body: 'Move graduating students into the alumni ecosystem.', gradient: 'violet' },
  { n: '08', title: 'Measure', body: 'Analyse placement performance, student development and institutional outcomes.', gradient: 'sunset' },
];

// ─────────────── "Student Career Readiness" — 4 pillars ───────────────
const READINESS_PILLARS: { title: string; items: string[]; tint: Tint; icon: React.ReactNode }[] = [
  { title: 'Aptitude & Reasoning', items: ['Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability'], tint: 'lavender', icon: <PuzzleIcon /> },
  { title: 'Technical & Tools', items: ['Excel', 'Power BI', 'Programming / Domain Skills'], tint: 'mint', icon: <ToolsIcon /> },
  { title: 'Soft Skills & Communication', items: ['Verbal Communication', 'Written Communication', 'Group Discussion'], tint: 'cream', icon: <ChatIcon /> },
  { title: 'Career Readiness', items: ['Resume', 'LinkedIn & Personal Branding', 'Interview Skills', 'Mock Interview Performance'], tint: 'rose', icon: <BriefcaseIcon /> },
];

// ─────────────── Recruitment engine — 4 sub-topics ───────────────
const RECRUITMENT_TOPICS = [
  {
    title: 'Smart Student Management',
    body: "One student, one complete career profile — registration, academic records, programme &amp; batch, resume, LinkedIn, skills, applications, interviews and offer details, maintained throughout the student's institutional journey.",
  },
  {
    title: 'Smarter Eligibility Management',
    body: 'Create opportunities with defined eligibility criteria — programme, batch, academic performance, backlogs and more — and go from thousands of students to the right shortlist automatically.',
  },
  {
    title: 'Jobs & Opportunities',
    body: 'Company, role, eligibility, JD, compensation, location and deadline — every opportunity lives in one place. Update it once in CampusGo instead of managing versions across email and spreadsheets.',
  },
  {
    title: 'Recruitment Tracking',
    body: 'Recruitment stages differ by company — configure the actual hiring process, from Applied → Aptitude → GD → Technical → HR → Selected, or a simple Round 1 → Round 2 → Round 3. Nothing gets lost in between.',
  },
];

// ─────────────── "Student Placement Dashboard" — 5 items ───────────────
const STUDENT_FEATURES: { title: string; body: string; tint: Tint }[] = [
  { title: 'Placement Readiness', body: 'View overall readiness and performance across the four core employability pillars.', tint: 'lavender' },
  { title: 'New Opportunities', body: 'See relevant placement opportunities and application deadlines.', tint: 'mint' },
  { title: 'My Applications', body: 'Track every application and its current recruitment stage.', tint: 'cream' },
  { title: 'Upcoming Activities', body: 'Stay informed about assessments, interviews and other placement activities.', tint: 'rose' },
  { title: 'Profile', body: 'Maintain the information required for placement participation.', tint: 'lavender' },
];

// ─────────────── Companies + Communication — 2-col text ───────────────
const EXTENDED_TOPICS = [
  {
    title: 'Companies & Recruiters',
    eyebrow: 'Build a stronger recruiter ecosystem',
    body: 'Maintain a structured record of company profiles, recruiter contacts, job opportunities, recruitment history, selections and engagement — turning every interaction into institutional knowledge.',
  },
  {
    title: 'Placement Communication',
    eyebrow: 'Reach the right students at the right time',
    body: "No more manually maintained mailing lists. CampusGo identifies relevant students and sends individual notifications — new jobs, interview schedules, deadlines, shortlists and placement updates.",
  },
];

// ─────────────── Reports & Insights — 5 categories ───────────────
const REPORT_CATEGORIES: { title: string; items: string[]; tint: Tint }[] = [
  { title: 'Placement', items: ['Placement percentage', 'Students placed', 'Programme-wise placement', 'Highest & average package', 'Offers extended'], tint: 'lavender' },
  { title: 'Recruitment', items: ['Opportunities & eligible students', 'Applications', 'Recruitment stages', 'Shortlists, selections & rejections'], tint: 'mint' },
  { title: 'Training', items: ['Training participation', 'Assessment performance', 'Pre- vs post-assessment scores', 'Improvement by pillar'], tint: 'cream' },
  { title: 'Internships & PPOs', items: ['Internship participation', 'Companies', 'Completion', 'PPOs'], tint: 'rose' },
  { title: 'Alumni', items: ['Alumni database', 'Employment information', 'Companies', 'Alumni engagement'], tint: 'lavender' },
];

// ─────────────── Every Stakeholder — 5 roles ───────────────
const STAKEHOLDERS: { title: string; body: string; tint: Tint; icon: React.ReactNode }[] = [
  { title: 'Placement Officers', body: 'Manage students, companies, opportunities, applications, recruitment and placement outcomes from one platform.', tint: 'lavender', icon: <TeamIcon /> },
  { title: 'Coordinators & Faculty', body: 'Support student participation, communication and department-level placement activities.', tint: 'mint', icon: <UsersIcon /> },
  { title: 'Students', body: 'Manage profiles, discover opportunities, apply for jobs and track placement progress.', tint: 'cream', icon: <GraduationCapIcon /> },
  { title: 'Institution Leadership', body: 'Access structured placement data, progress and institutional insights.', tint: 'rose', icon: <BuildingIcon /> },
  { title: 'Alumni', body: "Remain part of the institution's growing career network.", tint: 'lavender', icon: <NetworkIcon /> },
];

// ─────────────── Why CampusGo — 7 value props, one accent colour each ───────────────
const WHY_CAMPUSGO: { title: string; body: string; accent: string }[] = [
  { title: 'Connected', body: 'Bring student, training, opportunity, recruitment, placement and alumni information together.', accent: '#3B6EF5' },
  { title: 'Student-Centric', body: 'Give students visibility into their readiness, opportunities and recruitment progress.', accent: '#1F9D6B' },
  { title: 'Data-Driven', body: 'Make placement decisions using structured, current and historical information.', accent: '#C98A1B' },
  { title: 'Measurable', body: 'Connect training and assessments with measurable student development.', accent: '#E5484D' },
  { title: 'Efficient', body: 'Reduce repetitive administrative work and dependency on disconnected spreadsheets.', accent: '#7C8BFF' },
  { title: 'Scalable', body: 'Support multiple schools, departments, programmes and batches.', accent: '#E28040' },
  { title: 'Built for Continuity', body: 'Retain institutional knowledge beyond graduation and continuously grow the alumni ecosystem.', accent: '#F78CA0' },
];

const ADVANTAGE_FLOW = [
  { label: 'Student', tint: 'lavender' as Tint },
  { label: 'Career Readiness', tint: 'mint' as Tint },
  { label: 'Training', tint: 'cream' as Tint },
  { label: 'Opportunity', tint: 'rose' as Tint },
  { label: 'Application', tint: 'lavender' as Tint },
  { label: 'Recruitment', tint: 'mint' as Tint },
  { label: 'Placement', tint: 'cream' as Tint },
  { label: 'Alumni', tint: 'rose' as Tint },
  { label: 'Institutional Network', tint: 'lavender' as Tint },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-app">
      <SiteHeader />

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-white">
        <div
          className="pointer-events-none absolute -right-24 -top-40 h-[560px] w-[560px] rounded-full opacity-70"
          style={{ background: 'radial-gradient(circle, rgba(59,110,245,0.08) 0%, rgba(255,255,255,0) 70%)' }}
        />
        <div
          className="pointer-events-none absolute -left-32 bottom-0 h-[420px] w-[420px] rounded-full opacity-70"
          style={{ background: 'radial-gradient(circle, rgba(226,128,64,0.08) 0%, rgba(255,255,255,0) 70%)' }}
        />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-12 px-6 py-16 sm:py-20 lg:flex-row lg:items-center lg:py-24">
          <div className="w-full max-w-xl text-center lg:text-left">
            <span className="inline-flex items-center rounded-full bg-primary-50 px-3.5 py-1.5 text-xs font-medium text-primary-600">
              The Complete Placement &amp; Career Readiness Platform
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-strong sm:text-5xl">
              From Campus
              <br />
              to Career.
            </h1>
            <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-subtle lg:mx-0">
              CampusGo connects students, training, employers, opportunities, recruitment and
              placement outcomes in one centralized platform — helping institutions manage the
              complete journey, before, during and after placement.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/contact?intent=demo"
                className="inline-flex h-12 items-center rounded-md bg-gradient-accent px-6 text-sm font-semibold text-accent-foreground shadow-nav hover:opacity-95"
              >
                Request a Demo
              </Link>
              <a href="#platform" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
                Explore CampusGo ↓
              </a>
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 lg:justify-start">
              <TrustItem color="#3B6EF5">One branded portal per college</TrustItem>
              <TrustItem color="#1F9D6B">Readiness to alumni, one system</TrustItem>
              <TrustItem color="#E28040">Multi-college, tenant-isolated by design</TrustItem>
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
          <ValueStat tint="mint" icon={<TargetIcon />} label="Readiness before opportunity" body="Understand student preparedness across four pillars before an opportunity even opens." />
          <ValueStat tint="cream" icon={<BuildingIcon />} label="Built for many colleges" body="Each college gets its own branded, isolated portal — logo, email identity, and data." />
        </div>
      </section>

      {/* ============ MORE THAN PLACEMENT MANAGEMENT ============ */}
      <section id="platform" className="mx-auto max-w-6xl px-6 py-14">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-600">More Than Placement Management</span>
          <h2 className="mt-2.5 text-3xl font-extrabold tracking-tight text-strong">Build a Connected Career Ecosystem</h2>
          <p className="mt-3.5 text-sm leading-relaxed text-subtle">
            Placement teams manage far more than job opportunities — student profiles, eligibility,
            recruiters, applications, interviews, training, assessments, internships, alumni and
            institutional reporting. Managed separately, that information scatters across
            spreadsheets, emails and disconnected systems. CampusGo brings it together.
          </p>
        </div>
        <div className="mt-11 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {CORE_FEATURES.map((f) => (
            <div key={f.title} className="rounded-card bg-card p-5 shadow-card">
              <div className={`flex h-10 w-10 items-center justify-center rounded-md ${TINT_BG[f.tint]}`}>
                <span className={TINT_FG[f.tint]}>{f.icon}</span>
              </div>
              <p className="mt-3.5 text-sm font-bold text-strong">{f.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-subtle">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ ONE CONNECTED JOURNEY ============ */}
      <section className="bg-muted py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-strong">One Connected Journey</h2>
            <p className="mt-3 text-sm leading-relaxed text-subtle">
              CampusGo connects the activities that are often managed independently — from student
              readiness all the way to placement outcomes.
            </p>
          </div>
          <div className="mt-11 grid grid-cols-2 gap-5 sm:grid-cols-4">
            {JOURNEY_STEPS.map((s) => (
              <div key={s.n} className="rounded-card bg-card p-5 shadow-card">
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-pill text-xs font-extrabold text-white ${GRADIENT_BG[s.gradient]}`}
                >
                  {s.n}
                </span>
                <p className="mt-3 text-sm font-bold text-strong">{s.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-subtle">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ STUDENT CAREER READINESS ============ */}
      <section id="readiness" className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-600">Student Career Readiness</span>
          <h2 className="mt-2.5 text-3xl font-extrabold tracking-tight text-strong">
            Placement Starts Before the First Job Opportunity
          </h2>
          <p className="mt-3.5 text-sm leading-relaxed text-subtle">
            A student receiving a placement opportunity does not necessarily mean the student is
            ready for it. CampusGo helps institutions understand student readiness through four
            core employability pillars.
          </p>
        </div>
        <div className="mt-11 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {READINESS_PILLARS.map((p) => (
            <div key={p.title} className="rounded-card bg-card p-5 shadow-card">
              <div className={`flex h-10 w-10 items-center justify-center rounded-md ${TINT_BG[p.tint]}`}>
                <span className={TINT_FG[p.tint]}>{p.icon}</span>
              </div>
              <p className="mt-3.5 text-sm font-bold text-strong">{p.title}</p>
              <ul className="mt-2 space-y-1">
                {p.items.map((it) => (
                  <li key={it} className="text-xs leading-relaxed text-subtle">{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 rounded-card border border-primary-100 bg-primary-50/60 p-5 text-center sm:text-left">
          <p className="text-sm font-bold text-strong">Assess. Develop. Reassess.</p>
          <p className="mt-1 text-xs leading-relaxed text-subtle">
            Pre- and post-training assessments help institutions measure student improvement
            across these core employability areas — know who participated, how they performed,
            where skill gaps exist, and what needs further development.
          </p>
        </div>
      </section>

      {/* ============ RECRUITMENT, START TO FINISH ============ */}
      <section className="bg-muted py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-start gap-12 lg:flex-row">
            <div className="w-full lg:w-[380px] lg:flex-shrink-0">
              <h2 className="text-3xl font-extrabold tracking-tight text-strong">
                Every Opportunity. One Source of Truth.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-subtle">
                Find the right students for every opportunity, and track their progress round by
                round — configured around how your institution actually recruits.
              </p>
              <div className="mt-6 flex flex-col gap-2.5">
                <FunnelPill>Applied → Aptitude → GD → Technical → HR → Selected</FunnelPill>
                <FunnelPill>Applied → Round 1 → Round 2 → Round 3 → Selected</FunnelPill>
              </div>
              <div className="mt-7 overflow-hidden rounded-card shadow-card">
                <DashboardMockup />
              </div>
            </div>
            <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2">
              {RECRUITMENT_TOPICS.map((t) => (
                <div key={t.title}>
                  <p className="text-sm font-bold text-strong">{t.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-subtle" dangerouslySetInnerHTML={{ __html: t.body }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ STUDENT PLACEMENT DASHBOARD ============ */}
      <section id="students" className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-col items-center gap-12 lg:flex-row">
          <div className="w-full max-w-md text-center lg:max-w-none lg:flex-1 lg:text-left">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-600">
              Student Placement Dashboard
            </span>
            <h2 className="mt-2.5 text-3xl font-extrabold tracking-tight text-strong">
              Give Students Clarity. Not Complexity.
            </h2>
            <p className="mx-auto mt-3.5 max-w-md text-sm leading-relaxed text-subtle lg:mx-0">
              Students get a focused view of their placement journey — install it like an app, and
              new jobs, deadlines and offer updates reach them the moment they happen.
            </p>
            <div className="mx-auto mt-8 grid max-w-md grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:mx-0">
              {STUDENT_FEATURES.map((f) => (
                <div key={f.title} className="flex gap-3">
                  <div className={`mt-0.5 flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-md ${TINT_BG[f.tint]}`}>
                    <span className={TINT_FG[f.tint]}><CheckIcon /></span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-strong">{f.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-subtle">{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm font-bold text-strong">Know where you stand. Know what comes next.</p>
          </div>

          <div className="flex w-full max-w-[260px] flex-shrink-0 justify-center lg:w-[300px]">
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* ============ COMPANIES & COMMUNICATION ============ */}
      <section className="bg-muted py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
            {EXTENDED_TOPICS.map((t, i) => (
              <div key={t.title} className="rounded-card bg-card p-7 shadow-card">
                <div className={`flex h-10 w-10 items-center justify-center rounded-md ${TINT_BG[TINTS[i % TINTS.length]!]}`}>
                  <span className={TINT_FG[TINTS[i % TINTS.length]!]}>{i === 0 ? <HandshakeIcon /> : <MailIcon />}</span>
                </div>
                <span className="mt-4 block text-xs font-semibold uppercase tracking-wider text-primary-600">{t.eyebrow}</span>
                <p className="mt-1.5 text-xl font-extrabold text-strong">{t.title}</p>
                <p className="mt-2.5 text-sm leading-relaxed text-subtle">{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ INTERNSHIPS & ALUMNI ============ */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-600">Internships &amp; PPOs</span>
            <h2 className="mt-2.5 text-2xl font-extrabold tracking-tight text-strong">
              Extend the Career Journey Beyond Final Placements
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-subtle">
              Placement is only one part of a student&rsquo;s transition to employment. Track internship
              participation, completion and pre-placement offers alongside placement data.
            </p>
            <div className="mt-5">
              <FunnelPill>Opportunity → Student → Company → Internship → Completion → PPO</FunnelPill>
            </div>
          </div>

          <div className="lg:col-span-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-600">Alumni</span>
            <h2 className="mt-2.5 text-2xl font-extrabold tracking-tight text-strong">
              Your Data Doesn&rsquo;t End With Graduation
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-subtle">
              When students graduate, their records transition into the alumni ecosystem — retaining
              valuable information instead of losing it to the next incoming batch.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <AlumniYear year="Year 1" body="Students graduate — alumni records begin accumulating." tint="lavender" />
              <AlumniYear year="Year 2" body="Next batch joins — previous alumni remain." tint="mint" />
              <AlumniYear year="Year 3" body="Another batch joins — the network keeps growing." tint="cream" />
            </div>
            <p className="mt-4 text-sm font-bold text-strong">Your data grows. It doesn&rsquo;t reset.</p>
          </div>
        </div>
      </section>

      {/* ============ REPORTS & INSTITUTIONAL INSIGHTS ============ */}
      <section id="reports" className="bg-muted py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-600">Reports &amp; Institutional Insights</span>
            <h2 className="mt-2.5 text-3xl font-extrabold tracking-tight text-strong">
              Turn Placement Activity Into Meaningful Data
            </h2>
            <p className="mt-3.5 text-sm leading-relaxed text-subtle">
              CampusGo brings placement, training, internship, recruitment and alumni information
              into a structured digital environment — from data collection to institutional insight.
            </p>
          </div>
          <div className="mt-11 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {REPORT_CATEGORIES.map((c) => (
              <div key={c.title} className="rounded-card bg-card p-5 shadow-card">
                <p className={`text-sm font-extrabold ${TINT_FG[c.tint]}`}>{c.title}</p>
                <ul className="mt-2.5 space-y-1.5">
                  {c.items.map((it) => (
                    <li key={it} className="text-xs leading-relaxed text-subtle">{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-card border border-tint-cream bg-tint-cream/60 p-6 text-center">
            <p className="text-sm leading-relaxed text-body">
              The structured data and reports generated through CampusGo can support institutional
              documentation and reporting relevant to{' '}
              <span className="font-bold text-strong">NAAC, NIRF, UGC</span> and other academic and
              accreditation-related requirements.
            </p>
            <p className="mt-2 text-sm font-bold text-strong">Capture Once. Organize Continuously. Report When Required.</p>
          </div>
        </div>
      </section>

      {/* ============ BUILT FOR COLLEGES & UNIVERSITIES ============ */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-600">Built for Colleges &amp; Universities</span>
          <h2 className="mt-2.5 text-3xl font-extrabold tracking-tight text-strong">
            Designed Around Your Academic Structure
          </h2>
          <p className="mt-3.5 text-sm leading-relaxed text-subtle">
            Whether you&rsquo;re managing a college with a few programmes or a university with multiple
            academic schools, CampusGo keeps placement information organized within your
            institutional structure.
          </p>
        </div>
        <div className="mt-11">
          <HierarchyDiagram />
        </div>
      </section>

      {/* ============ A PLATFORM FOR EVERY STAKEHOLDER ============ */}
      <section className="bg-muted py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-600">A Platform for Every Stakeholder</span>
            <h2 className="mt-2.5 text-3xl font-extrabold tracking-tight text-strong">One Ecosystem. Different Experiences.</h2>
          </div>
          <div className="mt-11 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {STAKEHOLDERS.map((s) => (
              <div key={s.title} className="rounded-card bg-card p-5 shadow-card">
                <div className={`flex h-10 w-10 items-center justify-center rounded-md ${TINT_BG[s.tint]}`}>
                  <span className={TINT_FG[s.tint]}>{s.icon}</span>
                </div>
                <p className="mt-3.5 text-sm font-bold text-strong">{s.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-subtle">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ WHY CAMPUSGO ============ */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-strong">Why CampusGo?</h2>
          <p className="mt-3 text-sm leading-relaxed text-subtle">Because placement is a journey, not an event.</p>
        </div>
        <div className="mt-11 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_CAMPUSGO.map((w) => (
            <div key={w.title} className="rounded-card bg-card p-6 shadow-card" style={{ borderTop: `3px solid ${w.accent}` }}>
              <p className="text-sm font-extrabold" style={{ color: w.accent }}>{w.title}</p>
              <p className="mt-2 text-xs leading-relaxed text-body">{w.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ THE CAMPUSGO ADVANTAGE ============ */}
      <section className="bg-[#0B1330] py-16">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-300">The CampusGo Advantage</span>
          <h2 className="mx-auto mt-2.5 max-w-2xl text-3xl font-extrabold tracking-tight text-white">
            Most Placement Systems Stop at Placement. CampusGo Continues.
          </h2>
          <p className="mx-auto mt-3.5 max-w-md text-sm leading-relaxed text-white/60">
            A student&rsquo;s journey doesn&rsquo;t end when an offer letter is issued.
          </p>
          <div className="mx-auto mt-10 flex max-w-4xl flex-wrap items-center justify-center gap-2.5">
            {ADVANTAGE_FLOW.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2.5">
                <span className={`rounded-pill px-3.5 py-1.5 text-xs font-semibold ${TINT_BG[step.tint]} ${TINT_FG[step.tint]}`}>
                  {step.label}
                </span>
                {i < ADVANTAGE_FLOW.length - 1 && <span className="text-white/30">→</span>}
              </div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-md text-sm font-semibold text-white/85">
            It creates a connected career ecosystem for the institution.
          </p>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="relative overflow-hidden rounded-card bg-[#0B1330] px-8 py-12 sm:px-14">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(91,141,239,0.4) 0%, rgba(11,19,48,0) 70%)' }}
          />
          <div
            className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(247,140,160,0.28) 0%, rgba(11,19,48,0) 70%)' }}
          />
          <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="max-w-md">
              <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-[28px]">
                Ready to Move From Spreadsheets to a Connected Placement Ecosystem?
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-white/60">
                Bring your students, recruiters, opportunities and outcomes together.
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-col gap-3 sm:flex-row">
              <Link
                href="/contact?intent=demo"
                className="inline-flex h-12 items-center justify-center rounded-md bg-gradient-accent px-6 text-sm font-semibold text-accent-foreground shadow-nav hover:opacity-95"
              >
                Request a Demo
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-12 items-center justify-center rounded-md border border-white/20 bg-white/10 px-6 text-sm font-semibold text-white hover:bg-white/15"
              >
                Talk to Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function TrustItem({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-sm text-body">{children}</span>
    </div>
  );
}

function ValueStat({ tint, icon, label, body }: { tint: Tint; icon: React.ReactNode; label: string; body: string }) {
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

function FunnelPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex w-fit items-center rounded-pill border border-border bg-card px-3.5 py-2 text-xs font-medium text-body shadow-card">
      {children}
    </div>
  );
}

function AlumniYear({ year, body, tint }: { year: string; body: string; tint: Tint }) {
  return (
    <div className={`rounded-card p-4 ${TINT_BG[tint]}`}>
      <p className={`text-sm font-extrabold ${TINT_FG[tint]}`}>{year}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-body">{body}</p>
    </div>
  );
}

/** Institution → School → Programme → Batch → Students, as a simple connected chain. */
function HierarchyDiagram() {
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
            <span className="text-lg text-subtle sm:rotate-0">
              <span className="sm:hidden">↓</span>
              <span className="hidden sm:inline">→</span>
            </span>
          )}
        </div>
      ))}
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
          <stop offset="0" stopColor="#FBC2A4" /><stop offset="1" stopColor="#F78CA0" />
        </linearGradient>
      </defs>
      <line x1="70" y1="90" x2="330" y2="370" stroke="rgba(11,19,48,0.12)" strokeWidth="2" strokeDasharray="3 8" />
      <rect x="20" y="40" width="200" height="88" rx="16" fill="url(#hg1)" opacity="0.92" transform="rotate(-6 120 84)" />
      <rect x="150" y="160" width="220" height="88" rx="16" fill="url(#hg2)" opacity="0.95" transform="rotate(4 260 204)" />
      <rect x="60" y="290" width="230" height="88" rx="16" fill="url(#hg3)" transform="rotate(-3 175 334)" />
      <circle cx="330" cy="120" r="26" fill="#0B1330" stroke="#6488FB" strokeWidth="2" />
      <path d="M320 120l7 7 13-14" stroke="#8FAEFF" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="60" cy="380" r="5" fill="#8FAEFF" />
      <circle cx="380" cy="40" r="5" fill="#F78CA0" />
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
      </div>
    </div>
  );
}

function PhoneCard({ title, company, status, tint }: { title: string; company: string; status: string; tint: Tint }) {
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function DatabaseIcon() {
  return (
    <svg {...sv}>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" strokeLinecap="round" />
      <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" strokeLinecap="round" />
    </svg>
  );
}
function TargetIcon() {
  return (
    <svg {...sv}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}
function GraduationCapIcon() {
  return (
    <svg {...sv}>
      <path d="M2 9 12 4l10 5-10 5-10-5Z" strokeLinejoin="round" />
      <path d="M6 11.5V17c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5.5" strokeLinecap="round" />
      <path d="M22 9v6" strokeLinecap="round" />
    </svg>
  );
}
function HandshakeIcon() {
  return (
    <svg {...sv}>
      <path d="M2 12l4-4 4 3 3-3 3 3 4-4 2 2-5 8-4-2-4 2-5-5Z" strokeLinejoin="round" />
    </svg>
  );
}
function AwardIcon() {
  return (
    <svg {...sv}>
      <circle cx="12" cy="8" r="5.5" />
      <path d="M8.5 13 7 21l5-2.5L17 21l-1.5-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg {...sv}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" strokeLinecap="round" />
      <circle cx="18" cy="8.5" r="2.5" />
      <path d="M15.5 13.5c2.9.4 5 2.9 5 6" strokeLinecap="round" />
    </svg>
  );
}
function PuzzleIcon() {
  return (
    <svg {...sv}>
      <path d="M9 4h4v2.2a1.8 1.8 0 1 0 0 3.6V12h2.2a1.8 1.8 0 1 1 0 3.6H15v4H4v-4h2.2a1.8 1.8 0 1 0 0-3.6H4V4h5Z" strokeLinejoin="round" />
    </svg>
  );
}
function ToolsIcon() {
  return (
    <svg {...sv}>
      <path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4l-3-3-2.7 2.7" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg {...sv}>
      <path d="M4 5h16v11H8l-4 4V5Z" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M8 9h8M8 12.5h5" strokeLinecap="round" />
    </svg>
  );
}
function BriefcaseIcon() {
  return (
    <svg {...sv}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg {...sv}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 6.5 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function NetworkIcon() {
  return (
    <svg {...sv}>
      <circle cx="12" cy="5" r="2.5" />
      <circle cx="5" cy="18" r="2.5" />
      <circle cx="19" cy="18" r="2.5" />
      <path d="M12 7.5v4M10.2 13.7 6.8 16M13.8 13.7l3.4 2.3" strokeLinecap="round" />
    </svg>
  );
}
