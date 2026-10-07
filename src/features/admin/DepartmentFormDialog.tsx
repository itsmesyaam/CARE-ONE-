import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { Department, DepartmentFormData } from './types';

interface DepartmentFormDialogProps {
  isOpen: boolean;
  department?: Department | null;
  onClose: () => void;
  onSave: (data: DepartmentFormData) => Promise<void> | void;
}

export function DepartmentFormDialog({
  isOpen,
  department,
  onClose,
  onSave,
}: DepartmentFormDialogProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const [name, setName] = useState(department?.name ?? '');
  const [code, setCode] = useState(department?.code ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();

    if (trimmedName.length < 2) {
      setError(t('admin.departments.errorName', 'Department name must be at least 2 characters'));
      return;
    }

    if (trimmedCode.length < 2) {
      setError(t('admin.departments.errorCode', 'Department code must be at least 2 characters'));
      return;
    }

    try {
      setLoading(true);
      await onSave({ name: trimmedName, code: trimmedCode });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save department');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dept-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 id="dept-dialog-title" className="text-lg font-bold text-slate-900">
            {department
              ? t('admin.departments.edit', 'Edit Department')
              : t('admin.departments.add', 'Add Department')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-700 border border-rose-200/80">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="dept-name" className="block text-xs font-semibold text-slate-700 mb-1">
              {t('admin.departments.name', 'Department Name')}
            </label>
            <input
              id="dept-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cardiology"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label htmlFor="dept-code" className="block text-xs font-semibold text-slate-700 mb-1">
              {t('admin.departments.code', 'Code')}
            </label>
            <input
              id="dept-code"
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. CARDIO"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 focus:border-emerald-600 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50 transition shadow-xs"
            >
              {loading ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
