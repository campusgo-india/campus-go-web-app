'use client';

import { api, apiList } from './api';

export type LeadSource = 'CONTACT' | 'DEMO';

export interface Lead {
  id: string;
  name: string;
  institution: string;
  // Nullable: older leads were captured before these fields were required.
  designation: string | null;
  email: string;
  phone: string | null;
  message: string | null;
  source: LeadSource;
  createdAt: string;
}

export type LeadPatch = Partial<Pick<
  Lead,
  'name' | 'institution' | 'designation' | 'email' | 'phone' | 'message' | 'source'
>>;

export interface ListMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/** Platform-Admin: marketing-site leads (Contact us / Request a demo), newest first. */
export async function listLeads(
  source: '' | LeadSource = '',
  page = 1,
  limit = 50,
): Promise<{ items: Lead[]; meta?: ListMeta }> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (source) params.set('source', source);
  const { data, meta } = await apiList<Lead[]>(`/platform/leads?${params.toString()}`);
  return { items: data, meta: meta as ListMeta | undefined };
}

export function updateLead(id: string, patch: LeadPatch): Promise<Lead> {
  return api<Lead>(`/platform/leads/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export function deleteLead(id: string): Promise<{ success: boolean }> {
  return api(`/platform/leads/${id}`, { method: 'DELETE' });
}
