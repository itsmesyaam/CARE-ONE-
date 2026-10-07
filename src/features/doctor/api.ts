import { supabase } from '../../lib/supabase';
import type { WhatChangedItem } from './types';

export async function fetchWhatChanged(patientId: string): Promise<WhatChangedItem[]> {
  const { data, error } = await supabase.rpc('what_changed', {
    p_patient_id: patientId,
  });

  if (error) {
    throw error;
  }

  return (data || []) as WhatChangedItem[];
}
