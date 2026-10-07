import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, Search, Filter, Clock, User } from 'lucide-react';
import type { AuditLogEntry, AuditLogFilter, StaffMember } from './types';

interface AccessLogPageProps {
  logs: AuditLogEntry[];
  staffList: StaffMember[];
  isLoading: boolean;
  filter: AuditLogFilter;
  onFilterChange: (newFilter: AuditLogFilter) => void;
}

function formatIST(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

export const AccessLogPage: React.FC<AccessLogPageProps> = ({
  logs,
  staffList,
  isLoading,
  filter,
  onFilterChange,
}) => {
  const { t } = useTranslation();

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filter, startDate: e.target.value || undefined });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filter, endDate: e.target.value || undefined });
  };

  const handleStaffChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filter, staffId: e.target.value || undefined });
  };

  const handleActionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filter, action: e.target.value || undefined });
  };

  return (
    <div className="space-y-6">
      {/* Filters bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-2 font-semibold text-slate-800 text-sm dark:text-slate-200">
          <Filter className="h-4 w-4 text-emerald-600" />
          <span>Filters</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label
              htmlFor="start-date-input"
              className="block font-medium text-slate-600 text-xs dark:text-slate-400"
            >
              {t('admin.auditLog.filterStart', 'From Date')}
            </label>
            <input
              id="start-date-input"
              type="date"
              value={filter.startDate || ''}
              onChange={handleStartDateChange}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 text-sm focus:border-emerald-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="end-date-input"
              className="block font-medium text-slate-600 text-xs dark:text-slate-400"
            >
              {t('admin.auditLog.filterEnd', 'To Date')}
            </label>
            <input
              id="end-date-input"
              type="date"
              value={filter.endDate || ''}
              onChange={handleEndDateChange}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 text-sm focus:border-emerald-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="staff-select-input"
              className="block font-medium text-slate-600 text-xs dark:text-slate-400"
            >
              {t('admin.auditLog.filterStaff', 'Staff Member')}
            </label>
            <select
              id="staff-select-input"
              value={filter.staffId || ''}
              onChange={handleStaffChange}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 text-sm focus:border-emerald-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">{t('admin.auditLog.allStaff', 'All Staff Members')}</option>
              {staffList.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name} ({member.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="action-filter-input"
              className="block font-medium text-slate-600 text-xs dark:text-slate-400"
            >
              Action
            </label>
            <div className="relative mt-1">
              <input
                id="action-filter-input"
                type="text"
                placeholder={t('admin.auditLog.filterAction', 'Filter action...')}
                value={filter.action || ''}
                onChange={handleActionChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pr-8 pl-3 py-2 text-slate-900 text-sm focus:border-emerald-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <Search className="absolute top-2.5 right-2.5 h-4 w-4 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Access Log Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center p-8">
            <div className="flex items-center gap-3 text-slate-500">
              <Clock className="h-5 w-5 animate-spin text-emerald-600" />
              <span className="font-medium text-sm">
                {t('admin.auditLog.loading', 'Loading access logs...')}
              </span>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            {t('admin.auditLog.empty', 'No audit log entries matching filters.')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-slate-200 border-b bg-slate-50 text-slate-600 text-xs uppercase tracking-wider dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th scope="col" className="px-6 py-3.5 font-semibold">
                    {t('admin.auditLog.headers.timestamp', 'When (IST)')}
                  </th>
                  <th scope="col" className="px-6 py-3.5 font-semibold">
                    {t('admin.auditLog.headers.actor', 'Actor')}
                  </th>
                  <th scope="col" className="px-6 py-3.5 font-semibold">
                    {t('admin.auditLog.headers.action', 'Action')}
                  </th>
                  <th scope="col" className="px-6 py-3.5 font-semibold">
                    {t('admin.auditLog.headers.table', 'Target')}
                  </th>
                  <th scope="col" className="px-6 py-3.5 font-semibold">
                    {t('admin.auditLog.headers.reason', 'Reason / Note')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => {
                  const isEmergency =
                    log.action === 'EMERGENCY_ACCESS_GRANTED' ||
                    log.table_name === 'emergency_access';

                  return (
                    <tr
                      key={log.id}
                      className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                        isEmergency
                          ? 'bg-rose-50/40 dark:bg-rose-950/20'
                          : 'bg-white dark:bg-slate-900'
                      }`}
                    >
                      <td className="px-6 py-4 font-mono text-slate-500 text-xs whitespace-nowrap dark:text-slate-400">
                        {formatIST(log.at)}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400" />
                          <div>
                            <p className="font-semibold text-slate-900 text-xs dark:text-slate-100">
                              {log.actor_name || 'System / Unregistered'}
                            </p>
                            {log.actor_role && (
                              <span className="font-medium text-[11px] text-slate-500 capitalize dark:text-slate-400">
                                {log.actor_role}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-mono font-medium text-xs ${
                              isEmergency
                                ? 'border border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {isEmergency && <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />}
                            <span>{log.action}</span>
                          </span>

                          {isEmergency && (
                            <span className="inline-flex items-center rounded-full bg-rose-600 px-2 py-0.5 font-bold text-[10px] text-white tracking-wide uppercase">
                              {t('admin.auditLog.emergencyBadge', 'Emergency Access')}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-slate-600 text-xs whitespace-nowrap dark:text-slate-400">
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {log.table_name || '—'}
                        </span>
                        {log.record_id && (
                          <span className="ml-1 text-[11px] text-slate-400">
                            #{log.record_id.slice(0, 8)}
                          </span>
                        )}
                      </td>

                      <td className="max-w-xs truncate px-6 py-4 text-slate-600 text-xs dark:text-slate-400">
                        {log.reason ? (
                          <span
                            className={`font-medium ${isEmergency ? 'text-rose-700 dark:text-rose-300' : 'text-slate-700 dark:text-slate-300'}`}
                          >
                            {log.reason}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
