import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Users, BarChart3, ShieldCheck } from 'lucide-react';
import { AdminOverviewPanel } from './AdminOverviewPanel';
import { AccessLogPage } from './AccessLogPage';
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
  fetchAdminDashboardCounts,
  fetchAdminAuditLogs,
} from './api';
import type {
  Department,
  StaffMember,
  DepartmentFormData,
  InviteStaffFormData,
  AuditLogFilter,
} from './types';

export function AdminDashboard(): React.JSX.Element {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'staff' | 'audit_log'>(
    'overview'
  );

  // Dialog states
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Audit filter state
  const [auditFilter, setAuditFilter] = useState<AuditLogFilter>({});

  const {
    data: dashboardCounts,
    isLoading: countsLoading,
    error: countsError,
  } = useQuery({
    queryKey: ['admin', 'counts'],
    queryFn: fetchAdminDashboardCounts,
    enabled: activeTab === 'overview',
  });

  const {
    data: auditLogs = [],
    isLoading: auditLoading,
    error: auditError,
  } = useQuery({
    queryKey: ['admin', 'audit-logs', auditFilter],
    queryFn: () => fetchAdminAuditLogs(auditFilter),
    enabled: activeTab === 'audit_log',
  });

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

  const rawError =
    (countsError instanceof Error ? countsError.message : null) ||
    (auditError instanceof Error ? auditError.message : null) ||
    (deptsError instanceof Error ? deptsError.message : null) ||
    (staffError instanceof Error ? staffError.message : null);

  const error = (() => {
    if (!rawError) return null;
    if (
      rawError.includes('violates') ||
      rawError.includes('constraint') ||
      rawError.includes('relation') ||
      rawError.includes('SQLSTATE') ||
      rawError.includes('syntax error') ||
      rawError.includes('permission denied for table')
    ) {
      return 'An unexpected database error occurred. Please contact system administration.';
    }
    return rawError;
  })();

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
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col items-start justify-between gap-4 border-slate-200 border-b pb-4 sm:flex-row sm:items-center dark:border-slate-800">
        <div>
          <h1 className="font-bold text-2xl text-slate-900 dark:text-white">
            {t('app.hospitalName')} — {t('roles.admin')}
          </h1>
          <p className="text-slate-500 text-sm dark:text-slate-400">
            {t('admin.departments.subtitle', 'Hospital administration and staff management')}
          </p>
        </div>

        <nav
          className="flex space-x-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
          aria-label="Tabs"
        >
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 font-semibold text-sm transition sm:px-4 ${
              activeTab === 'overview'
                ? 'bg-white text-emerald-800 shadow-xs dark:bg-slate-900 dark:text-emerald-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            {t('admin.tabs.overview', 'Overview')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('departments')}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 font-semibold text-sm transition sm:px-4 ${
              activeTab === 'departments'
                ? 'bg-white text-emerald-800 shadow-xs dark:bg-slate-900 dark:text-emerald-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <Building2 className="h-4 w-4" />
            {t('admin.tabs.departments', 'Departments')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 font-semibold text-sm transition sm:px-4 ${
              activeTab === 'staff'
                ? 'bg-white text-emerald-800 shadow-xs dark:bg-slate-900 dark:text-emerald-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <Users className="h-4 w-4" />
            {t('admin.tabs.staff', 'Staff')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audit_log')}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 font-semibold text-sm transition sm:px-4 ${
              activeTab === 'audit_log'
                ? 'bg-white text-emerald-800 shadow-xs dark:bg-slate-900 dark:text-emerald-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            {t('admin.tabs.auditLog', 'Access Log')}
          </button>
        </nav>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 font-medium text-rose-700 text-sm dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
          {error}
        </div>
      )}

      {activeTab === 'overview' ? (
        <AdminOverviewPanel counts={dashboardCounts ?? null} isLoading={countsLoading} />
      ) : activeTab === 'departments' ? (
        deptsLoading ? (
          <div className="py-12 text-center text-slate-500">{t('common.loading')}</div>
        ) : (
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
        )
      ) : activeTab === 'staff' ? (
        staffLoading ? (
          <div className="py-12 text-center text-slate-500">{t('common.loading')}</div>
        ) : (
          <StaffList
            staff={staff}
            onInvite={() => setInviteDialogOpen(true)}
            onToggleActive={handleToggleStaffActive}
          />
        )
      ) : (
        <AccessLogPage
          logs={auditLogs}
          staffList={staff}
          isLoading={auditLoading}
          filter={auditFilter}
          onFilterChange={setAuditFilter}
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
