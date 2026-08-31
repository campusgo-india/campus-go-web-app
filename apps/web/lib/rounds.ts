'use client';

import { api } from './api';

export type RoundOutcome = 'PENDING' | 'ADVANCED' | 'REJECTED';
export type RoundStatus = 'OPEN' | 'DECIDED';

export const ROUND_TYPES = [
  'APTITUDE',
  'TECHNICAL',
  'CODING',
  'HR',
  'GROUP_DISCUSSION',
  'MANAGERIAL',
  'OTHER',
] as const;
export type RoundType = (typeof ROUND_TYPES)[number];

export const roundTypeLabel = (t: RoundType | null | undefined) => {
  if (!t) return null;
  return t
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
};

export interface FunnelStudent {
  applicationId: string;
  studentId: string;
  rollNumber: string;
  fullName: string;
  programme: string;
  email: string;
  resumeSlug: string | null;
  appliedAt: string;
  status: string;
  offerCtc: number | null;
  offerLetterUrl: string | null;
  // Only present on the platform funnel — applicants span multiple colleges there.
  collegeName?: string;
}

export interface FunnelParticipant extends FunnelStudent {
  outcome: RoundOutcome;
  /** Null = not marked yet, true = present, false = no-show. */
  attended: boolean | null;
}

export interface FunnelRound {
  id: string;
  seq: number;
  title: string;
  roundType: RoundType | null;
  description: string | null;
  venue: string | null;
  reportingInstructions: string | null;
  scheduledAt: string | null;
  status: RoundStatus;
  overdue: boolean;
  participants: FunnelParticipant[];
}

export type RecruitmentProgress =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'CLOSED_FOR_APPLICATIONS'
  | 'IN_PROGRESS'
  | 'COMPLETED';

export const RECRUITMENT_PROGRESS_LABEL: Record<RecruitmentProgress, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  CLOSED_FOR_APPLICATIONS: 'Closed for applications',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
};

export interface Funnel {
  applicantsTotal: number;
  inProgress: number;
  selectedCount: number;
  rejectedCount: number;
  recruitmentProgress: RecruitmentProgress;
  rounds: FunnelRound[];
  pool: FunnelStudent[];
  finalists: FunnelStudent[];
  placed: FunnelStudent[];
}

export interface PendingResult {
  jobId: string;
  jobTitle: string;
  roundId: string;
  roundTitle: string;
  scheduledAt: string | null;
}

export const getFunnel = (jobId: string) => api<Funnel>(`/jobs/${jobId}/funnel`);

export interface RoundInput {
  title?: string;
  roundType?: RoundType;
  description?: string;
  venue?: string;
  reportingInstructions?: string;
  scheduledAt?: string;
}

export const createRound = (jobId: string, input: RoundInput) =>
  api(`/jobs/${jobId}/rounds`, { method: 'POST', body: JSON.stringify(input) });

export const updateRound = (jobId: string, roundId: string, input: RoundInput) =>
  api(`/jobs/${jobId}/rounds/${roundId}`, { method: 'PATCH', body: JSON.stringify(input) });

export const deleteRound = (jobId: string, roundId: string) =>
  api(`/jobs/${jobId}/rounds/${roundId}`, { method: 'DELETE' });

export const decideRound = (jobId: string, roundId: string, advanceIds: string[]) =>
  api(`/jobs/${jobId}/rounds/${roundId}/decide`, {
    method: 'POST',
    body: JSON.stringify({ advanceIds }),
  });

export const markRoundAttendance = (
  jobId: string,
  roundId: string,
  records: { applicationId: string; attended: boolean }[],
) =>
  api(`/jobs/${jobId}/rounds/${roundId}/attendance`, {
    method: 'POST',
    body: JSON.stringify({ records }),
  });

export const placeApplicant = (
  jobId: string,
  appId: string,
  input: { offerCtc?: number; offerLetterUrl?: string },
) =>
  api(`/jobs/${jobId}/applications/${appId}/place`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const rejectApplicant = (jobId: string, appId: string, reason?: string) =>
  api(`/jobs/${jobId}/applications/${appId}/reject`, {
    method: 'POST',
    body: JSON.stringify(reason ? { reason } : {}),
  });

export const listPendingResults = () => api<PendingResult[]>('/jobs/rounds/pending');

// ─── Platform Admin's own round track for a broadcast job ───
// Runs alongside each targeted college's own independent track on the same
// job — same shapes as above, just scoped under /platform/jobs instead of
// /jobs, and applicants carry a collegeName since they span multiple colleges.

export const getPlatformFunnel = (jobId: string) => api<Funnel>(`/platform/jobs/${jobId}/funnel`);

export const createPlatformRound = (jobId: string, input: RoundInput) =>
  api(`/platform/jobs/${jobId}/rounds`, { method: 'POST', body: JSON.stringify(input) });

export const updatePlatformRound = (jobId: string, roundId: string, input: RoundInput) =>
  api(`/platform/jobs/${jobId}/rounds/${roundId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

export const deletePlatformRound = (jobId: string, roundId: string) =>
  api(`/platform/jobs/${jobId}/rounds/${roundId}`, { method: 'DELETE' });

export const decidePlatformRound = (jobId: string, roundId: string, advanceIds: string[]) =>
  api(`/platform/jobs/${jobId}/rounds/${roundId}/decide`, {
    method: 'POST',
    body: JSON.stringify({ advanceIds }),
  });

export const markPlatformRoundAttendance = (
  jobId: string,
  roundId: string,
  records: { applicationId: string; attended: boolean }[],
) =>
  api(`/platform/jobs/${jobId}/rounds/${roundId}/attendance`, {
    method: 'POST',
    body: JSON.stringify({ records }),
  });

export const placePlatformApplicant = (
  jobId: string,
  appId: string,
  input: { offerCtc?: number; offerLetterUrl?: string },
) =>
  api(`/platform/jobs/${jobId}/applications/${appId}/place`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const rejectPlatformApplicant = (jobId: string, appId: string, reason?: string) =>
  api(`/platform/jobs/${jobId}/applications/${appId}/reject`, {
    method: 'POST',
    body: JSON.stringify(reason ? { reason } : {}),
  });
