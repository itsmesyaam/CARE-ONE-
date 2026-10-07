export interface Department {
  id: string;
  name: string;
  code: string;
  archived_at: string | null;
  created_at: string;
}

export interface StaffMember {
  id: string;
  user_id: string;
  full_name: string;
  role: 'doctor' | 'front_desk' | 'admin';
  department_id: string | null;
  departments?: { name: string } | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  deleted_at: string | null;
}

export interface DepartmentFormData {
  name: string;
  code: string;
}

export interface InviteStaffFormData {
  email: string;
  full_name: string;
  role: 'doctor' | 'front_desk' | 'admin';
  department_id?: string | null;
  phone?: string | null;
}

export interface AdminDashboardCounts {
  today_appointments: number;
  follow_ups_due: number;
  reports_waiting_review: number;
  patients_overdue_follow_up: number;
  consultations_this_month: number;
  active_patients_30d: number;
  invited_patients: number;
  active_patient_share: number;
}

export interface AuditLogEntry {
  id: number;
  at: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  patient_id: string | null;
  reason: string | null;
}

export interface AuditLogFilter {
  startDate?: string;
  endDate?: string;
  staffId?: string;
  action?: string;
}
