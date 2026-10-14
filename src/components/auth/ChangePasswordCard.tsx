import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, Eye, EyeOff, CheckCircle2, ShieldAlert } from 'lucide-react';

interface ChangePasswordCardProps {
  username?: string;
  onSuccess?: () => void;
}

export function ChangePasswordCard({ username, onSuccess }: ChangePasswordCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t('forcePasswordChange.fillAll', 'Please fill in all fields.'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('forcePasswordChange.mismatch', 'New passwords do not match.'));
      return;
    }

    if (newPassword.length < 8) {
      setError(t('forcePasswordChange.ruleMinLength', 'At least 8 characters required.'));
      return;
    }

    if (username && newPassword.toLowerCase() === username.toLowerCase()) {
      setError(t('forcePasswordChange.ruleNotUsername', 'Cannot be your username.'));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string; errors?: string[] };

      if (!res.ok || !data.ok) {
        throw new Error(data.error || data.errors?.[0] || 'Failed to update password');
      }

      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-white p-6 rounded-2xl border border-[var(--line)] shadow-xs">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center flex-none">
          <Lock className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-base text-[var(--ink)]">
            {t('changePassword.title', 'Change Password')}
          </h3>
          <p className="text-xs text-[var(--ink3)]">
            {t(
              'changePassword.sub',
              'Update your account password. Changing password signs out all other devices.'
            )}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-start gap-2.5 text-rose-800 text-xs">
          <ShieldAlert className="w-4 h-4 flex-none mt-0.5" />
          <p className="font-medium leading-relaxed">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2 text-emerald-800 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 flex-none text-emerald-600" />
          <span>{t('changePassword.success', 'Password changed successfully! Other devices have been signed out.')}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-[var(--ink2)] mb-1">
            {t('changePassword.currentPassword', 'Current password')}
          </label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] pr-10 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
              placeholder="••••••••••••"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--ink3)] hover:text-[var(--ink)]"
              aria-label={showCurrent ? t('staffAuth.hidePassword') : t('staffAuth.showPassword')}
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--ink2)] mb-1">
            {t('changePassword.newPassword', 'New password (min. 8 characters)')}
          </label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] pr-10 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
              placeholder="••••••••••••"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--ink3)] hover:text-[var(--ink)]"
              aria-label={showNew ? t('staffAuth.hidePassword') : t('staffAuth.showPassword')}
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--ink2)] mb-1">
            {t('changePassword.confirmPassword', 'Confirm new password')}
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] pr-10 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
              placeholder="••••••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--ink3)] hover:text-[var(--ink)]"
              aria-label={showConfirm ? t('staffAuth.hidePassword') : t('staffAuth.showPassword')}
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition disabled:opacity-60 cursor-pointer mt-1"
        >
          {loading ? t('common.saving', 'Changing Password...') : t('changePassword.button', 'Change Password')}
        </button>
      </form>
    </section>
  );
}
