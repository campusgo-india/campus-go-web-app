import { LegalPageShell, LegalSection } from '../../components/legal-page-shell';

export const metadata = {
  title: 'Terms & Conditions — CampusGO',
  description: 'The terms that govern use of the CampusGO placement platform.',
};

const UPDATED = 'August 30, 2026';

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms &amp; Conditions" updated={UPDATED}>
      <p className="text-sm leading-relaxed text-body">
        These terms govern your use of CampusGO (&ldquo;the platform&rdquo;) — a placement
        management system licensed to your college. By signing in and using an account on the
        platform, you agree to these terms.
      </p>

      <LegalSection n={1} title="Who this applies to">
        <p>
          Accounts on the platform are for students, placement staff (Placement Officers,
          Placement Coordinators, College Admins), and alumni of a college that has licensed
          CampusGO, plus recruiters interacting with a specific job&rsquo;s feedback link. Student
          and staff accounts are created by your college&rsquo;s placement cell; alumni accounts are
          created via self-registration and are subject to the college&rsquo;s approval.
        </p>
      </LegalSection>

      <LegalSection n={2} title="Your account">
        <p>
          You&rsquo;re responsible for keeping your login credentials confidential and for
          activity that happens under your account. Information you provide — academic records,
          resume, contact details — should be accurate; you&rsquo;re responsible for correcting
          anything that changes or was entered incorrectly, since recruiters and your placement
          team rely on it.
        </p>
      </LegalSection>

      <LegalSection n={3} title="Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Impersonate another person or misrepresent your affiliation with a college.</li>
          <li>
            Scrape, bulk-export, or otherwise extract platform data beyond the normal exports
            provided to your role.
          </li>
          <li>
            Use contact information obtained through the platform (e.g. a recruiter&rsquo;s or
            student&rsquo;s details) for anything unrelated to the placement process it was shared
            for.
          </li>
          <li>Attempt to circumvent a job&rsquo;s eligibility criteria or verification process.</li>
          <li>Interfere with the platform&rsquo;s normal operation or attempt unauthorized access.</li>
        </ul>
      </LegalSection>

      <LegalSection n={4} title="The placement process">
        <p>
          CampusGO facilitates the placement process — job postings, applications, interview
          tracking, and offers — but does not itself employ students or guarantee a placement,
          interview, or offer. Hiring decisions rest entirely with recruiters; eligibility rules
          and process policy (including any restriction on the number of offers a student may hold)
          are set by your college&rsquo;s placement cell.
        </p>
      </LegalSection>

      <LegalSection n={5} title="Content you provide">
        <p>
          You retain ownership of content you upload — your resume, profile details, feedback
          responses. By uploading it, you grant CampusGO a limited license to store, process, and
          display it as needed to operate the platform (for example, sharing your resume with a
          recruiter for a job you applied to). Job postings and company information belong to the
          placement team or recruiter that submitted them.
        </p>
      </LegalSection>

      <LegalSection n={6} title="Third-party content">
        <p>
          Job postings, company details, and any external links (e.g. a recruiter&rsquo;s
          application form) are provided by third parties. CampusGO isn&rsquo;t responsible for the
          accuracy of a job posting or the conduct of a recruiter or company listed on the
          platform.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Suspension &amp; termination">
        <p>
          Your college&rsquo;s placement cell may deactivate or restrict an account — for example,
          on graduation, a policy violation, or at the student&rsquo;s own request. We may also
          suspend access where necessary to protect the platform or other users.
        </p>
      </LegalSection>

      <LegalSection n={8} title="Availability &amp; liability">
        <p>
          The platform is provided on an &ldquo;as is&rdquo; basis. We aim for reliable uptime but
          don&rsquo;t guarantee uninterrupted availability, and we aren&rsquo;t liable for outcomes
          of the placement process itself (an offer withdrawn, a missed deadline due to factors
          outside the platform, etc.) beyond what&rsquo;s required by applicable law.
        </p>
      </LegalSection>

      <LegalSection n={9} title="Governing law">
        <p>These terms are governed by the laws of India.</p>
      </LegalSection>

      <LegalSection n={10} title="Changes to these terms">
        <p>
          If these terms change materially, we&rsquo;ll update the date at the top of this page.
          Continued use of the platform after a change means you accept the updated terms.
        </p>
      </LegalSection>

      <LegalSection n={11} title="Contact us">
        <p>
          Questions about these terms can be sent to{' '}
          <a href="mailto:campusgo@campusgoindia.com" className="text-primary-600 hover:underline">
            campusgo@campusgoindia.com
          </a>
          , or raised with your college&rsquo;s placement cell directly.
        </p>
      </LegalSection>

      <p className="border-t border-border pt-6 text-xs text-subtle">
        This page is a general description of our terms of service and isn&rsquo;t a substitute
        for legal advice specific to your institution.
      </p>
    </LegalPageShell>
  );
}
