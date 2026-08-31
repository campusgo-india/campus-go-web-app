'use client';

import { api } from './api';

export interface TeamMember {
  id: string;
  email: string;
  fullName: string;
  role: string;
  phone: string | null;
  assignedProgrammes: string[];
  isActive: boolean;
  lastLoginAt: string | null;
}

export interface CreateUserInput {
  fullName: string;
  email: string;
  role: string; // COLLEGE_ADMIN | PLACEMENT_OFFICER | PLACEMENT_COORDINATOR | MANAGEMENT | TRAINING
  phone?: string;
  // PLACEMENT_COORDINATOR only: the programmes they're responsible
  // for — may cover more than one (e.g. BBA & MBA).
  assignedProgrammes?: string[];
  // Optional: set the password directly. Omit to auto-generate a temp password.
  password?: string;
}

export interface CreateUserResult {
  user: TeamMember;
  passwordGenerated: boolean;
  tempPassword: string | null;
}

export interface UpdateUserInput {
  fullName?: string;
  phone?: string;
  role?: string;
  assignedProgrammes?: string[];
  isActive?: boolean;
}

export const listUsers = () => api<TeamMember[]>('/users');

export const createUser = (input: CreateUserInput) =>
  api<CreateUserResult>('/users', { method: 'POST', body: JSON.stringify(input) });

export const updateUser = (id: string, input: UpdateUserInput) =>
  api<TeamMember>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(input) });

export const deactivateUser = (id: string) =>
  api<{ success: boolean }>(`/users/${id}`, { method: 'DELETE' });

// Generates a fresh temp password (shown once) — the original is never
// recoverable, only reset.
export const resetUserPassword = (id: string) =>
  api<{ tempPassword: string }>(`/users/${id}/reset-password`, { method: 'POST' });

export const reactivateUser = (id: string) => updateUser(id, { isActive: true });
