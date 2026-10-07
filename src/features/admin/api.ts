import { supabase } from '../../lib/supabase';
import type {
  Department,
  StaffMember,
  DepartmentFormData,
  InviteStaffFormData,
  AdminDashboardCounts,
  AuditLogEntry,
  AuditLogFilter,
} from './types';

export async function fetchDepartments(): Promise<Department[]> {
  const { data, error } = await supabase
    .from('departments')
    .select('id, name, code, archived_at, created_at')
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function createDepartment(payload: DepartmentFormData): Promise<Department> {
  const { data, error } = await supabase
    .from('departments')
    .insert({
      name: payload.name.trim(),
      code: payload.code.trim().toUpperCase(),
    })
    .select('id, name, code, archived_at, created_at')
    .single();

  if (error) throw error;
  return data;
}

export async function updateDepartment(
  id: string,
  payload: DepartmentFormData
): Promise<Department> {
  const { data, error } = await supabase
    .from('departments')
    .update({
      name: payload.name.trim(),
      code: payload.code.trim().toUpperCase(),
    })
    .eq('id', id)
    .select('id, name, code, archived_at, created_at')
    .single();

  if (error) throw error;
  return data;
}

export async function toggleArchiveDepartment(
  id: string,
  isArchived: boolean
): Promise<Department> {
  const { data, error } = await supabase
    .from('departments')
    .update({
      archived_at: isArchived ? null : new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, name, code, archived_at, created_at')
    .single();

  if (error) throw error;
  return data;
}

export async function fetchStaff(): Promise<StaffMember[]> {
  const { data, error } = await supabase
    .from('staff')
    .select(
      `
      id,
      user_id,
      full_name,
      role,
      department_id,
      departments (name),
      phone,
      is_active,
      created_at,
      deleted_at
    `
    )
    .is('deleted_at', null)
    .order('full_name');

  if (error) throw error;
  return (data as unknown as StaffMember[]) || [];
}

export async function toggleStaffActive(
  id: string,
  currentIsActive: boolean
): Promise<StaffMember> {
  const { data, error } = await supabase
    .from('staff')
    .update({
      is_active: !currentIsActive,
    })
    .eq('id', id)
    .select(
      `
      id,
      user_id,
      full_name,
      role,
      department_id,
      departments (name),
      phone,
      is_active,
      created_at,
      deleted_at
    `
    )
    .single();

  if (error) throw error;
  return data as unknown as StaffMember;
}

export async function inviteStaff(payload: InviteStaffFormData): Promise<{ user_id: string }> {
  const { data, error } = await supabase.functions.invoke('invite-staff', {
    body: payload,
  });

  if (error) throw error;
  return data;
}

export async function fetchAdminDashboardCounts(): Promise<AdminDashboardCounts> {
  const { data, error } = await supabase.rpc('get_admin_dashboard_counts');

  if (error) throw error;
  const row = (data?.[0] || {}) as Partial<AdminDashboardCounts>;
  return {
    today_appointments: Number(row.today_appointments || 0),
    follow_ups_due: Number(row.follow_ups_due || 0),
    reports_waiting_review: Number(row.reports_waiting_review || 0),
    patients_overdue_follow_up: Number(row.patients_overdue_follow_up || 0),
    consultations_this_month: Number(row.consultations_this_month || 0),
    active_patients_30d: Number(row.active_patients_30d || 0),
    invited_patients: Number(row.invited_patients || 0),
    active_patient_share: Number(row.active_patient_share || 0),
  };
}

export async function fetchAdminAuditLogs(
  filter: AuditLogFilter = {},
  limit = 50,
  offset = 0
): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase.rpc('get_admin_audit_logs', {
    p_start_date: filter.startDate || undefined,
    p_end_date: filter.endDate || undefined,
    p_staff_id: filter.staffId || undefined,
    p_action: filter.action ? filter.action.trim().toUpperCase() : undefined,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;
  return (data || []) as AuditLogEntry[];
}
