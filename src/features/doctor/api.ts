import { apiFetch } from '../../lib/api-client';
import type { WhatChangedItem } from './types';

export async function fetchWhatChanged(patientId: string): Promise<WhatChangedItem[]> {
  const data = await apiFetch<{ whatChanged: WhatChangedItem[] }>(
    `/api/doctor/patients/${patientId}/what-changed`
  );
  return data.whatChanged || [];
}
