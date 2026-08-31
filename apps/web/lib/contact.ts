'use client';

import { api } from './api';

export interface ContactEnquiryInput {
  name: string;
  institution: string;
  designation?: string;
  email: string;
  phone?: string;
  message?: string;
  source?: 'CONTACT' | 'DEMO';
}

// Public marketing-site form — no auth, no college context yet.
export const submitContactEnquiry = (input: ContactEnquiryInput) =>
  api<{ success: boolean; id: string }>('/public/contact', {
    method: 'POST',
    body: JSON.stringify(input),
    auth: false,
  });
