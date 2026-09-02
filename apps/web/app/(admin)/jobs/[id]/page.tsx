'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card } from '@campusgo/ui';
import { PdfModal } from '../../../../components/pdf-modal';
import { useRouter } from 'next/navigation';
import {
  closeJob,
  deleteJob,
  downloadJobApplicants,
  getEligibleStudents,
  getJob,
  publishJob,
  jobLifecycle,
  jobLifecycleTint,
  type ApplicantExportFormat,
  type EligibleStudent,
  type Job,
} from '../../../../lib/jobs';
import { useConfirm } from '../../../../components/confirm-provider';
import { DetailSkeleton } from '../../../../components/page-skeleton';
import {
  getEmployerFeedbackForJob,
  getOrCreateEmployerFeedbackLink,
  type EmployerFeedback,
} from '../../../../lib/feedback';

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const confirm = useConfirm();
  const [job, setJob] = useState<Job | null>(null);
  const [eligible, setEligible] = useState<EligibleStudent[] | null>(null);
  const [showEligible, setShowEligible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<ApplicantExportFormat>('csv');
  const [exportFull, setExportFull] = useState(false);

  async function load() {
    try {
      setJob(await getJob(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // Precompute the eligible-student list so the count shows straight away.
    getEligibleStudents(id)
      .then(setEligible)
      .catch(() => setEligible([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onPublish() {
    setBusy(true);
    setError(null);
    try {
      const res = await publishJob(id);
      setJob(res.job);
      alert(`Published — ${res.eligibleCount} eligible student(s).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setBusy(false);
    }
  }

  async function onClose() {
    setBusy(true);
    setError(null);
    try {
      setJob(await closeJob(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Close failed');
    } finally {
      setBusy(false);
    }
  }

  async function openPdf() {
    setLoadingPdf(true);
    setError(null);
    try {
      setPdfObjectUrl(job?.pdfUrl ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open PDF');
    } finally {
      setLoadingPdf(false);
    }
  }

  function closePdf() {
    setPdfObjectUrl(null);
  }

  async function exportApplicants() {
    setBusy(true);
    setError(null);
    try {
      await downloadJobApplicants(id, exportFormat, exportFull);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    const ok = await confirm({
      title: `Delete "${job?.title}"?`,
      message: 'This permanently removes the job and all its applications. This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
      acknowledgement: 'I understand this is permanent.',
    });
    if (!ok) return;
    try {
      await deleteJob(id);
      router.push('/jobs');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  if (loading) return <DetailSkeleton />;
  if (!job) return <p className="text-danger">{error ?? 'Job not found'}</p>;

  const workModeLabel = job.workMode
    ? job.workMode === 'ONSITE'
      ? 'Work from office'
      : job.workMode.charAt(0) + job.workMode.slice(1).toLowerCase()
    : null;
  const company = job.companyName ?? job.company?.name ?? 'Company';
  const chips = [job.jobType.replace(/_/g, ' '), workModeLabel, job.location].filter(
    Boolean,
  ) as string[];
  // Platform jobs are owned by the Platform Admin — officers manage their own
  // applicants via the funnel but cannot edit, publish, or close the posting.
  const isPlatform = !!job.isPlatform;
  const deadline = job.applicationDeadline ? new Date(job.applicationDeadline) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/jobs" className="text-sm text-primary-600 hover:underline">
          ← Jobs
        </Link>
        <div className="flex items-center gap-2">
          {!isPlatform && job.status !== 'CLOSED' && (
            <Link href={`/jobs/${id}/edit`}>
              <Button variant="outline" size="sm">
                Edit
              </Button>
            </Link>
          )}
          {!isPlatform && job.status === 'DRAFT' && (
            <Button size="sm" onClick={onPublish} disabled={busy}>
              Publish
            </Button>
          )}
          {!isPlatform && job.status !== 'DRAFT' && (
            <>
              <div className="flex items-center gap-1 rounded-pill border border-border bg-white p-0.5 shadow-card">
                {(['csv', 'xlsx'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setExportFormat(f)}
                    className={
                      'rounded-pill px-2.5 py-1 text-xs font-medium transition ' +
                      (exportFormat === f
                        ? 'bg-gradient-primary text-white'
                        : 'text-subtle hover:text-strong')
                    }
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
              <label
                className="flex items-center gap-1.5 text-xs font-medium text-subtle"
                title="Also includes 10th/12th %, current %, gender and backlogs — for when HR asks for a fuller profile."
              >
                <input
                  type="checkbox"
                  checked={exportFull}
                  onChange={(e) => setExportFull(e.target.checked)}
                  className="h-3.5 w-3.5 accent-primary-600"
                />
                Full details
              </label>
              <Button variant="outline" size="sm" onClick={exportApplicants} disabled={busy}>
                Export
              </Button>
            </>
          )}
          {!isPlatform && (
            <JobMenu
              canClose={job.status !== 'CLOSED'}
              onClose={onClose}
              onDelete={onDelete}
              disabled={busy}
            />
          )}
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Status-based tip */}
      {!isPlatform && job.status === 'DRAFT' && (
        <div className="rounded-xl bg-app p-3 text-xs text-body">
          <span className="font-medium text-strong">Draft:</span> Students can't see this yet. Tap{' '}
          <span className="font-medium text-strong">Publish</span> to notify eligible students and
          start accepting applications.
        </div>
      )}
      {!isPlatform && job.status === 'PUBLISHED' && (
        <div className="rounded-xl bg-app p-3 text-xs text-body">
          <span className="font-medium text-strong">Live:</span> Students can apply. Once the
          deadline passes, go to{' '}
          <span className="font-medium text-strong">Manage applicants &amp; rounds</span> to run
          interview rounds.
        </div>
      )}
      {!isPlatform && job.status === 'CLOSED' && (
        <div className="rounded-xl bg-app p-3 text-xs text-body">
          <span className="font-medium text-strong">Closed:</span> No new applications. Existing
          applicants remain in their current stage.
        </div>
      )}

      {/* Hero */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-start gap-4 p-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-2xl font-bold text-primary-700">
            {company.trim().charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-strong">{job.title}</h1>
              {isPlatform && <Badge tint="lavender">Platform</Badge>}
              {(() => {
                const lc = jobLifecycle(job);
                return <Badge tint={jobLifecycleTint(lc)}>{lc}</Badge>;
              })()}
            </div>
            <p className="mt-0.5 text-sm font-medium text-body">{company}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {chips.map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-app px-3 py-1 text-xs font-medium text-body"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Stat strip + primary CTA */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border bg-app/40 px-6 py-4">
          <div className="flex flex-wrap gap-6">
            <Stat label="Applicants" value={String(job.applicationCount ?? 0)} />
            {!isPlatform && (
              <Stat
                label="Eligible"
                value={eligible == null ? '…' : String(eligible.length)}
                onClick={() => {
                  setShowEligible(true);
                  document
                    .getElementById('eligible-students')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              />
            )}
            <Stat
              label="Deadline"
              value={
                deadline
                  ? deadline.toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'
              }
            />
          </div>
          {job.status !== 'DRAFT' && (
            <Link href={`/jobs/${id}/pipeline`}>
              <Button>Manage applicants &amp; rounds →</Button>
            </Link>
          )}
        </div>
      </Card>

      {isPlatform && (
        <p className="rounded-md bg-tint-lavender px-3 py-2 text-xs text-body">
          This is a platform-broadcast job. You manage your own applicants, but the posting is owned
          by the platform team.
        </p>
      )}

      {pdfObjectUrl && <PdfModal url={pdfObjectUrl} name={job.pdfName} onClose={closePdf} />}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* About + JD */}
        <div className="space-y-5 lg:col-span-2">
          <Card className="space-y-3 p-5">
            <h2 className="text-sm font-semibold text-strong">About this job</h2>
            {job.description ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-body">
                {job.description}
              </p>
            ) : (
              <p className="text-sm text-subtle">No typed description — see the attached JD.</p>
            )}
            {job.pdfUrl && (
              <button
                onClick={openPdf}
                disabled={loadingPdf}
                className="inline-flex w-fit items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-body transition hover:border-primary-400"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded bg-danger/10 text-[10px] font-bold text-danger">
                  PDF
                </span>
                {loadingPdf ? 'Opening…' : (job.pdfName ?? 'View job description')}
              </button>
            )}
          </Card>

          {!isPlatform && (
            <Card id="eligible-students" className="scroll-mt-4 space-y-3 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-strong">
                  Eligible students
                  {eligible != null && (
                    <span className="ml-1.5 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700">
                      {eligible.length}
                    </span>
                  )}
                </h2>
                {eligible != null && eligible.length > 0 && (
                  <button
                    onClick={() => setShowEligible((v) => !v)}
                    className="text-xs font-medium text-primary-600 hover:underline"
                  >
                    {showEligible ? 'Hide list' : 'Show list'}
                  </button>
                )}
              </div>
              {eligible == null ? (
                <p className="text-xs text-subtle">Computing who matches this criteria…</p>
              ) : eligible.length === 0 ? (
                <p className="text-xs text-subtle">
                  No verified students currently match this criteria.
                </p>
              ) : showEligible ? (
                <div className="divide-y divide-border">
                  {eligible.map((s) => (
                    <Link
                      key={s.id}
                      href={`/students/${s.id}`}
                      className="flex items-center justify-between py-1.5 text-sm transition hover:text-primary-600"
                    >
                      <span className="text-strong">
                        {s.fullName} <span className="text-subtle">· {s.rollNumber}</span>
                      </span>
                      <span className="text-xs text-subtle">
                        {s.programme} · {s.cgpa != null ? `${s.cgpa}%` : '—'}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-subtle">
                  {eligible.length} verified student{eligible.length === 1 ? '' : 's'} match this
                  job&apos;s criteria. Tap “Show list” to see them.
                </p>
              )}
            </Card>
          )}
        </div>

        {/* Who can apply */}
        <div className="space-y-5">
          <Card className="space-y-3 p-5">
            <h2 className="text-sm font-semibold text-strong">Who can apply</h2>
            <dl className="space-y-2.5">
              <Criteria label="Schools" value={job.eligibleSchools.join(', ') || 'Any'} />
              <Criteria label="Programmes" value={job.eligibleProgrammes.join(', ') || 'Any'} />
              <Criteria label="Batch" value={job.graduationYears.join(', ') || 'Any'} />
              <Criteria
                label="Min UG %"
                value={job.minUgPercentage != null ? `${job.minUgPercentage}%` : 'Any'}
              />
              <Criteria label="Min PG %" value={job.minCgpa != null ? `${job.minCgpa}%` : 'Any'} />
            </dl>
          </Card>

          <Card className="space-y-3 p-5">
            <h2 className="text-sm font-semibold text-strong">Hiring period</h2>
            <dl className="space-y-2.5">
              <Criteria
                label="Posted"
                value={
                  job.publishedAt ? new Date(job.publishedAt).toLocaleDateString() : 'Not published'
                }
              />
              <Criteria
                label="Apply by"
                value={
                  deadline
                    ? deadline.toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : 'No deadline'
                }
              />
            </dl>
          </Card>

          {!job.isPlatform && <EmployerFeedbackCard jobId={id} />}
        </div>
      </div>
    </div>
  );
}

function EmployerFeedbackCard({ jobId }: { jobId: string }) {
  const [feedback, setFeedback] = useState<EmployerFeedback | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getEmployerFeedbackForJob(jobId)
      .then(setFeedback)
      .catch(() => setFeedback(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      setFeedback(await getOrCreateEmployerFeedbackLink(jobId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate link');
    } finally {
      setBusy(false);
    }
  }

  function copyLink() {
    if (!feedback) return;
    const url = `${window.location.origin}/employer-feedback/${feedback.publicToken}`;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (feedback === undefined) return null;

  return (
    <Card className="space-y-3 p-5">
      <h2 className="text-sm font-semibold text-strong">Employer feedback</h2>

      {!feedback ? (
        <>
          <p className="text-xs text-subtle">
            Generate a shareable link for the employer to give feedback on their hiring experience.
          </p>
          <Button size="sm" onClick={generate} loading={busy}>
            Generate feedback link
          </Button>
        </>
      ) : feedback.submitted ? (
        <div className="space-y-2 text-sm">
          <Badge tint="mint">Submitted</Badge>
          <p className="text-body">
            <span className="font-medium text-strong">{feedback.contactPerson}</span>
            {feedback.designation ? ` · ${feedback.designation}` : ''}
          </p>
          {feedback.ratings && (
            <p className="text-xs text-subtle">
              Overall employability: {feedback.ratings.overallEmployability}/5 · Would recruit
              again: {feedback.recruitAgain}
            </p>
          )}
          {feedback.suggestions && <p className="text-xs text-body">“{feedback.suggestions}”</p>}
        </div>
      ) : (
        <>
          <Badge tint="cream">Awaiting response</Badge>
          <p className="text-xs text-subtle">Share this link with the employer contact.</p>
          <Button size="sm" variant="outline" onClick={copyLink}>
            {copied ? 'Copied!' : 'Copy link'}
          </Button>
        </>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
    </Card>
  );
}

function Stat({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick?: () => void;
}) {
  const body = (
    <>
      <p className="text-[11px] font-medium uppercase tracking-wide text-subtle">{label}</p>
      <p className={`text-base font-semibold ${onClick ? 'text-primary-600' : 'text-strong'}`}>
        {value}
        {onClick && <span className="ml-0.5 text-xs">→</span>}
      </p>
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className="text-left hover:opacity-80">
      {body}
    </button>
  ) : (
    <div>{body}</div>
  );
}

function Criteria({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className="text-right text-sm font-medium text-strong">{value}</dd>
    </div>
  );
}

/** ⋮ menu for secondary job actions (close / delete). */
function JobMenu({
  canClose,
  onClose,
  onDelete,
  disabled,
}: {
  canClose: boolean;
  onClose: () => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const item = 'block w-full px-3 py-2 text-left text-sm hover:bg-app';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-label="More actions"
        className="flex h-10 w-10 items-center justify-center rounded-md text-subtle transition hover:bg-app hover:text-strong disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-40 overflow-hidden rounded-md border border-border bg-white py-1 shadow-card">
          {canClose && (
            <button
              onClick={() => {
                setOpen(false);
                onClose();
              }}
              className={`${item} text-body`}
            >
              Close job
            </button>
          )}
          <button
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className={`${item} text-danger`}
          >
            Delete job
          </button>
        </div>
      )}
    </div>
  );
}
