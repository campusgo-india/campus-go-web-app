'use client';

import { api } from './api';

export const TRAINING_PILLARS = [
  'APTITUDE_REASONING',
  'TECHNICAL_TOOLS',
  'SOFT_SKILLS_COMMUNICATION',
  'CAREER_READINESS',
] as const;
export type TrainingPillar = (typeof TRAINING_PILLARS)[number];

export const PILLAR_LABEL: Record<TrainingPillar, string> = {
  APTITUDE_REASONING: 'Aptitude & Reasoning',
  TECHNICAL_TOOLS: 'Technical & Tools',
  SOFT_SKILLS_COMMUNICATION: 'Soft Skills & Communication',
  CAREER_READINESS: 'Career Readiness',
};

// What each pillar is meant to cover — shown to officers (so a new college
// knows what to map assessments to) and to students (so a readiness % means
// something concrete, not just a bare number).
export const PILLAR_COMPONENTS: Record<TrainingPillar, string[]> = {
  APTITUDE_REASONING: ['Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability'],
  TECHNICAL_TOOLS: ['Excel', 'Power BI', 'Programming / Domain Skills'],
  SOFT_SKILLS_COMMUNICATION: ['Verbal Communication', 'Group Discussion'],
  CAREER_READINESS: ['Resume', 'LinkedIn Profile', 'Mock Interview Performance'],
};

// Score-band encouragement copy per pillar, shown on the student's readiness
// breakdown. Bands are checked highest-first; the first one the score meets
// or exceeds wins.
const READINESS_BANDS = [
  { min: 80, key: 'strong' },
  { min: 70, key: 'good' },
  { min: 60, key: 'solid' },
  { min: 50, key: 'needsWork' },
  { min: 0, key: 'start' },
] as const;

const PILLAR_READINESS_MESSAGES: Record<TrainingPillar, Record<(typeof READINESS_BANDS)[number]['key'], string>> = {
  APTITUDE_REASONING: {
    strong: 'Strong work — your quant, logical and verbal reasoning are placement-ready. Keep practising to stay sharp.',
    good: 'Good performance. A little more practice on speed and accuracy will get you to the top tier.',
    solid: 'Solid foundation. Regular practice in quant, logical and verbal reasoning will move the needle.',
    needsWork: 'Your fundamentals need work. Build them up with steady quant, logical and verbal practice.',
    start: 'Start from the basics — follow the recommended aptitude modules to build your foundation.',
  },
  TECHNICAL_TOOLS: {
    strong: 'Strong technical and tool skills. Keep them current with the languages, tools or software relevant to your field.',
    good: 'Good progress — keep building on the coding, software or domain tools relevant to your target roles.',
    solid: "You've got a starting point. More hands-on practice with the tools relevant to your field will strengthen your readiness.",
    needsWork: 'You need more hands-on practice. Focus on the coding skills or domain tools relevant to your target jobs.',
    start: 'Build your technical foundation through guided training and hands-on practice in tools relevant to your field.',
  },
  SOFT_SKILLS_COMMUNICATION: {
    strong: 'Strong communication and interpersonal skills. Keep sharpening them through real discussions.',
    good: 'Good performance — keep practising communication and group discussions to build more confidence.',
    solid: "You're making progress. More speaking and discussion practice will boost your confidence.",
    needsWork: 'Focus on building communication confidence through regular speaking and presentation practice.',
    start: 'Communication is a key placement skill — start with regular speaking practice and build up from there.',
  },
  CAREER_READINESS: {
    strong: 'Strong prep — keep your resume and LinkedIn updated and stay sharp with interview practice.',
    good: 'Good progress. Strengthen your resume, LinkedIn and interview skills to be fully placement-ready.',
    solid: 'Solid foundation. Keep improving your resume, LinkedIn and interview performance.',
    needsWork: 'More prep needed — work on your resume, LinkedIn profile and mock interviews.',
    start: "Let's build this up — start with your resume, LinkedIn profile and mock interview practice.",
  },
};

/** Personalized encouragement copy for one pillar's score — null until the pillar has any data. */
export function pillarReadinessMessage(pillar: TrainingPillar, percentage: number | null): string | null {
  if (percentage == null) return null;
  const band = READINESS_BANDS.find((b) => percentage >= b.min)!;
  return PILLAR_READINESS_MESSAGES[pillar][band.key];
}

export type AssessmentPhase = 'PRE' | 'POST';
export type SessionStatus = 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export interface Assessment {
  id: string;
  name: string;
  pillar: TrainingPillar;
  phase: AssessmentPhase;
  externalUrl: string;
  // Venue, prerequisites, or any other details a student should know.
  description: string | null;
  maxMarks: number;
  scheduledAt: string | null;
  isActive: boolean;
  // Empty on both = every active student at the college.
  targetProgrammes: string[];
  targetBatchIds: string[];
  createdAt: string;
  myScore?: number | null; // present only on the student feed
}

export interface AssessmentInput {
  name: string;
  pillar: TrainingPillar;
  phase: AssessmentPhase;
  externalUrl: string;
  description?: string;
  maxMarks: number;
  scheduledAt?: string;
  isActive?: boolean;
  targetProgrammes?: string[];
  targetBatchIds?: string[];
}

export interface ScoreRow {
  studentId: string;
  rollNumber: string;
  fullName: string;
  marksObtained: number | null;
}

export interface ImportResult {
  updatedCount: number;
  errorCount: number;
  errors: Array<{ row: number; message: string }>;
}

export interface TrainingSession {
  id: string;
  title: string;
  pillar: TrainingPillar | null;
  trainerName: string | null;
  description: string | null;
  startsAt: string;
  endsAt: string;
  status: SessionStatus;
  targetProgrammes: string[];
  targetBatchIds: string[];
  createdAt: string;
  myAttendance?: boolean | null; // present only on the student feed
  attendanceMarkedCount?: number; // present only on the officer list
}

export interface SessionInput {
  title: string;
  pillar?: TrainingPillar;
  trainerName?: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  status?: SessionStatus;
  targetProgrammes?: string[];
  targetBatchIds?: string[];
}

export interface TrainingBatch {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  createdAt: string;
}

export interface BatchMemberRow {
  studentId: string;
  rollNumber: string;
  fullName: string;
  school: string;
  programme: string;
  isMember: boolean;
}

export interface AttendanceRow {
  studentId: string;
  rollNumber: string;
  fullName: string;
  present: boolean | null;
}

export interface PillarBreakdown {
  pillar: TrainingPillar;
  label: string;
  percentage: number | null;
}

export type EmployabilityTier = 'TIER_1' | 'TIER_2' | 'TIER_3';

export interface ScoredPillar {
  pillar: TrainingPillar;
  label: string;
  percentage: number;
}

export interface EmployabilityDashboard {
  readinessIndex: number;
  // Private, informational tier badge (≥80% Tier 1, 65–79% Tier 2, <65% Tier 3).
  // Never gates job eligibility — that's decided independently per job.
  tier: EmployabilityTier;
  // Percentage points needed to reach the next tier up; null once at Tier 1.
  gapToNextTier: number | null;
  weakestPillar: ScoredPillar | null;
  deptRank: { rank: number; total: number };
  pillars: PillarBreakdown[];
  attendancePct: number;
  completedCount: number;
  ongoingCount: number;
  nextSession: { title: string; startsAt: string } | null;
}

export interface PendingFeedback {
  sessionId: string;
  title: string;
  trainerName: string | null;
  endsAt: string;
}

export interface FeedbackInput {
  sessionId: string;
  contentQuality: number;
  trainerDelivery: number;
  relevanceToPlacement: number;
}

export interface FeedbackAnalytics {
  sessions: Array<{
    sessionId: string;
    title: string;
    trainerName: string | null;
    startsAt: string;
    responseCount: number;
    avgContentQuality: number | null;
    avgTrainerDelivery: number | null;
    avgRelevance: number | null;
    avgOverall: number | null;
  }>;
  trainers: Array<{ trainerName: string; avgRating: number | null }>;
}

export interface OfficerTrainingDashboard {
  studentCount: number;
  readiness: {
    average: number;
    assessedCount: number;
    notYetAssessedCount: number;
    // Students at >= 70% readiness — a slightly wider bar than Tier 1 (>= 80%).
    placementReadyCount: number;
    tierCounts: Record<EmployabilityTier, number>;
  };
  pillars: Array<{ pillar: TrainingPillar; label: string; prePct: number | null; postPct: number | null }>;
  overallAttendancePct: number;
  sessions: Array<{
    id: string;
    title: string;
    startsAt: string;
    status: SessionStatus;
    attendancePct: number | null;
    markedCount: number;
    audience: string;
  }>;
  assessments: Array<{
    id: string;
    name: string;
    pillar: TrainingPillar;
    phase: AssessmentPhase;
    scheduledAt: string | null;
    averagePct: number | null;
    scoredCount: number;
    audience: string;
  }>;
}

/** Reads a File into a base64 string (strips the data: URL prefix). */
async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i] ?? 0);
  return btoa(binary);
}

// ─── Officer / College Admin (+ Coordinator, programme-scoped): dashboard ───
export const getOfficerTrainingDashboard = () =>
  api<OfficerTrainingDashboard>('/training/dashboard');

// ─── Officer / College Admin: assessments ───
export const listAssessments = () => api<Assessment[]>('/training/assessments');

export const getAssessment = (id: string) => api<Assessment>(`/training/assessments/${id}`);

export const createAssessment = (input: AssessmentInput) =>
  api<Assessment>('/training/assessments', { method: 'POST', body: JSON.stringify(input) });

export const updateAssessment = (id: string, input: Partial<AssessmentInput>) =>
  api<Assessment>(`/training/assessments/${id}`, { method: 'PATCH', body: JSON.stringify(input) });

export const deleteAssessment = (id: string) =>
  api<{ success: boolean }>(`/training/assessments/${id}`, { method: 'DELETE' });

export const listScores = (assessmentId: string) =>
  api<ScoreRow[]>(`/training/assessments/${assessmentId}/scores`);

export const bulkEnterScores = (
  assessmentId: string,
  rows: Array<{ studentId: string; marksObtained: number }>,
) =>
  api<{ success: boolean; updated: number }>(`/training/assessments/${assessmentId}/scores`, {
    method: 'POST',
    body: JSON.stringify({ rows }),
  });

export async function importScores(assessmentId: string, file: File): Promise<ImportResult> {
  const fileBase64 = await fileToBase64(file);
  return api<ImportResult>(`/training/assessments/${assessmentId}/scores/import`, {
    method: 'POST',
    body: JSON.stringify({ fileBase64, fileName: file.name }),
  });
}

// ─── Officer / College Admin: sessions ───
export const listSessions = () => api<TrainingSession[]>('/training/sessions');

export const getSession = (id: string) => api<TrainingSession>(`/training/sessions/${id}`);

export const createSession = (input: SessionInput) =>
  api<TrainingSession>('/training/sessions', { method: 'POST', body: JSON.stringify(input) });

export const updateSession = (id: string, input: Partial<SessionInput>) =>
  api<TrainingSession>(`/training/sessions/${id}`, { method: 'PATCH', body: JSON.stringify(input) });

export const deleteSession = (id: string) =>
  api<{ success: boolean }>(`/training/sessions/${id}`, { method: 'DELETE' });

export const listAttendance = (sessionId: string) =>
  api<AttendanceRow[]>(`/training/sessions/${sessionId}/attendance`);

export const markAttendance = (sessionId: string, rows: Array<{ studentId: string; present: boolean }>) =>
  api<{ success: boolean; marked: number }>(`/training/sessions/${sessionId}/attendance`, {
    method: 'POST',
    body: JSON.stringify({ rows }),
  });

export async function importAttendance(sessionId: string, file: File): Promise<ImportResult> {
  const fileBase64 = await fileToBase64(file);
  return api<ImportResult>(`/training/sessions/${sessionId}/attendance/import`, {
    method: 'POST',
    body: JSON.stringify({ fileBase64, fileName: file.name }),
  });
}

// ─── Officer / College Admin: batches ───
export const listBatches = () => api<TrainingBatch[]>('/training/batches');

export const createBatch = (input: { name: string; description?: string }) =>
  api<TrainingBatch>('/training/batches', { method: 'POST', body: JSON.stringify(input) });

export const updateBatch = (id: string, input: { name?: string; description?: string }) =>
  api<TrainingBatch>(`/training/batches/${id}`, { method: 'PATCH', body: JSON.stringify(input) });

export const deleteBatch = (id: string) =>
  api<{ success: boolean }>(`/training/batches/${id}`, { method: 'DELETE' });

export const listBatchMembers = (id: string) =>
  api<BatchMemberRow[]>(`/training/batches/${id}/members`);

export const setBatchMembers = (id: string, studentIds: string[]) =>
  api<{ success: boolean; memberCount: number }>(`/training/batches/${id}/members`, {
    method: 'POST',
    body: JSON.stringify({ studentIds }),
  });

// ─── Officer / College Admin: feedback analytics ───
export const getFeedbackAnalytics = () => api<FeedbackAnalytics>('/training/feedback/analytics');

// ─── Student (self) ───
export const getMyAssessments = () => api<Assessment[]>('/me/training/assessments');

export const listMySessions = () => api<TrainingSession[]>('/me/training/sessions');

export const getMyDashboard = () => api<EmployabilityDashboard>('/me/training/dashboard');

export const getPendingFeedback = () => api<PendingFeedback | null>('/me/training/feedback/pending');

export const submitFeedback = (input: FeedbackInput) =>
  api<{ id: string }>('/me/training/feedback', { method: 'POST', body: JSON.stringify(input) });
