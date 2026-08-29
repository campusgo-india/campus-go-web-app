'use client';

import { api } from './api';

export interface PlacementPolicy {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  maxOffersAllowed: number | null;
  updatedAt: string;
}

export interface RestrictedStudent {
  id: string;
  rollNumber: string;
  fullName: string;
  programme: string;
  offerCount: number;
}

export interface RestrictedStudentsResult {
  maxOffersAllowed: number | null;
  students: RestrictedStudent[];
}

// ─── Officer / College Admin ───
export const getPlacementPolicy = () => api<PlacementPolicy>('/placement-policy');

export const getRestrictedStudents = () =>
  api<RestrictedStudentsResult>('/placement-policy/restricted-students');

export function uploadPolicyDocument(file: File): Promise<PlacementPolicy> {
  const form = new FormData();
  form.append('file', file);
  return api<PlacementPolicy>('/placement-policy/document', { method: 'POST', body: form });
}

export const deletePolicyDocument = () =>
  api<PlacementPolicy>('/placement-policy/document', { method: 'DELETE' });

export const setOfferLimit = (maxOffersAllowed: number | null) =>
  api<PlacementPolicy>('/placement-policy/offer-limit', {
    method: 'PATCH',
    body: JSON.stringify({ maxOffersAllowed }),
  });

// ─── Student (self) ───
export const getMyPlacementPolicy = () => api<PlacementPolicy>('/me/placement-policy');
