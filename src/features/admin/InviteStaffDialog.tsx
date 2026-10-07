import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { Department, InviteStaffFormData } from './types';

interface InviteStaffDialogProps {
  isOpen: boolean;
  departments: Department[];
  onClose: () => void;
  onInvite: (data: InviteStaffFormData) => Promise<void> | void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InviteStaffDialog({
  isOpen,
  departments,
  onClose,
  onInvite,
}: InviteStaffDialogProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'doctor' | 'front_desk' | 'admin'>('doctor');
  const [departmentId, setDepartmentId] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedName.length < 2) {
      setError(t('admin.staff.errorName', 'Full name must be at least 2 characters'));
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError(t('admin.staff.errorEmail', 'Please enter a valid email address'));
      return;
    }

    try {
      setLoading(true);
      await onInvite({
        full_name: trimmedName,
        email: trimmedEmail,
        role,
        department_id: departmentId ? departmentId : null,
        phone: phone ? phone.trim() : null,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send staff invitation');
    } finally {
      setLoading(false);
    }
  };

  const activeDepartments = departments.filter((d) => !d.archived_at);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 id="invite-dialog-title" className="text-lg font-bold text-slate-900">
            {t('admin.staff.inviteTitle', 'Invite Hospital Staff')}
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
            <label htmlFor="staff-name" className="block text-xs font-semibold text-slate-700 mb-1">
              {t('admin.staff.fullName', 'Full Name')} *
            </label>
            <input
              id="staff-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Dr. Ramesh Kumar"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label
              htmlFor="staff-email"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              {t('admin.staff.email', 'Email Address')} *
            </label>
            <input
              id="staff-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. ramesh@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="staff-role"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                {t('admin.staff.role', 'Role')} *
              </label>
              <select
                id="staff-role"
                value={role}
                onChange={(e) => setRole(e.target.value as typeof role)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
              >
                <option value="doctor">{t('roles.doctor', 'Doctor')}</option>
                <option value="front_desk">{t('roles.front_desk', 'Front Desk')}</option>
                <option value="admin">{t('roles.admin', 'Admin')}</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="staff-phone"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                {t('admin.staff.phone', 'Phone Number')}
              </label>
              <input
                id="staff-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9847012345"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          {role === 'doctor' && (
            <div>
              <label
                htmlFor="staff-dept"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                {t('admin.staff.department', 'Department')}
              </label>
              <select
                id="staff-dept"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
              >
                <option value="">{t('admin.staff.selectDept', 'Select Department...')}</option>
                {activeDepartments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
          )}

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
              {loading
                ? t('admin.staff.sending', 'Sending...')
                : t('admin.staff.sendInvite', 'Send Invite')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
