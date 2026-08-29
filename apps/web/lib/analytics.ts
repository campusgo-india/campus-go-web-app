'use client';

import { api } from './api';

export interface PlacementMetrics {
  verifiedStudents: number;
  placedStudents: number;
  placementRate: number;
  offersCount: number;
  avgPackage: number | null;
  medianPackage: number | null;
  highestPackage: number | null;
  lowestPackage: number | null;
  placementOverTime: { month: string; count: number }[];
}

export interface JobMetrics {
  jobsPosted: number;
  jobsPublished: number;
  applicationsReceived: number;
  offersReleased: number;
  recruitingCompanies: number;
  activeDrives: number;
  conversionRate: number;
}

export interface StudentMetrics {
  total: number;
  active: number;
  placed: number;
  unplaced: number;
  internships: number;
  completionDistribution: Record<string, number>;
}

export interface FunnelStage {
  status: string;
  count: number;
}

export interface Breakdowns {
  byProgramme: { programme: string; total: number; placed: number; placementRate: number }[];
  byBatch: { graduationYear: number; total: number; placed: number; placementRate: number }[];
  byCompany: { company: string; hires: number; avgPackage: number | null }[];
}

export interface Insights {
  studentsWithMultipleOffers: number;
  multipleOfferStudents: {
    name: string;
    rollNumber: string;
    offers: number;
    bestPackage: number | null;
  }[];
  dreamThreshold: number | null;
  dreamOffers: number;
  repeatRecruiters: { company: string; hires: number }[];
}

export interface PlacementTrack {
  finalYearStudents: number;
  placed: number;
  placementRate: number;
  offers: number;
  highestCtc: number | null;
  averageCtc: number | null;
  medianCtc: number | null;
  internships: number;
  ppos: number;
}

export interface PlacementDashboard {
  overall: PlacementTrack & { companies: number };
  ug: PlacementTrack;
  pg: PlacementTrack;
}

export interface FunnelStages {
  finalYearStudents: number;
  eligible: number;
  applied: number;
  attended: number;
  round1: number;
  round2: number;
  round3: number;
  selected: number;
  offered: number;
  joined: number;
}

export interface PlacementFunnel {
  ug: FunnelStages;
  pg: FunnelStages;
}

export interface ProgrammeWiseRow {
  programme: string;
  students: number;
  eligible: number;
  placed: number;
  placementRate: number;
  medianCtc: number | null;
}

export interface ActiveDrive {
  jobId: string;
  company: string;
  role: string;
  eligible: number;
  applied: number;
  shortlisted: number;
  nearestInterview: string | null;
  status: string;
}

export interface AttentionCounts {
  withoutResume: number;
  incompleteProfile: number;
  eligibleNotApplying: number;
  noParticipation: number;
  withoutInternship: number;
  pendingDocuments: number;
}

export interface AttentionStudent {
  id: string;
  rollNumber: string;
  fullName: string;
  school: string;
  programme: string;
  email: string;
  phone: string | null;
}

export const getPlacementFunnel = () => api<PlacementFunnel>('/analytics/placement-funnel');
export const getProgrammeWisePlacement = () =>
  api<ProgrammeWiseRow[]>('/analytics/programme-wise-placement');
export const getActiveDrives = () => api<ActiveDrive[]>('/analytics/active-drives');
export const getStudentsRequiringAttention = () =>
  api<AttentionCounts>('/analytics/students-requiring-attention');
export const getStudentsInAttentionCategory = (category: string) =>
  api<AttentionStudent[]>(`/analytics/students-requiring-attention/${category}`);

export const getPlacementMetrics = () => api<PlacementMetrics>('/analytics/placement');
export const getPlacementDashboard = () =>
  api<PlacementDashboard>('/analytics/placement-dashboard');
export const getJobMetrics = () => api<JobMetrics>('/analytics/jobs');
export const getStudentMetrics = () => api<StudentMetrics>('/analytics/students');
export const getFunnel = () => api<FunnelStage[]>('/analytics/funnel');
export const getBreakdowns = () => api<Breakdowns>('/analytics/breakdowns');
export const getInsights = () => api<Insights>('/analytics/insights');
