import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Clock,
  FileCheck2,
  AlertTriangle,
  Stethoscope,
  Smartphone,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import type { AdminDashboardCounts } from './types';

interface AdminOverviewPanelProps {
  counts: AdminDashboardCounts | null;
  isLoading: boolean;
}

export const AdminOverviewPanel: React.FC<AdminOverviewPanelProps> = ({ counts, isLoading }) => {
  const { t } = useTranslation();

  if (isLoading || !counts) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 text-slate-500">
          <Clock className="h-5 w-5 animate-spin text-emerald-600" />
          <p className="font-medium text-sm">
            {t('admin.overview.loading', 'Loading dashboard metrics...')}
          </p>
        </div>
      </div>
    );
  }

  const metricCards = [
    {
      id: 'appointments',
      title: t('admin.overview.todayAppointments', "Today's Appointments"),
      value: counts.today_appointments,
      icon: Calendar,
      accent: 'border-l-blue-500 text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50/50 dark:bg-blue-950/20',
    },
    {
      id: 'followups',
      title: t('admin.overview.followUpsDue', 'Follow-ups Due Today'),
      value: counts.follow_ups_due,
      icon: Clock,
      accent: 'border-l-teal-500 text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-50/50 dark:bg-teal-950/20',
    },
    {
      id: 'reports',
      title: t('admin.overview.reportsWaitingReview', 'Reports Waiting Review'),
      value: counts.reports_waiting_review,
      icon: FileCheck2,
      accent: 'border-l-amber-500 text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50/50 dark:bg-amber-950/20',
    },
    {
      id: 'overdue',
      title: t('admin.overview.patientsOverdue', 'Overdue Follow-ups'),
      value: counts.patients_overdue_follow_up,
      icon: AlertTriangle,
      accent: 'border-l-rose-500 text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50/50 dark:bg-rose-950/20',
    },
    {
      id: 'consultations',
      title: t('admin.overview.consultationsMonth', 'Consultations This Month'),
      value: counts.consultations_this_month,
      icon: Stethoscope,
      accent: 'border-l-emerald-500 text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50/50 dark:bg-emerald-950/20',
    },
    {
      id: 'adoption',
      title: t('admin.overview.activePatients', 'Active App Patients'),
      value: `${counts.active_patient_share}%`,
      subtitle: t('admin.overview.invitedRatio', {
        active: counts.active_patients_30d,
        total: counts.invited_patients,
        defaultValue: `${counts.active_patients_30d} of ${counts.invited_patients} invited`,
      }),
      icon: Smartphone,
      accent: 'border-l-indigo-500 text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50/50 dark:bg-indigo-950/20',
    },
  ];

  const workloadChartData = [
    { name: "Today's Appts", count: counts.today_appointments, color: '#3b82f6' },
    { name: 'Follow-ups Due', count: counts.follow_ups_due, color: '#14b8a6' },
    { name: 'Pending Reports', count: counts.reports_waiting_review, color: '#f59e0b' },
    { name: 'Overdue Follow-ups', count: counts.patients_overdue_follow_up, color: '#f43f5e' },
  ];

  const adoptionChartData = [
    { name: 'Active (30d)', value: counts.active_patients_30d, color: '#6366f1' },
    {
      name: 'Inactive / Pending',
      value: Math.max(0, counts.invited_patients - counts.active_patients_30d),
      color: '#e2e8f0',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 6 Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className={`rounded-2xl border border-slate-200 border-l-4 bg-white p-5 shadow-xs transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900 ${card.accent}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-500 text-xs dark:text-slate-400">
                  {card.title}
                </span>
                <div className={`rounded-xl p-2 ${card.bg}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="font-bold text-2xl text-slate-900 tracking-tight dark:text-white sm:text-3xl">
                  {card.value}
                </span>
                {card.subtitle && (
                  <p className="mt-1 font-medium text-slate-500 text-xs dark:text-slate-400">
                    {card.subtitle}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Analytics with Recharts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Workload Bar Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                {t('admin.overview.activityChartTitle', 'Operational Workload Distribution')}
              </h3>
              <p className="text-slate-500 text-xs dark:text-slate-400">
                Current pending clinical tasks and appointments
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
              <BarChart
                data={workloadChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} stroke="#94a3b8" />
                <YAxis allowDecimals={false} stroke="#94a3b8" />
                <Tooltip
                  cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '0.75rem',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {workloadChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Patient App Engagement Donut Chart */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h3 className="font-semibold text-base text-slate-900 dark:text-white">
              {t('admin.overview.adoptionChartTitle', 'Patient App Engagement (30 Days)')}
            </h3>
            <p className="text-slate-500 text-xs dark:text-slate-400">
              Active users relative to all invited accounts
            </p>
          </div>

          <div className="relative my-auto flex h-48 w-full items-center justify-center">
            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
              <PieChart>
                <Pie
                  data={adoptionChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {adoptionChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-bold text-2xl text-slate-900 dark:text-white">
                {counts.active_patient_share}%
              </span>
              <span className="font-medium text-[11px] text-slate-500 uppercase tracking-wider dark:text-slate-400">
                Active
              </span>
            </div>
          </div>

          <div className="flex justify-around border-slate-100 border-t pt-3 text-xs dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-indigo-500" />
              <span className="text-slate-600 dark:text-slate-400">
                Active: {counts.active_patients_30d}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="text-slate-600 dark:text-slate-400">
                Invited: {counts.invited_patients}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
