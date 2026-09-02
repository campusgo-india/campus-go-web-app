'use client';

import { api } from './api';
import type { RoundType } from './rounds';

export interface InterviewRound {
  id: string;
  roundName: string;
  scheduledAt: string | null;
  mode: string | null;
  location: string | null;
  result: string;
  feedback: string | null;
}

export interface StageHistoryEntry {
  id: string;
  fromStage: string | null;
  toStage: string;
  note: string | null;
  createdAt: string;
}

// One round on the student's tracking timeline.
export interface ApplicationRoundStep {
  seq: number;
  title: string;
  roundType: RoundType | null;
  description: string | null;
  venue: string | null;
  reportingInstructions: string | null;
  scheduledAt: string | null;
  roundStatus: 'OPEN' | 'DECIDED';
  outcome: 'PENDING' | 'ADVANCED' | 'REJECTED';
}

export interface Application {
  id: string;
  stage: string;
  // Rounds-funnel status: APPLIED | IN_PROGRESS | SELECTED | REJECTED | WITHDRAWN.
  status: string;
  appliedAt: string;
  rejectionReason: string | null;
  offerCtc: number | null;
  offerLetterUrl: string | null;
  // True while a student-uploaded offer letter is still awaiting officer
  // verification — the application is NOT counted as an offer/placement yet.
  offerAwaitingVerification: boolean;
  rounds: ApplicationRoundStep[];
  notes: string | null;
  job: {
    id: string;
    title: string;
    jobType: string;
    location: string | null;
    company: { id: string; name: string; logoUrl: string | null };
  };
  interviews: InterviewRound[];
  stageHistory: StageHistoryEntry[];
  // Answers to the job's custom application questions (label/value pairs).
  formAnswers?: { label: string; value: string }[];
  student?: { id: string; rollNumber: string; fullName: string; programme: string };
}

// Small, literal red/amber/green reading of an application's status — used
// wherever a student sees a compact status badge (Home, My Applications,
// Job detail). Rejected/Withdrawn read as "done, didn't work out" (danger);
// Applied/In Progress as "still moving" (warning); Selected as the win
// (success) — 3 colors, not one per granular ATS stage.
export function applicationStatusBadge(status: string): {
  label: string;
  tint: 'success' | 'warning' | 'danger';
} {
  if (status === 'SELECTED') return { label: 'Offer accepted', tint: 'success' };
  if (status === 'REJECTED') return { label: 'Rejected', tint: 'danger' };
  if (status === 'WITHDRAWN') return { label: 'Withdrawn', tint: 'danger' };
  if (status === 'IN_PROGRESS') return { label: 'In progress', tint: 'warning' };
  return { label: 'Applied', tint: 'warning' };
}

export interface PipelineEntry {
  id: string;
  stage: string;
  appliedAt: string;
  offerCtc: number | null;
  student: {
    id: string;
    rollNumber: string;
    fullName: string;
    programme: string;
    cgpa: number | null;
  };
}

export const ATS_STAGES = [
  'APPLIED',
  'VERIFIED',
  'SHORTLISTED',
  'ROUND_1',
  'ROUND_2',
  'ROUND_3',
  'HR',
  'OFFER_RELEASED',
  'OFFER_ACCEPTED',
  'JOINED',
] as const;

// ─── Student ───
export function listMyApplications(): Promise<Application[]> {
  return api<Application[]>(`/me/applications`);
}

export function withdrawApplication(id: string): Promise<{ id: string }> {
  return api(`/me/applications/${id}/withdraw`, { method: 'POST' });
}

// Attach the student's own offer letter (and CTC) — most offer letters land
// in the student's inbox first, not the officer's. On an application the
// officer hasn't placed yet, this creates a self-reported offer that stays
// "awaiting verification" until an officer approves it. The letter is a
// one-time upload (no replace); the CTC can still be corrected.
export function setOwnOfferLetter(
  id: string,
  offerLetterUrl?: string,
  offerCtc?: number,
): Promise<Application> {
  return api(`/me/applications/${id}/offer-letter`, {
    method: 'PATCH',
    body: JSON.stringify({ offerLetterUrl, offerCtc }),
  });
}

// ─── Placement Officer ───

export interface SelfReportedOffer {
  id: string;
  submittedAt: string;
  offerLetterUrl: string | null;
  offerCtc: number | null;
  job: { id: string; title: string; company: string };
  student: { id: string; rollNumber: string; fullName: string; programme: string };
}

/** Student-uploaded offer letters awaiting the officer's verification. */
export function listOffersAwaitingVerification(): Promise<SelfReportedOffer[]> {
  return api<SelfReportedOffer[]>(`/jobs/offers/awaiting-verification`);
}

/** Approve (→ marks the student SELECTED) or reject (→ clears the letter) a
 *  self-reported offer. */
export function verifySelfReportedOffer(id: string, approve: boolean): Promise<Application> {
  return api(`/jobs/applications/${id}/verify-offer`, {
    method: 'POST',
    body: JSON.stringify({ approve }),
  });
}
export function getPipeline(jobId: string): Promise<PipelineEntry[]> {
  return api<PipelineEntry[]>(`/jobs/${jobId}/applications`);
}

export function getApplication(id: string): Promise<Application> {
  return api<Application>(`/applications/${id}`);
}

export function changeStage(
  id: string,
  input: { stage: string; note?: string; rejectionReason?: string; offerCtc?: number },
): Promise<Application> {
  return api(`/applications/${id}/stage`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function addInterview(
  id: string,
  input: {
    roundName: string;
    scheduledAt?: string;
    mode?: string;
    location?: string;
    result?: string;
    feedback?: string;
  },
): Promise<InterviewRound> {
  return api(`/applications/${id}/interviews`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateInterview(
  id: string,
  roundId: string,
  input: {
    result?: string;
    feedback?: string;
    scheduledAt?: string;
    mode?: string;
    location?: string;
  },
): Promise<InterviewRound> {
  return api(`/applications/${id}/interviews/${roundId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
