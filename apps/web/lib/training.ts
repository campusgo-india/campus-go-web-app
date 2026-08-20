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

export type AssessmentPhase = 'PRE' | 'POST';
export type SessionStatus = 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export interface Assessment {
  id: string;
  name: string;
  pillar: TrainingPillar;
  phase: AssessmentPhase;
  externalUrl: string;
  maxMarks: number;
  isActive: boolean;
  createdAt: string;
  myScore?: number | null; // present only on the student feed
}

export interface AssessmentInput {
  name: string;
  pillar: TrainingPillar;
  phase: AssessmentPhase;
  externalUrl: string;
  maxMarks: number;
  isActive?: boolean;
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
  createdAt: string;
  myAttendance?: boolean | null; // present only on the student feed
}

export interface SessionInput {
  title: string;
  pillar?: TrainingPillar;
  trainerName?: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  status?: SessionStatus;
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
    responseCount: number;
    avgContentQuality: number | null;
    avgTrainerDelivery: number | null;
    avgRelevance: number | null;
    avgOverall: number | null;
  }>;
  trainers: Array<{ trainerName: string; avgRating: number | null }>;
}

/** Reads a File into a base64 string (strips the data: URL prefix). */
async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i] ?? 0);
  return btoa(binary);
}

// ─── Officer / College Admin: assessments ───
export const listAssessments = () => api<Assessment[]>('/training/assessments');

export const createAssessment = (input: AssessmentInput) =>
  api<Assessment>('/training/assessments', { method: 'POST', body: JSON.stringify(input) });

export const updateAssessment = (id: string, input: Partial<AssessmentInput>) =>
  api<Assessment>(`/training/assessments/${id}`, { method: 'PATCH', body: JSON.stringify(input) });

export const deleteAssessment = (id: string) =>
  api<{ success: boolean }>(`/training/assessments/${id}`, { method: 'DELETE' });

export const listScores = (assessmentId: string) =>
  api<ScoreRow[]>(`/training/assessments/${assessmentId}/scores`);

export const enterScore = (assessmentId: string, studentId: string, marksObtained: number) =>
  api<{ studentId: string; marksObtained: number }>(`/training/assessments/${assessmentId}/scores`, {
    method: 'POST',
    body: JSON.stringify({ studentId, marksObtained }),
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

// ─── Officer / College Admin: feedback analytics ───
export const getFeedbackAnalytics = () => api<FeedbackAnalytics>('/training/feedback/analytics');

// ─── Student (self) ───
export const getMyAssessments = () => api<Assessment[]>('/me/training/assessments');

export const listMySessions = () => api<TrainingSession[]>('/me/training/sessions');

export const getMyDashboard = () => api<EmployabilityDashboard>('/me/training/dashboard');

export const getPendingFeedback = () => api<PendingFeedback | null>('/me/training/feedback/pending');

export const submitFeedback = (input: FeedbackInput) =>
  api<{ id: string }>('/me/training/feedback', { method: 'POST', body: JSON.stringify(input) });
