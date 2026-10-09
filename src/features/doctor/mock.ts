export interface DoctorProfile {
  id: string;
  name: string;
  dept: string;
  email: string;
  reg: string;
  room: string;
}

export const MOCK_DOCTOR: DoctorProfile = {
  id: 'doc-1',
  name: 'Dr. Rahul Nair',
  dept: 'General Medicine',
  email: 'dr.rahul@example.com',
  reg: 'KMC 48291',
  room: 'OP Block B, Room 12',
};

export const GLASS_QUICK_REASONS = [
  'In casualty with chest pain, need medication history',
  'Severe allergic reaction in casualty',
  'Emergency surgery needed',
  'Patient unconscious, family requested review',
];
