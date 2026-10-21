'use client';

import { api } from './api';

export interface MyResume {
  publicSlug: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  // Optional second résumé; empty strings when not uploaded.
  secondFileUrl: string;
  secondFileName: string;
  secondFileSize: number;
  isPublished: boolean;
  updatedAt: string;
}

export interface OfficerResume extends MyResume {
  fullName: string;
}

/** Officer/admin: view any of their students' resumes. */
export function getStudentResume(studentId: string): Promise<OfficerResume> {
  return api<OfficerResume>(`/students/${studentId}/resume`);
}

export function getMyResume(): Promise<MyResume> {
  return api<MyResume>('/me/resume');
}

/** Slot 1 is the primary résumé, slot 2 the optional second one. */
export type ResumeSlot = 1 | 2;

export function uploadMyResume(file: File, slot: ResumeSlot = 1): Promise<MyResume> {
  const form = new FormData();
  form.append('file', file);
  return api<MyResume>(`/me/resume?slot=${slot}`, { method: 'POST', body: form });
}

export function updateMyResume(input: { isPublished: boolean }): Promise<MyResume> {
  return api<MyResume>('/me/resume', { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteMyResume(slot: ResumeSlot = 1): Promise<MyResume> {
  return api<MyResume>(`/me/resume?slot=${slot}`, { method: 'DELETE' });
}
