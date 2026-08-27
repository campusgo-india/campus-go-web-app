'use client';

import { api, API_URL, getAccessToken, tryRefresh } from './api';

export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME'] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const employmentTypeLabel = (t: EmploymentType | null | undefined) => {
  if (!t) return null;
  return t === 'FULL_TIME' ? 'Full-time' : 'Part-time';
};

export interface Internship {
  id: string;
  studentId: string;
  companyName: string;
  role: string;
  employmentType: EmploymentType | null;
  domain: string | null;
  skills: string | null;
  location: string;
  // Null = not yet answered (kept visually distinct from an explicit "No").
  isPaid: boolean | null;
  stipend: number | null;
  startDate: string | null;
  endDate: string | null;
  isPpo: boolean | null;
  description: string | null;
  // Point-of-contact at the company.
  pocName: string;
  pocEmail: string;
  pocPhone: string;
  certificateUrl: string | null;
  createdAt: string;
  // Present only on the officer list (used to group batch by batch).
  studentName?: string;
  rollNumber?: string;
  studentSchool?: string;
  graduationYear?: number;
}

export interface InternshipInput {
  companyName: string;
  role: string;
  employmentType?: EmploymentType;
  domain?: string;
  skills?: string;
  location: string;
  isPaid?: boolean;
  stipend?: number;
  startDate?: string;
  endDate?: string;
  isPpo?: boolean;
  description?: string;
  pocName: string;
  pocEmail: string;
  pocPhone: string;
  certificateUrl?: string;
}

// ─── Student (self) ───
export const listMyInternships = () => api<Internship[]>('/me/internships');

export const createMyInternship = (input: InternshipInput) =>
  api<Internship>('/me/internships', { method: 'POST', body: JSON.stringify(input) });

export const updateMyInternship = (id: string, input: Partial<InternshipInput>) =>
  api<Internship>(`/me/internships/${id}`, { method: 'PATCH', body: JSON.stringify(input) });

// ─── Officer / College Admin ───
export const listInternships = () => api<Internship[]>('/internships');

export const createInternship = (input: InternshipInput & { studentId: string }) =>
  api<Internship>('/internships', { method: 'POST', body: JSON.stringify(input) });

export const updateInternship = (id: string, input: Partial<InternshipInput>) =>
  api<Internship>(`/internships/${id}`, { method: 'PATCH', body: JSON.stringify(input) });

export const deleteInternship = (id: string) =>
  api<{ success: boolean }>(`/internships/${id}`, { method: 'DELETE' });

/** Downloads every internship at the college as one XLSX file. */
export async function downloadInternships(): Promise<void> {
  const send = () => {
    const token = getAccessToken();
    return fetch(`${API_URL}/internships/export`, {
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
  const filename = match?.[1] ?? 'internships.xlsx';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
