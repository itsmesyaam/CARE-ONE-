import { supabase } from '../../lib/supabase';
import type { Department, StaffMember, DepartmentFormData, InviteStaffFormData } from './types';

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
