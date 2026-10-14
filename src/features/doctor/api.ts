import type { WhatChangedItem } from './types';

export async function fetchWhatChanged(patientId: string): Promise<WhatChangedItem[]> {
  const res = await fetch(`/api/doctor/patients/${patientId}/what-changed`);
  if (!res.ok) {
    throw new Error('Failed to fetch what changed records');
  }
  return (await res.json()) || [];
}
