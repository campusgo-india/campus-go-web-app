'use client';

import { api } from './api';

export interface EmailSettings {
  collegeId: string;
  enabled: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUser: string | null;
  hasPassword: boolean;
  fromEmail: string | null;
  fromName: string | null;
  replyTo: string | null;
  verifiedAt: string | null;
  lastTestError: string | null;
}

export interface UpdateEmailSettingsInput {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  // Omit to keep the currently-saved password unchanged.
  smtpPassword?: string;
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
}

export interface SendTestEmailResult {
  success: boolean;
  error?: string;
}

export const getEmailSettings = (collegeId: string) =>
  api<EmailSettings>(`/colleges/${collegeId}/email-settings`);

export const updateEmailSettings = (collegeId: string, input: UpdateEmailSettingsInput) =>
  api<EmailSettings>(`/colleges/${collegeId}/email-settings`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });

export const sendTestEmail = (collegeId: string, to?: string) =>
  api<SendTestEmailResult>(`/colleges/${collegeId}/email-settings/test`, {
    method: 'POST',
    body: JSON.stringify(to ? { to } : {}),
  });

export const setEmailEnabled = (collegeId: string, enabled: boolean) =>
  api<EmailSettings>(`/colleges/${collegeId}/email-settings/enabled`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
