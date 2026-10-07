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
