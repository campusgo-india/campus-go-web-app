'use client';

import { api } from './api';

// ─── Employer feedback (per Job) ───

export type RecruiterVerdict = 'YES' | 'MAYBE' | 'NO';

export interface EmployerFeedbackRatings {
  knowledgeSkills: number | null;
  communicationSkills: number | null;
  problemSolving: number | null;
  teamworkAdaptability: number | null;
  professionalism: number | null;
  overallEmployability: number | null;
  curriculumRelevance: number | null;
  trainingEffectiveness: number | null;
}

export interface EmployerFeedback {
  id: string;
  publicToken: string;
  submitted: boolean;
  submittedAt: string | null;
  contactPerson: string | null;
  designation: string | null;
  ratings: EmployerFeedbackRatings | null;
  improvementAreas: string | null;
  suggestions: string | null;
  recruitAgain: RecruiterVerdict | null;
}

export interface EmployerFeedbackListRow extends EmployerFeedback {
  jobId: string;
  jobTitle: string;
  companyName: string;
}

export interface EmployerFeedbackPublicContext {
  submitted: boolean;
  jobTitle: string;
  companyName: string;
  industry: string | null;
  programmes: string[];
  academicYears: number[];
  collegeName: string | null;
}

export interface SubmitEmployerFeedbackInput {
  contactPerson: string;
  designation?: string;
  knowledgeSkills: number;
  communicationSkills: number;
  problemSolving: number;
  teamworkAdaptability: number;
  professionalism: number;
  overallEmployability: number;
  curriculumRelevance: number;
  trainingEffectiveness: number;
  improvementAreas?: string;
  suggestions?: string;
  recruitAgain: RecruiterVerdict;
}

// Officer / College Admin
export const getOrCreateEmployerFeedbackLink = (jobId: string) =>
  api<EmployerFeedback>(`/jobs/${jobId}/feedback-link`, { method: 'POST' });

export const getEmployerFeedbackForJob = (jobId: string) =>
  api<EmployerFeedback | null>(`/jobs/${jobId}/feedback`);

export const listEmployerFeedback = () =>
  api<EmployerFeedbackListRow[]>('/feedback/employers');

// Platform Admin
export const getOrCreatePlatformEmployerFeedbackLink = (jobId: string) =>
  api<EmployerFeedback>(`/platform/jobs/${jobId}/feedback-link`, { method: 'POST' });

export const getPlatformEmployerFeedbackForJob = (jobId: string) =>
  api<EmployerFeedback | null>(`/platform/jobs/${jobId}/feedback`);

// Public (no auth) — the employer's own submission page
export const getPublicEmployerFeedbackContext = (token: string) =>
  api<EmployerFeedbackPublicContext>(`/public/employer-feedback/${token}`, { auth: false });

export const submitPublicEmployerFeedback = (token: string, input: SubmitEmployerFeedbackInput) =>
  api<{ success: boolean }>(`/public/employer-feedback/${token}`, {
    method: 'POST',
    auth: false,
    body: JSON.stringify(input),
  });

// ─── Student feedback (end of placement season) ───

export type PlacementStatus =
  | 'PLACED'
  | 'HIGHER_STUDIES'
  | 'ENTREPRENEURSHIP'
  | 'SEEKING_EMPLOYMENT'
  | 'OTHER';

export const PLACEMENT_STATUS_LABEL: Record<PlacementStatus, string> = {
  PLACED: 'Placed',
  HIGHER_STUDIES: 'Higher Studies',
  ENTREPRENEURSHIP: 'Entrepreneurship',
  SEEKING_EMPLOYMENT: 'Seeking Employment',
  OTHER: 'Other',
};

export interface StudentFeedbackRecord {
  id: string;
  academicYear: string;
  placementStatus: PlacementStatus;
  placementOpportunities: number;
  careerGuidance: number;
  placementTraining: number;
  communicationOfOpportunities: number;
  placementCellSupport: number;
  industryInteraction: number;
  overallSupport: number;
  suggestions: string | null;
  createdAt: string;
}

export interface MyStudentFeedback {
  submitted: boolean;
  // Whether the placement officer has opened the end-of-season survey yet.
  open: boolean;
  programme: string;
  batch: number;
  feedback: StudentFeedbackRecord | null;
}

export interface FeedbackWindow {
  open: boolean;
  openedAt: string | null;
}

export interface SubmitStudentFeedbackInput {
  academicYear: string;
  placementStatus: PlacementStatus;
  placementOpportunities: number;
  careerGuidance: number;
  placementTraining: number;
  communicationOfOpportunities: number;
  placementCellSupport: number;
  industryInteraction: number;
  overallSupport: number;
  suggestions?: string;
}

export const getMyFeedback = () => api<MyStudentFeedback>('/me/feedback');

export const submitMyFeedback = (input: SubmitStudentFeedbackInput) =>
  api<{ success: boolean }>('/me/feedback', { method: 'POST', body: JSON.stringify(input) });

export interface StudentFeedbackSummaryRow extends StudentFeedbackRecord {
  rollNumber: string;
  fullName: string;
  programme: string;
}

export interface StudentFeedbackSummary {
  responseCount: number;
  averages: Record<
    | 'placementOpportunities'
    | 'careerGuidance'
    | 'placementTraining'
    | 'communicationOfOpportunities'
    | 'placementCellSupport'
    | 'industryInteraction'
    | 'overallSupport',
    number | null
  >;
  responses: StudentFeedbackSummaryRow[];
}

export const getStudentFeedbackSummary = () => api<StudentFeedbackSummary>('/feedback/students');

export const getFeedbackWindow = () => api<FeedbackWindow>('/feedback/students/window');

export const setFeedbackWindow = (open: boolean) =>
  api<FeedbackWindow>('/feedback/students/window', { method: 'PATCH', body: JSON.stringify({ open }) });
