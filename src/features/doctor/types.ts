export type WhatChangedKind = 'report' | 'medicine' | 'reading' | 'missed' | 'symptom';

export interface WhatChangedItem {
  happened_at: string;
  kind: WhatChangedKind;
  summary: string;
  ref_table: string;
  ref_id: string;
}
