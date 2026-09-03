'use client';

import { apiList } from './api';

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

/** Platform-Admin: marketing-site leads (Contact us / Request a demo), newest first. */
export async function listLeads(source: '' | LeadSource = ''): Promise<{ items: Lead[]; total: number }> {
  const { data, meta } = await apiList<Lead[]>(
    `/platform/leads${source ? `?source=${source}` : ''}`,
  );
  return { items: data, total: (meta?.total as number | undefined) ?? data.length };
}
