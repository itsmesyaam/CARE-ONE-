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
  const res = await fetch('/api/departments');
  if (!res.ok) throw new Error('Failed to fetch departments');
  return (await res.json()) || [];
}

export async function createDepartment(payload: DepartmentFormData): Promise<Department> {
  const res = await fetch('/api/departments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: payload.name.trim(),
      code: payload.code.trim().toUpperCase(),
    }),
  });
  if (!res.ok) throw new Error('Failed to create department');
  return res.json();
}

export async function updateDepartment(
  id: string,
  payload: DepartmentFormData
): Promise<Department> {
  const res = await fetch(`/api/departments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: payload.name.trim(),
      code: payload.code.trim().toUpperCase(),
    }),
  });
  if (!res.ok) throw new Error('Failed to update department');
  return res.json();
}

export async function toggleArchiveDepartment(
  id: string,
  isArchived: boolean
): Promise<Department> {
  const res = await fetch(`/api/departments/${id}/archive`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isArchived }),
  });
  if (!res.ok) throw new Error('Failed to toggle archive status');
  return res.json();
}

export async function fetchStaff(): Promise<StaffMember[]> {
  const res = await fetch('/api/staff');
  if (!res.ok) throw new Error('Failed to fetch staff');
  return (await res.json()) || [];
}

export async function toggleStaffActive(
  id: string,
  currentIsActive: boolean
): Promise<StaffMember> {
  const res = await fetch(`/api/staff/${id}/active`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active: currentIsActive ? 0 : 1 }),
  });
  if (!res.ok) throw new Error('Failed to toggle staff active status');
  return res.json();
}

export async function inviteStaff(payload: InviteStaffFormData): Promise<{ user_id: string }> {
  const res = await fetch('/api/staff/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to invite staff');
  return res.json();
}

export async function fetchAdminDashboardCounts(): Promise<AdminDashboardCounts> {
  const res = await fetch('/api/admin/dashboard');
  if (!res.ok) throw new Error('Failed to fetch dashboard counts');
  const data = (await res.json()) as Partial<AdminDashboardCounts>;
  return {
    today_appointments: Number(data.today_appointments || 0),
    follow_ups_due: Number(data.follow_ups_due || 0),
    reports_waiting_review: Number(data.reports_waiting_review || 0),
    patients_overdue_follow_up: Number(data.patients_overdue_follow_up || 0),
    consultations_this_month: Number(data.consultations_this_month || 0),
    active_patients_30d: Number(data.active_patients_30d || 0),
    invited_patients: Number(data.invited_patients || 0),
    active_patient_share: Number(data.active_patient_share || 0),
  };
}

export async function fetchAdminAuditLogs(
  filter: AuditLogFilter = {},
  limit = 50,
  offset = 0
): Promise<AuditLogEntry[]> {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  if (filter.startDate) params.set('startDate', filter.startDate);
  if (filter.endDate) params.set('endDate', filter.endDate);
  if (filter.staffId) params.set('staffId', filter.staffId);
  if (filter.action) params.set('action', filter.action);

  const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  return (await res.json()) || [];
}
