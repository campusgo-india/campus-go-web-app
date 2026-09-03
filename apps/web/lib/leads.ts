'use client';

import { api, apiList } from './api';

export type LeadSource = 'CONTACT' | 'DEMO';

export interface Lead {
  id: string;
  name: string;
  institution: string;
  designation: string;
  email: string;
  phone: string;
  message: string;
  source: LeadSource;
  createdAt: string;
}

export type LeadPatch = Partial<Pick<
  Lead,
  'name' | 'institution' | 'designation' | 'email' | 'phone' | 'message' | 'source'
>>;

/** Platform-Admin: marketing-site leads (Contact us / Request a demo), newest first. */
export async function listLeads(source: '' | LeadSource = ''): Promise<{ items: Lead[]; total: number }> {
  const { data, meta } = await apiList<Lead[]>(
    `/platform/leads${source ? `?source=${source}` : ''}`,
  );
  return { items: data, total: (meta?.total as number | undefined) ?? data.length };
}

export function updateLead(id: string, patch: LeadPatch): Promise<Lead> {
  return api<Lead>(`/platform/leads/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export function deleteLead(id: string): Promise<{ success: boolean }> {
  return api(`/platform/leads/${id}`, { method: 'DELETE' });
}
