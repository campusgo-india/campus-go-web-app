'use client';

import { api, apiList, API_URL, getAccessToken, tryRefresh } from './api';

/** Upload a Job Description PDF (multipart) → returns its public URL + name. */
export async function uploadJobPdf(file: File): Promise<{ url: string; name: string }> {
  const send = () => {
    const form = new FormData();
    form.append('file', file);
    const token = getAccessToken();
    // No Content-Type header — the browser sets the multipart boundary itself.
    return fetch(`${API_URL}/jobs/upload-pdf`, {
      method: 'POST',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
  };
  let res = await send();
  if (res.status === 401 && (await tryRefresh())) res = await send();
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.message ?? 'Upload failed');
  return body.data as { url: string; name: string };
}

/** Same as uploadJobPdf, for a Platform Admin's broadcast job JD (no collegeId). */
export async function uploadPlatformJobPdf(file: File): Promise<{ url: string; name: string }> {
  const send = () => {
    const form = new FormData();
    form.append('file', file);
    const token = getAccessToken();
    return fetch(`${API_URL}/platform/jobs/upload-pdf`, {
      method: 'POST',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
  };
  let res = await send();
  if (res.status === 401 && (await tryRefresh())) res = await send();
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.message ?? 'Upload failed');
  return body.data as { url: string; name: string };
}

/** Upload an offer letter PDF (multipart) → returns its public URL. */
export async function uploadOfferLetter(file: File): Promise<{ url: string; name: string }> {
  const send = () => {
    const form = new FormData();
    form.append('file', file);
    const token = getAccessToken();
    return fetch(`${API_URL}/jobs/upload-offer-letter`, {
      method: 'POST',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
  };
  let res = await send();
  if (res.status === 401 && (await tryRefresh())) res = await send();
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.message ?? 'Upload failed');
  return body.data as { url: string; name: string };
}

export type ApplicationFieldType = 'text' | 'textarea' | 'select' | 'number';

export interface ApplicationField {
  id: string;
  label: string;
  type: ApplicationFieldType;
  options?: string[];
  required?: boolean;
}

export interface Job {
  id: string;
  title: string;
  description: string | null;
  jobType: string;
  workMode: string | null;
  location: string | null;
  experienceMin: number | null;
  experienceMax: number | null;
  ctcMin: number | null;
  ctcMax: number | null;
  eligibleSchools: string[];
  eligibleProgrammes: string[];
  minCgpa: number | null;
  minTenthPercentage: number | null;
  minTwelfthPercentage: number | null;
  minUgPercentage: number | null;
  eligibleGenders: string[];
  maxActiveBacklogs: number | null;
  maxTotalBacklogs: number | null;
  graduationYears: number[];
  applicationFormFields?: ApplicationField[];
  pdfUrl?: string | null;
  pdfName?: string | null;
  status: string;
  applicationDeadline: string | null;
  publishedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  collegeId: string | null;
  companyId: string | null;
  company?: { id: string; name: string; logoUrl: string | null; industry: string | null };
  createdById?: string;
  createdBy?: { id: string; fullName: string } | null;
  // PLATFORM jobs are broadcast by the Platform Admin; companyName is free-text.
  scope?: string;
  isPlatform?: boolean;
  companyName?: string | null;
  targetCollegeIds?: string[];
  applicationCount?: number;
  // Only populated on the list endpoint — how many of this college's
  // applicants have been placed on this job.
  selectedCount?: number;
  // Officer list endpoint only — verified students matching this job's criteria.
  eligibleCount?: number;
  // Officer views: interview rounds created for this job (this college's, on a
  // shared platform job). Drives the "In progress" lifecycle label.
  roundCount?: number;
  // student feed annotations
  applied?: boolean;
  // Raw ATS stage of the student's own application (APPLIED, ROUND_1, …).
  myStage?: string | null;
  // Rounds-funnel status of the student's own application
  // (APPLIED | IN_PROGRESS | SELECTED | REJECTED | WITHDRAWN) — use this for
  // the student-facing badge so it reads the same as My Applications / Home.
  myStatus?: string | null;
  eligible?: boolean;
  eligibilityReasons?: string[];
  // Only populated on the student job-detail endpoint — total rounds defined for this job.
  totalRounds?: number;
}

export interface CreateJobInput {
  title: string;
  companyId?: string;
  companyName?: string;
  description?: string;
  jobType?: string;
  workMode?: string;
  location?: string;
  experienceMin?: number;
  experienceMax?: number;
  ctcMin?: number;
  ctcMax?: number;
  eligibleSchools: string[];
  eligibleProgrammes: string[];
  graduationYears: number[];
  minCgpa?: number;
  minTenthPercentage?: number;
  minTwelfthPercentage?: number;
  minUgPercentage?: number;
  eligibleGenders?: string[];
  maxActiveBacklogs?: number;
  maxTotalBacklogs?: number;
  applicationFormFields?: ApplicationField[];
  pdfUrl?: string;
  pdfName?: string;
  applicationDeadline?: string;
}

const lpa = (n: number) => (n / 100000).toFixed(2).replace(/\.?0+$/, '');

/** CTC range as "₹X–Y LPA". Treats null/0/negative as undisclosed (avoids "₹0.0–0.0 LPA"). */
export function formatCtc(min: number | null | undefined, max: number | null | undefined): string {
  const lo = min && min > 0 ? min : null;
  const hi = max && max > 0 ? max : null;
  if (lo == null && hi == null) return 'Not disclosed';
  if (lo != null && hi != null) {
    return lo === hi ? `₹${lpa(lo)} LPA` : `₹${lpa(lo)}–${lpa(hi)} LPA`;
  }
  return `₹${lpa((lo ?? hi)!)} LPA`;
}

/** Single CTC value as "₹X LPA". Treats null/0/negative as "—". */
export function formatLpa(value: number | null | undefined): string {
  if (value == null || value <= 0) return '—';
  return `₹${lpa(value)} LPA`;
}

export type JobLifecycle = 'Draft' | 'Published' | 'Closed' | 'In progress' | 'Completed';

/** Every lifecycle value except Draft — the filter options on the Jobs list. */
export const JOB_LIFECYCLES: JobLifecycle[] = [
  'Draft',
  'Published',
  'Closed',
  'In progress',
  'Completed',
];

/**
 * Officer-facing lifecycle label, derived from the raw status + activity:
 *  Draft → Published → Closed → In progress → Completed.
 *  - Published: live, still accepting applications
 *  - Closed: officer closed it, or the application deadline passed
 *  - In progress: at least one interview round has been created
 *  - Completed: a candidate has been selected for an offer
 * (Needs `roundCount`/`selectedCount` — only present on the officer endpoints.)
 */
export function jobLifecycle(job: Job): JobLifecycle {
  if (job.status === 'DRAFT') return 'Draft';
  if ((job.selectedCount ?? 0) > 0) return 'Completed';
  if ((job.roundCount ?? 0) > 0) return 'In progress';
  const deadlinePassed =
    job.applicationDeadline != null && new Date(job.applicationDeadline).getTime() < Date.now();
  if (job.status === 'CLOSED' || deadlinePassed) return 'Closed';
  return 'Published';
}

const JOB_LIFECYCLE_TINT: Record<JobLifecycle, 'cream' | 'mint' | 'lavender' | 'primary' | 'rose'> = {
  Draft: 'cream',
  Published: 'mint',
  Closed: 'lavender',
  'In progress': 'primary',
  Completed: 'rose',
};
export function jobLifecycleTint(l: JobLifecycle) {
  return JOB_LIFECYCLE_TINT[l];
}

export interface EligibleStudent {
  id: string;
  rollNumber: string;
  fullName: string;
  email: string;
  phone: string | null;
  programme: string;
  cgpa: number | null;
  /** Has this student already applied to the job? */
  applied: boolean;
}

// ─── Placement Officer ───
export async function listJobs(
  status = '',
  search = '',
  createdById = '',
  limit = 0,
): Promise<Job[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (search) params.set('search', search);
  if (createdById) params.set('createdById', createdById);
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();
  const { data } = await apiList<Job[]>(`/jobs${qs ? `?${qs}` : ''}`);
  return data;
}

export function getJob(id: string): Promise<Job> {
  return api<Job>(`/jobs/${id}`);
}

export function createJob(input: CreateJobInput): Promise<Job> {
  return api(`/jobs`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateJob(id: string, input: Partial<CreateJobInput>): Promise<Job> {
  return api(`/jobs/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function publishJob(id: string): Promise<{ job: Job; eligibleCount: number }> {
  return api(`/jobs/${id}/publish`, { method: 'POST' });
}

export function publishManyJobs(ids: string[]): Promise<{ count: number; jobs: Job[] }> {
  return api('/jobs/publish-many', { method: 'POST', body: JSON.stringify({ ids }) });
}

export function closeJob(id: string): Promise<Job> {
  return api(`/jobs/${id}/close`, { method: 'POST' });
}

export function deleteJob(id: string): Promise<{ success: boolean }> {
  return api(`/jobs/${id}`, { method: 'DELETE' });
}

export interface BulkAddApplicantsResult {
  addedCount: number;
  added: string[];
  alreadyApplied: string[];
  notFound: string[];
}

// Manually add applicants by roll number — works on a job in any status
// (including CLOSED), for late requests or bulk-importing a company's own
// tracker. Bypasses the normal apply() eligibility/deadline checks.
export function bulkAddApplicants(
  id: string,
  rollNumbers: string[],
): Promise<BulkAddApplicantsResult> {
  return api(`/jobs/${id}/applicants`, { method: 'POST', body: JSON.stringify({ rollNumbers }) });
}

export type ApplicantExportFormat = 'csv' | 'xlsx';

/**
 * Fetches the applicant export as a file (server builds CSV/XLSX + filename)
 * and triggers a browser download. Streams binary, so it can't use the JSON
 * `api` wrapper; still honours the same bearer-token + one-shot refresh-on-401
 * flow via `tryRefresh`.
 */
export async function downloadJobApplicants(
  id: string,
  format: ApplicantExportFormat,
  full = false,
): Promise<void> {
  return downloadApplicantsFrom(
    `/jobs/${id}/applicants-export?format=${format}${full ? '&full=true' : ''}`,
    format,
  );
}

/** Same export, for a Platform Admin's own broadcast job (rows span every targeted college). */
export async function downloadPlatformJobApplicants(
  id: string,
  format: ApplicantExportFormat,
  full = false,
): Promise<void> {
  return downloadApplicantsFrom(
    `/platform/jobs/${id}/applicants-export?format=${format}${full ? '&full=true' : ''}`,
    format,
  );
}

async function downloadApplicantsFrom(path: string, format: ApplicantExportFormat): Promise<void> {
  const send = () => {
    const token = getAccessToken();
    return fetch(`${API_URL}${path}`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  };
  let res = await send();
  if (res.status === 401 && (await tryRefresh())) res = await send();
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Export failed (${res.status})`);
  }

  const blob = await res.blob();
  const match = res.headers.get('Content-Disposition')?.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] ?? `applicants.${format}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** JD PDFs are stored as public Vercel Blob URLs; return the URL unchanged. */
export async function getJobPdfObjectUrl(url: string): Promise<string> {
  return url;
}

export function getEligibleStudents(id: string): Promise<EligibleStudent[]> {
  return api<EligibleStudent[]>(`/jobs/${id}/eligible-students`);
}

// ─── Student ───
export function getJobFeed(): Promise<Job[]> {
  return api<Job[]>(`/jobs`);
}

export function applyToJob(
  id: string,
  formResponses?: Record<string, string>,
): Promise<{ id: string }> {
  return api(`/jobs/${id}/apply`, {
    method: 'POST',
    body: JSON.stringify(formResponses ? { formResponses } : {}),
  });
}
