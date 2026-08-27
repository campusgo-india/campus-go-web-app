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
  // student feed annotations
  applied?: boolean;
  myStage?: string | null;
  eligible?: boolean;
  eligibilityReasons?: string[];
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

export interface EligibleStudent {
  id: string;
  rollNumber: string;
  fullName: string;
  email: string;
  programme: string;
  cgpa: number | null;
}

// ─── Placement Officer ───
export async function listJobs(
  status = '',
  search = '',
  createdById = '',
): Promise<Job[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (search) params.set('search', search);
  if (createdById) params.set('createdById', createdById);
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
): Promise<void> {
  return downloadApplicantsFrom(`/jobs/${id}/applicants-export?format=${format}`, format);
}

/** Same export, for a Platform Admin's own broadcast job (rows span every targeted college). */
export async function downloadPlatformJobApplicants(
  id: string,
  format: ApplicantExportFormat,
): Promise<void> {
  return downloadApplicantsFrom(`/platform/jobs/${id}/applicants-export?format=${format}`, format);
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
