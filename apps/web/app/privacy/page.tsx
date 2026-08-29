import { LegalPageShell, LegalSection } from '../../components/legal-page-shell';

export const metadata = {
  title: 'Privacy Policy — CampusGO',
  description: 'How CampusGO collects, uses, and protects student and college data.',
};

const UPDATED = 'August 30, 2026';

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Privacy Policy" updated={UPDATED}>
      <p className="text-sm leading-relaxed text-body">
        CampusGO (&ldquo;CampusGO&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) provides a placement
        management platform that colleges license to run their placement seasons — job postings,
        applications, interview pipelines, and student career records. This policy explains what
        data the platform collects, how it&rsquo;s used, and who it&rsquo;s shared with. It applies
        to students, placement staff (Placement Officers, Placement Coordinators, College Admins),
        alumni, and recruiters who interact with a college&rsquo;s CampusGO instance.
      </p>

      <LegalSection n={1} title="Who controls your data">
        <p>
          Each college operates its own CampusGO instance and is the data controller for its
          students&rsquo; and staff&rsquo;s information — accounts are created and managed by the
          college&rsquo;s placement cell, not through open self-signup (alumni self-registration is
          the one exception, and is subject to the college&rsquo;s own approval). CampusGO acts as
          the platform provider (data processor) that the college uses to store and operate on that
          data.
        </p>
      </LegalSection>

      <LegalSection n={2} title="What we collect">
        <p>Depending on your role, the platform holds:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <span className="font-medium text-strong">Account details</span> — name, email, phone
            number, and a securely hashed password (we never store your password in plain text).
          </li>
          <li>
            <span className="font-medium text-strong">Academic records</span> — roll number, school
            and programme, graduation year, CGPA/percentage, 10th and 12th percentages, backlog
            counts, and your uploaded resume.
          </li>
          <li>
            <span className="font-medium text-strong">Extended profile details</span> (student
            self-entered, optional) — date of birth, gender, address, and other eligibility-related
            fields a job may screen on. Fields like self-declared disability status are collected
            only for eligibility and institutional reporting purposes and are never shown to
            recruiters.
          </li>
          <li>
            <span className="font-medium text-strong">Placement activity</span> — jobs you apply to,
            application status and interview rounds, offers extended and accepted, and any offer
            letter you or your placement officer upload.
          </li>
          <li>
            <span className="font-medium text-strong">Training records</span> — assessment scores,
            session attendance, and training feedback you submit.
          </li>
          <li>
            <span className="font-medium text-strong">Usage &amp; audit data</span> — notification
            delivery status, and a log of significant actions taken by placement staff on student
            records (who verified a profile, who changed an application&rsquo;s stage, etc.), kept
            for accountability.
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={3} title="How we use it">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Matching you to jobs you&rsquo;re eligible for and letting you apply.</li>
          <li>
            Notifying you — by email and in-app — when a job is posted, your application moves
            forward, an interview is scheduled, or an offer is released.
          </li>
          <li>
            Giving your college&rsquo;s placement team the reporting and dashboards they need to run
            the season and track outcomes.
          </li>
          <li>Tracking your training progress and readiness for placements.</li>
        </ul>
      </LegalSection>

      <LegalSection n={4} title="Who we share it with">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <span className="font-medium text-strong">Your own college&rsquo;s placement staff</span>{' '}
            — they need full access to your placement-relevant records to run the process.
          </li>
          <li>
            <span className="font-medium text-strong">Recruiters</span> — only for a job you actively
            applied to, and only the fields your placement officer chooses to export for that
            drive (typically name, contact details, resume link, and academic percentages). We do
            not give recruiters standing access to the platform or to students who haven&rsquo;t
            applied to their job.
          </li>
        </ul>
        <p>
          We do not sell student data, and we do not share it with third parties for marketing
          purposes.
        </p>
      </LegalSection>

      <LegalSection n={5} title="How long we keep it">
        <p>
          Data is retained for the duration of your enrollment and placement cycle, and afterwards
          for as long as your college&rsquo;s own record-keeping policy requires (placement records
          are often needed for accreditation and reporting years later). You can request access,
          correction, or deletion of your data at any time through your college&rsquo;s placement
          cell, or by writing to us directly (below).
        </p>
      </LegalSection>

      <LegalSection n={6} title="Security">
        <p>
          All traffic to CampusGO is encrypted in transit (HTTPS). Passwords are hashed, never
          stored in plain text. Access to student data is role-based — a Placement Coordinator, for
          instance, only sees students in their assigned programmes — and significant staff actions
          on student records are logged.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Children's privacy">
        <p>
          CampusGO is built for college-level placement programmes and is not directed at, or
          knowingly used to collect data from, children under 13.
        </p>
      </LegalSection>

      <LegalSection n={8} title="Changes to this policy">
        <p>
          If this policy changes materially, we&rsquo;ll update the date at the top of this page.
          Continued use of the platform after a change means you accept the updated policy.
        </p>
      </LegalSection>

      <LegalSection n={9} title="Contact us">
        <p>
          Questions about this policy, or a request to access/correct/delete your data, can be sent
          to{' '}
          <a href="mailto:campusgo@campusgoindia.com" className="text-primary-600 hover:underline">
            campusgo@campusgoindia.com
          </a>
          , or raised with your college&rsquo;s placement cell directly.
        </p>
      </LegalSection>

      <p className="border-t border-border pt-6 text-xs text-subtle">
        This page is a general description of our data practices and isn&rsquo;t a substitute for
        legal advice specific to your institution.
      </p>
    </LegalPageShell>
  );
}
