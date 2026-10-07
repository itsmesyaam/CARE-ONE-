import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Archive, CheckCircle2 } from 'lucide-react';
import type { Department } from './types';

interface DepartmentListProps {
  departments: Department[];
  onAdd: () => void;
  onEdit: (dept: Department) => void;
  onToggleArchive: (dept: Department) => void;
}

export function DepartmentList({
  departments,
  onAdd,
  onEdit,
  onToggleArchive,
}: DepartmentListProps): React.JSX.Element {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');

  const filtered = departments.filter((d) => {
    if (filter === 'active') return !d.archived_at;
    if (filter === 'archived') return !!d.archived_at;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {t('admin.departments.title', 'Departments')}
          </h2>
          <p className="text-sm text-slate-500">
            {t('admin.departments.subtitle', 'Manage clinical departments and specialities')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-md transition ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('common.all', 'All')} ({departments.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 rounded-md transition ${
                filter === 'active'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('common.active', 'Active')} ({departments.filter((d) => !d.archived_at).length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('archived')}
              className={`px-3 py-1.5 rounded-md transition ${
                filter === 'archived'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('common.archived', 'Archived')} (
              {departments.filter((d) => !!d.archived_at).length})
            </button>
          </div>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 text-sm font-medium transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t('admin.departments.add', 'Add Department')}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-semibold">
            <tr>
              <th scope="col" className="px-4 py-3">
                {t('admin.departments.name', 'Department Name')}
              </th>
              <th scope="col" className="px-4 py-3">
                {t('admin.departments.code', 'Code')}
              </th>
              <th scope="col" className="px-4 py-3">
                {t('admin.departments.status', 'Status')}
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                {t('common.actions', 'Actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  {t('admin.departments.empty', 'No departments found.')}
                </td>
              </tr>
            ) : (
              filtered.map((dept) => {
                const isArchived = !!dept.archived_at;
                return (
                  <tr key={dept.id} className="hover:bg-slate-50/75 transition">
                    <td className="px-4 py-3 font-medium text-slate-900">{dept.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-mono font-medium text-slate-700">
                        {dept.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isArchived ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200/60">
                          <Archive className="w-3 h-3" />
                          {t('common.archived', 'Archived')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200/60">
                          <CheckCircle2 className="w-3 h-3" />
                          {t('common.active', 'Active')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => onEdit(dept)}
                        aria-label={`Edit ${dept.name}`}
                        className="inline-flex items-center gap-1 rounded p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleArchive(dept)}
                        aria-label={isArchived ? `Restore ${dept.name}` : `Archive ${dept.name}`}
                        className={`inline-flex items-center gap-1 rounded p-1.5 transition ${
                          isArchived
                            ? 'text-emerald-700 hover:bg-emerald-50'
                            : 'text-amber-700 hover:bg-amber-50'
                        }`}
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
