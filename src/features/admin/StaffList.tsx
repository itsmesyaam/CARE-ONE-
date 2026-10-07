import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, UserCheck, UserX, Stethoscope, Shield, Phone } from 'lucide-react';
import type { StaffMember } from './types';

interface StaffListProps {
  staff: StaffMember[];
  onInvite: () => void;
  onToggleActive: (member: StaffMember) => void;
}

export function StaffList({ staff, onInvite, onToggleActive }: StaffListProps): React.JSX.Element {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'doctor' | 'front_desk' | 'admin'>('all');

  const filtered = staff.filter((member) => {
    const matchesSearch =
      member.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (member.phone && member.phone.includes(search));
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'doctor':
        return <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />;
      case 'front_desk':
        return <Phone className="w-3.5 h-3.5 text-sky-600" />;
      case 'admin':
        return <Shield className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {t('admin.staff.title', 'Hospital Staff')}
          </h2>
          <p className="text-sm text-slate-500">
            {t('admin.staff.subtitle', 'Manage doctor, front desk, and administrator accounts')}
          </p>
        </div>
        <button
          type="button"
          onClick={onInvite}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 text-sm font-medium transition shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          {t('admin.staff.invite', 'Invite Staff')}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('admin.staff.searchPlaceholder', 'Search staff by name or phone...')}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 focus:border-emerald-600 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
        >
          <option value="all">{t('common.allRoles', 'All Roles')}</option>
          <option value="doctor">{t('roles.doctor', 'Doctor')}</option>
          <option value="front_desk">{t('roles.front_desk', 'Front Desk')}</option>
          <option value="admin">{t('roles.admin', 'Admin')}</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-semibold">
            <tr>
              <th scope="col" className="px-4 py-3">
                {t('admin.staff.name', 'Staff Name')}
              </th>
              <th scope="col" className="px-4 py-3">
                {t('admin.staff.role', 'Role')}
              </th>
              <th scope="col" className="px-4 py-3">
                {t('admin.staff.department', 'Department')}
              </th>
              <th scope="col" className="px-4 py-3">
                {t('admin.staff.status', 'Status')}
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                {t('common.actions', 'Actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  {t('admin.staff.empty', 'No staff members found.')}
                </td>
              </tr>
            ) : (
              filtered.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/75 transition">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{member.full_name}</div>
                    {member.phone && (
                      <div className="text-xs text-slate-500 font-mono">{member.phone}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                      {getRoleIcon(member.role)}
                      {t(`roles.${member.role}`, member.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {member.departments?.name || (member.department_id ? 'Assigned' : '—')}
                  </td>
                  <td className="px-4 py-3">
                    {member.is_active ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200/60">
                        <UserCheck className="w-3 h-3" />
                        {t('common.active', 'Active')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 border border-rose-200/60">
                        <UserX className="w-3 h-3" />
                        {t('common.deactivated', 'Deactivated')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onToggleActive(member)}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                        member.is_active
                          ? 'text-rose-700 hover:bg-rose-50 border border-rose-200/60'
                          : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-200/60'
                      }`}
                    >
                      {member.is_active
                        ? t('admin.staff.deactivate', 'Deactivate')
                        : t('admin.staff.activate', 'Activate')}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
