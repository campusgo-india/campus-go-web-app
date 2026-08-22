'use client';

import { api } from './api';

export type DegreeLevel = 'UG' | 'PG';

export interface CollegeSchool {
  id: string;
  collegeId: string;
  name: string;
  programmes: string[];
  degreeLevel: DegreeLevel;
}

export interface SchoolInput {
  name?: string;
  programmes?: string[];
  degreeLevel?: DegreeLevel;
}

// ─── Tenant (College Admin / Officer): own college catalog for forms ───
export const listMySchools = () => api<CollegeSchool[]>('/schools');

// ─── Tenant (College Admin only): self-serve catalog management ───
export const createMySchool = (input: SchoolInput) =>
  api<CollegeSchool>('/schools', { method: 'POST', body: JSON.stringify(input) });

export const updateMySchool = (id: string, input: SchoolInput) =>
  api<CollegeSchool>(`/schools/${id}`, { method: 'PATCH', body: JSON.stringify(input) });

export const deleteMySchool = (id: string) =>
  api<{ success: boolean }>(`/schools/${id}`, { method: 'DELETE' });

// ─── Platform Admin: manage a college's catalog ───
export const listCollegeSchools = (collegeId: string) =>
  api<CollegeSchool[]>(`/colleges/${collegeId}/schools`);

export const createCollegeSchool = (collegeId: string, input: SchoolInput) =>
  api<CollegeSchool>(`/colleges/${collegeId}/schools`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const updateCollegeSchool = (collegeId: string, id: string, input: SchoolInput) =>
  api<CollegeSchool>(`/colleges/${collegeId}/schools/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

export const deleteCollegeSchool = (collegeId: string, id: string) =>
  api<{ success: boolean }>(`/colleges/${collegeId}/schools/${id}`, { method: 'DELETE' });
