'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Card, StatTile } from '@campusgo/ui';
import { ListSkeleton } from '../../../components/page-skeleton';
import {
  getStudentFeedbackSummary,
  listEmployerFeedback,
  PLACEMENT_STATUS_LABEL,
  type EmployerFeedbackListRow,
  type StudentFeedbackSummary,
} from '../../../lib/feedback';

const RATING_LABELS: Record<string, string> = {
  placementOpportunities: 'Quality of placement opportunities',
  careerGuidance: 'Career guidance',
  placementTraining: 'Placement preparation training',
  communicationOfOpportunities: 'Communication of opportunities',
  placementCellSupport: 'Placement Cell support',
  industryInteraction: 'Industry interaction',
  overallSupport: 'Overall placement support',
};

export default function FeedbackPage() {
  const [tab, setTab] = useState<'employer' | 'student'>('employer');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-strong">Feedback</h1>
        <p className="text-sm text-subtle">Employer feedback per job, and end-of-season student feedback.</p>
      </header>

      <div className="flex gap-2">
        <button
          onClick={() => setTab('employer')}
          className={`rounded-pill px-4 py-1.5 text-sm font-medium ${
            tab === 'employer' ? 'bg-primary-600 text-white' : 'bg-white text-body hover:bg-primary-50'
          }`}
        >
          Employer feedback
        </button>
        <button
          onClick={() => setTab('student')}
          className={`rounded-pill px-4 py-1.5 text-sm font-medium ${
            tab === 'student' ? 'bg-primary-600 text-white' : 'bg-white text-body hover:bg-primary-50'
          }`}
        >
          Student feedback
        </button>
      </div>

      {tab === 'employer' ? <EmployerTab /> : <StudentTab />}
    </div>
  );
}

function EmployerTab() {
  const [rows, setRows] = useState<EmployerFeedbackListRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listEmployerFeedback()
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, []);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!rows) return <ListSkeleton />;

  const submittedCount = rows.filter((r) => r.submitted).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Links generated" value={rows.length} />
        <StatTile label="Responses received" value={submittedCount} gradient="primary" />
        <StatTile
          label="Response rate"
          value={rows.length ? `${Math.round((submittedCount / rows.length) * 100)}%` : '—'}
        />
      </div>

      {rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-subtle">
          No feedback links generated yet. Generate one from a job&apos;s detail page.
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-app text-xs uppercase text-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">Job</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Overall employability</th>
                <th className="px-4 py-3 font-medium">Would recruit again</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.jobId} className="border-b border-border last:border-0 hover:bg-app/60">
                  <td className="px-4 py-3">
                    <Link href={`/jobs/${r.jobId}`} className="font-medium text-strong hover:underline">
                      {r.jobTitle}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-body">{r.companyName}</td>
                  <td className="px-4 py-3">
                    <Badge tint={r.submitted ? 'mint' : 'cream'}>
                      {r.submitted ? 'Submitted' : 'Awaiting response'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-body">{r.contactPerson ?? '—'}</td>
                  <td className="px-4 py-3 text-body">
                    {r.ratings?.overallEmployability != null ? `${r.ratings.overallEmployability} / 5` : '—'}
                  </td>
                  <td className="px-4 py-3 text-body">{r.recruitAgain ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function StudentTab() {
  const [data, setData] = useState<StudentFeedbackSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStudentFeedbackSummary()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, []);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!data) return <ListSkeleton />;

  return (
    <div className="space-y-4">
      <StatTile label="Responses" value={data.responseCount} gradient="primary" />

      {data.responseCount > 0 && (
        <Card className="space-y-3 p-5">
          <p className="text-sm font-semibold text-strong">Average ratings</p>
          <div className="space-y-2">
            {Object.entries(data.averages).map(([key, avg]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="text-body">{RATING_LABELS[key] ?? key}</span>
                <span className="font-medium text-strong">{avg != null ? `${avg} / 5.0` : '—'}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {data.responses.length === 0 ? (
        <Card className="p-8 text-center text-sm text-subtle">No student feedback submitted yet.</Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-app text-xs uppercase text-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Reg No.</th>
                <th className="px-4 py-3 font-medium">Programme</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Overall support</th>
                <th className="px-4 py-3 font-medium">Suggestions</th>
              </tr>
            </thead>
            <tbody>
              {data.responses.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-app/60">
                  <td className="px-4 py-3 font-medium text-strong">{r.fullName}</td>
                  <td className="px-4 py-3 text-body">{r.rollNumber}</td>
                  <td className="px-4 py-3 text-body">{r.programme}</td>
                  <td className="px-4 py-3">
                    <Badge tint="lavender">{PLACEMENT_STATUS_LABEL[r.placementStatus]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-body">{r.overallSupport} / 5</td>
                  <td className="px-4 py-3 max-w-xs truncate text-body" title={r.suggestions ?? ''}>
                    {r.suggestions ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
