'use client';

import { use, useEffect, useState } from 'react';
import { Button, Card } from '@campusgo/ui';
import { RatingRow, RatingScaleLegend } from '../../../../components/rating-scale';
import {
  getPublicEmployerFeedbackContext,
  submitPublicEmployerFeedback,
  type EmployerFeedbackPublicContext,
  type RecruiterVerdict,
} from '../../../../lib/feedback';

const EMPTY_RATINGS = {
  knowledgeSkills: 0,
  communicationSkills: 0,
  problemSolving: 0,
  teamworkAdaptability: 0,
  professionalism: 0,
  overallEmployability: 0,
  curriculumRelevance: 0,
  trainingEffectiveness: 0,
};

const RATING_QUESTIONS: Array<{ key: keyof typeof EMPTY_RATINGS; label: string }> = [
  { key: 'knowledgeSkills', label: "Quality of students' knowledge and skills" },
  { key: 'communicationSkills', label: 'Communication skills' },
  { key: 'problemSolving', label: 'Problem-solving and analytical skills' },
  { key: 'teamworkAdaptability', label: 'Teamwork and adaptability' },
  { key: 'professionalism', label: 'Professionalism and work ethics' },
  { key: 'overallEmployability', label: 'Overall employability of students' },
  { key: 'curriculumRelevance', label: 'Relevance of the curriculum to industry requirements' },
  { key: 'trainingEffectiveness', label: 'Effectiveness of training provided by the institution' },
];

const inputCls =
  'h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400';
const areaCls =
  'w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary-400';

export default function EmployerFeedbackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [ctx, setCtx] = useState<EmployerFeedbackPublicContext | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    getPublicEmployerFeedbackContext(token)
      .then((c) => {
        setCtx(c);
        if (c.submitted) setDone(true);
      })
      .catch(() => setNotFound(true));
  }, [token]);

  if (notFound) {
    return (
      <Card className="space-y-2 p-6 text-center">
        <h1 className="text-lg font-semibold text-strong">Feedback link invalid</h1>
        <p className="text-sm text-subtle">This feedback link doesn&apos;t match an active job.</p>
      </Card>
    );
  }

  if (done) {
    return (
      <Card className="space-y-3 p-6 text-center">
        <h1 className="text-lg font-semibold text-strong">Thank you for your feedback! 🙏</h1>
        <p className="text-sm text-body">
          {ctx ? `Your response for "${ctx.jobTitle}" at ${ctx.companyName} has been recorded.` : 'Your response has been recorded.'}
        </p>
      </Card>
    );
  }

  if (!ctx) {
    return (
      <Card className="p-6 text-center text-sm text-subtle">Loading…</Card>
    );
  }

  return <FeedbackForm token={token} ctx={ctx} onDone={() => setDone(true)} />;
}

function FeedbackForm({
  token,
  ctx,
  onDone,
}: {
  token: string;
  ctx: EmployerFeedbackPublicContext;
  onDone: () => void;
}) {
  const [contactPerson, setContactPerson] = useState('');
  const [designation, setDesignation] = useState('');
  const [ratings, setRatings] = useState({ ...EMPTY_RATINGS });
  const [improvementAreas, setImprovementAreas] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [recruitAgain, setRecruitAgain] = useState<RecruiterVerdict | ''>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allRated = RATING_QUESTIONS.every((q) => ratings[q.key] > 0);
  const valid = contactPerson.trim() && allRated && recruitAgain;

  async function submit() {
    if (!valid || !recruitAgain) return;
    setBusy(true);
    setError(null);
    try {
      await submitPublicEmployerFeedback(token, {
        contactPerson: contactPerson.trim(),
        designation: designation.trim() || undefined,
        ...ratings,
        improvementAreas: improvementAreas.trim() || undefined,
        suggestions: suggestions.trim() || undefined,
        recruitAgain,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit feedback');
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-5 p-6">
      <div className="space-y-1 text-center">
        <h1 className="text-lg font-bold text-strong">Employer Feedback Form</h1>
        <p className="text-sm text-subtle">
          {ctx.jobTitle} · {ctx.companyName}
        </p>
      </div>

      <div className="space-y-3 rounded-md bg-app p-3">
        <p className="text-xs font-semibold uppercase text-subtle">Employer details</p>
        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <Field label="Company Name">{ctx.companyName}</Field>
          <Field label="Industry">{ctx.industry ?? '—'}</Field>
          <Field label="Programme Recruited From">{ctx.programmes.join(', ') || '—'}</Field>
          <Field label="Academic Year">{ctx.academicYears.join(', ') || '—'}</Field>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="space-y-1 block">
            <span className="text-xs font-medium text-subtle">Contact Person *</span>
            <input className={inputCls} value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
          </label>
          <label className="space-y-1 block">
            <span className="text-xs font-medium text-subtle">Designation</span>
            <input className={inputCls} value={designation} onChange={(e) => setDesignation(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-strong">Please rate the following</p>
        <RatingScaleLegend />
        <div>
          {RATING_QUESTIONS.map((q) => (
            <RatingRow
              key={q.key}
              label={q.label}
              value={ratings[q.key]}
              onChange={(v) => setRatings((r) => ({ ...r, [q.key]: v }))}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-strong">Open Feedback</p>
        <label className="space-y-1 block">
          <span className="text-xs font-medium text-subtle">What skills or areas need improvement?</span>
          <textarea className={areaCls} rows={3} value={improvementAreas} onChange={(e) => setImprovementAreas(e.target.value)} />
        </label>
        <label className="space-y-1 block">
          <span className="text-xs font-medium text-subtle">Suggestions for improving student employability</span>
          <textarea className={areaCls} rows={3} value={suggestions} onChange={(e) => setSuggestions(e.target.value)} />
        </label>
        <label className="space-y-1 block">
          <span className="text-xs font-medium text-subtle">Would you consider recruiting our students in the future? *</span>
          <select
            className={inputCls}
            value={recruitAgain}
            onChange={(e) => setRecruitAgain(e.target.value as RecruiterVerdict)}
          >
            <option value="">Select…</option>
            <option value="YES">Yes</option>
            <option value="MAYBE">Maybe</option>
            <option value="NO">No</option>
          </select>
        </label>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <Button size="lg" className="w-full" onClick={submit} disabled={!valid || busy}>
        {busy ? 'Submitting…' : 'Submit feedback'}
      </Button>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-subtle">{label}</p>
      <p className="font-medium text-strong">{children}</p>
    </div>
  );
}
