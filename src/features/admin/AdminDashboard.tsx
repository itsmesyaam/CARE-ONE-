import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Users } from 'lucide-react';
import { DepartmentList } from './DepartmentList';
import { DepartmentFormDialog } from './DepartmentFormDialog';
import { StaffList } from './StaffList';
import { InviteStaffDialog } from './InviteStaffDialog';
import {
  fetchDepartments,
  createDepartment,
  updateDepartment,
  toggleArchiveDepartment,
  fetchStaff,
  toggleStaffActive,
  inviteStaff,
} from './api';
import type { Department, StaffMember, DepartmentFormData, InviteStaffFormData } from './types';

export function AdminDashboard(): React.JSX.Element {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'departments' | 'staff'>('departments');

  // Dialog states
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const {
    data: departments = [],
    isLoading: deptsLoading,
    error: deptsError,
  } = useQuery({
    queryKey: ['admin', 'departments'],
    queryFn: fetchDepartments,
  });

  const {
    data: staff = [],
    isLoading: staffLoading,
    error: staffError,
  } = useQuery({
    queryKey: ['admin', 'staff'],
    queryFn: fetchStaff,
  });

  const saveDeptMutation = useMutation({
    mutationFn: async (formData: DepartmentFormData) => {
      if (editingDept) {
        return updateDepartment(editingDept.id, formData);
      }
      return createDepartment(formData);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] });
    },
  });

  const toggleArchiveMutation = useMutation({
    mutationFn: async (dept: Department) => {
      return toggleArchiveDepartment(dept.id, !!dept.archived_at);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] });
    },
  });

  const toggleStaffMutation = useMutation({
    mutationFn: async (member: StaffMember) => {
      return toggleStaffActive(member.id, member.is_active);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
    },
  });

  const inviteStaffMutation = useMutation({
    mutationFn: inviteStaff,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
    },
  });

  const loading = deptsLoading || staffLoading;
  const error =
    (deptsError instanceof Error ? deptsError.message : null) ||
    (staffError instanceof Error ? staffError.message : null);

  const handleSaveDepartment = async (formData: DepartmentFormData) => {
    await saveDeptMutation.mutateAsync(formData);
  };

  const handleToggleArchive = async (dept: Department) => {
    await toggleArchiveMutation.mutateAsync(dept);
  };

  const handleToggleStaffActive = async (member: StaffMember) => {
    await toggleStaffMutation.mutateAsync(member);
  };

  const handleInviteStaff = async (formData: InviteStaffFormData) => {
    await inviteStaffMutation.mutateAsync(formData);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t('app.hospitalName')} — {t('roles.admin')}
          </h1>
          <p className="text-sm text-slate-500">
            {t('admin.departments.subtitle', 'Hospital administration and staff management')}
          </p>
        </div>

        <nav className="flex space-x-1 rounded-xl bg-slate-100 p-1" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab('departments')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'departments'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            {t('admin.departments.title')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'staff'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            {t('admin.staff.title')}
          </button>
        </nav>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-700 border border-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">{t('common.loading')}</div>
      ) : activeTab === 'departments' ? (
        <DepartmentList
          departments={departments}
          onAdd={() => {
            setEditingDept(null);
            setDeptDialogOpen(true);
          }}
          onEdit={(dept) => {
            setEditingDept(dept);
            setDeptDialogOpen(true);
          }}
          onToggleArchive={handleToggleArchive}
        />
      ) : (
        <StaffList
          staff={staff}
          onInvite={() => setInviteDialogOpen(true)}
          onToggleActive={handleToggleStaffActive}
        />
      )}

      <DepartmentFormDialog
        key={editingDept ? editingDept.id : deptDialogOpen ? 'open' : 'closed'}
        isOpen={deptDialogOpen}
        department={editingDept}
        onClose={() => {
          setDeptDialogOpen(false);
          setEditingDept(null);
        }}
        onSave={handleSaveDepartment}
      />

      <InviteStaffDialog
        isOpen={inviteDialogOpen}
        departments={departments}
        onClose={() => setInviteDialogOpen(false)}
        onInvite={handleInviteStaff}
      />
    </div>
  );
}
