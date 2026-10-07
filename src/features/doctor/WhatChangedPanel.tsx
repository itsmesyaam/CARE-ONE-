import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Pill,
  Activity,
  CalendarX,
  AlertCircle,
  ExternalLink,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { WhatChangedItem, WhatChangedKind } from './types';

interface WhatChangedPanelProps {
  items: WhatChangedItem[];
  isLoading: boolean;
  lastVisitDate?: string | null;
  onSelectRecord?: (item: WhatChangedItem) => void;
}

const kindBadges: Record<
  WhatChangedKind,
  { labelKey: string; icon: React.ComponentType<{ className?: string }>; bg: string; text: string }
> = {
  report: {
    labelKey: 'doctor.whatChanged.kinds.report',
    icon: FileText,
    bg: 'bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
  },
  medicine: {
    labelKey: 'doctor.whatChanged.kinds.medicine',
    icon: Pill,
    bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  reading: {
    labelKey: 'doctor.whatChanged.kinds.reading',
    icon: Activity,
    bg: 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
  },
  missed: {
    labelKey: 'doctor.whatChanged.kinds.missed',
    icon: CalendarX,
    bg: 'bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800',
    text: 'text-rose-700 dark:text-rose-300',
  },
  symptom: {
    labelKey: 'doctor.whatChanged.kinds.symptom',
    icon: AlertCircle,
    bg: 'bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800',
    text: 'text-purple-700 dark:text-purple-300',
  },
};

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatRelativeOrIST(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

export const WhatChangedPanel: React.FC<WhatChangedPanelProps> = ({
  items,
  isLoading,
  lastVisitDate,
  onSelectRecord,
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-6 shadow-xs dark:border-sky-900/40 dark:bg-sky-950/20">
        <div className="flex items-center gap-3 text-sky-800 dark:text-sky-300">
          <Clock className="h-5 w-5 animate-spin" />
          <span className="font-medium text-sm">
            {t('doctor.whatChanged.loading', 'Loading changes since last visit...')}
          </span>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    const formattedDate = lastVisitDate ? formatDisplayDate(lastVisitDate) : null;
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/40">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
          <Clock className="h-5 w-5 text-slate-400" />
          <p className="font-medium text-sm">
            {formattedDate
              ? t('doctor.whatChanged.nothingNewSince', {
                  date: formattedDate,
                  defaultValue: `Nothing new since ${formattedDate}`,
                })
              : t('doctor.whatChanged.noPreviousVisits', 'No previous visits')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50/60 via-white to-blue-50/40 p-5 shadow-xs dark:border-sky-900/50 dark:from-sky-950/20 dark:via-slate-900 dark:to-blue-950/20">
      <div className="mb-4 flex items-center justify-between border-b border-sky-100 pb-3 dark:border-sky-900/40">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          <h3 className="font-semibold text-slate-900 text-sm tracking-tight dark:text-slate-100">
            {t('doctor.whatChanged.title', 'What Changed Since Last Visit')}
          </h3>
          <span className="rounded-full bg-sky-100 px-2 py-0.5 font-bold text-sky-700 text-xs dark:bg-sky-900/60 dark:text-sky-300">
            {items.length}
          </span>
        </div>
      </div>

      <ul className="divide-y divide-slate-100 dark:divide-slate-800/60" role="list">
        {items.map((item) => {
          const badgeConfig = kindBadges[item.kind] || kindBadges.report;
          const Icon = badgeConfig.icon;

          return (
            <li
              key={`${item.ref_table}-${item.ref_id}-${item.happened_at}`}
              onClick={() => onSelectRecord?.(item)}
              className="group flex cursor-pointer items-start justify-between gap-4 py-3 transition-colors hover:bg-sky-50/50 dark:hover:bg-slate-800/40"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectRecord?.(item);
                }
              }}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-medium text-xs ${badgeConfig.bg} ${badgeConfig.text}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{t(badgeConfig.labelKey, item.kind)}</span>
                </span>
                <div>
                  <p className="font-medium text-slate-800 text-sm group-hover:text-sky-700 dark:text-slate-200 dark:group-hover:text-sky-300">
                    {item.summary}
                  </p>
                  <p className="mt-0.5 text-slate-500 text-xs dark:text-slate-400">
                    {formatRelativeOrIST(item.happened_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-500">
                <ExternalLink className="h-4 w-4" />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
