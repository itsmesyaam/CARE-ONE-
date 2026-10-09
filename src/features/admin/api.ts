import { apiFetch } from '../../lib/api-client';
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
  const res = await apiFetch<{ departments: Department[] }>('/api/admin/departments');
  return res.departments || [];
}

export async function createDepartment(payload: DepartmentFormData): Promise<Department> {
  const res = await apiFetch<{ success: boolean; department: Department }>(
    '/api/admin/departments',
    {
      method: 'POST',
      body: JSON.stringify({
        name: payload.name.trim(),
        code: payload.code.trim().toUpperCase(),
      }),
    }
  );
  return res.department;
}

export async function updateDepartment(
  id: string,
  payload: DepartmentFormData
): Promise<Department> {
  const res = await apiFetch<{ success: boolean; department: Department }>(
    `/api/admin/departments/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        name: payload.name.trim(),
        code: payload.code.trim().toUpperCase(),
      }),
    }
  );
  return res.department;
}

export async function toggleArchiveDepartment(
  id: string,
  isArchived?: boolean
): Promise<Department> {
  const res = await apiFetch<{ success: boolean; department: Department }>(
    `/api/admin/departments/${id}/archive`,
    {
      method: 'PATCH',
      body: JSON.stringify({ isArchived }),
    }
  );
  return res.department;
}

export async function fetchStaff(): Promise<StaffMember[]> {
  const res = await apiFetch<{ staff: Array<Record<string, unknown>> }>('/api/admin/staff');
  return (res.staff || []).map((s) => ({
    id: String(s.id),
    user_id: String(s.user_id || ''),
    full_name: String(s.full_name || ''),
    role: s.role as 'doctor' | 'front_desk' | 'admin',
    department_id: (s.department_id as string) || null,
    departments: s.department_name ? { name: String(s.department_name) } : null,
    phone: (s.phone as string) || null,
    is_active: Boolean(s.is_active),
    created_at: String(s.created_at || ''),
    deleted_at: null,
  }));
}

export async function toggleStaffActive(
  id: string,
  currentIsActive?: boolean
): Promise<StaffMember> {
  const res = await apiFetch<{ success: boolean; staff: Record<string, unknown> }>(
    `/api/admin/staff/${id}/active`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        isActive: currentIsActive !== undefined ? !currentIsActive : undefined,
      }),
    }
  );
  const s = res.staff;
  return {
    id: String(s.id),
    user_id: String(s.user_id || ''),
    full_name: String(s.full_name || ''),
    role: s.role as 'doctor' | 'front_desk' | 'admin',
    department_id: (s.department_id as string) || null,
    departments: s.department_name ? { name: String(s.department_name) } : null,
    phone: (s.phone as string) || null,
    is_active: Boolean(s.is_active),
    created_at: String(s.created_at || ''),
    deleted_at: null,
  };
}

export async function inviteStaff(payload: InviteStaffFormData): Promise<{ user_id: string }> {
  const res = await apiFetch<{ success: boolean; user_id: string }>('/api/admin/staff/invite', {
    method: 'POST',
    body: JSON.stringify({
      fullName: payload.full_name,
      role: payload.role,
      email: payload.email,
      phone: payload.phone || null,
      departmentId: payload.department_id || null,
    }),
  });
  return { user_id: res.user_id };
}

export async function fetchAdminDashboardCounts(): Promise<AdminDashboardCounts> {
  const res = await apiFetch<{
    metrics: {
      appointmentsToday?: number;
      reportsWaitingReview?: number;
      activePatients?: number;
      activeCarePlans?: number;
      consultationsThisMonth?: number;
      followUpsDueToday?: number;
    };
  }>('/api/admin/dashboard-counts');

  const m = res.metrics || {};
  return {
    today_appointments: m.appointmentsToday || 0,
    follow_ups_due: m.followUpsDueToday || 0,
    reports_waiting_review: m.reportsWaitingReview || 0,
    patients_overdue_follow_up: 0,
    consultations_this_month: m.consultationsThisMonth || 0,
    active_patients_30d: m.activePatients || 0,
    invited_patients: m.activePatients || 0,
    active_patient_share: 100,
  };
}

export async function fetchAdminAuditLogs(
  filter: AuditLogFilter = {},
  limit = 50,
  offset = 0
): Promise<AuditLogEntry[]> {
  const query = new URLSearchParams();
  if (filter.staffId) query.set('staffId', filter.staffId);
  if (filter.action) query.set('action', filter.action);
  if (filter.startDate) query.set('startDate', filter.startDate);
  if (filter.endDate) query.set('endDate', filter.endDate);
  query.set('limit', String(limit));
  query.set('offset', String(offset));
  const res = await apiFetch<{ logs: AuditLogEntry[] }>(
    `/api/admin/audit-logs?${query.toString()}`
  );
  return res.logs || [];
}
