import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, Eye, EyeOff, CheckCircle2, ShieldAlert } from 'lucide-react';

interface ForcePasswordChangeModalProps {
  isOpen: boolean;
  username?: string;
  onSuccess: () => void;
}

export function ForcePasswordChangeModal({
  isOpen,
  username,
  onSuccess,
}: ForcePasswordChangeModalProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-none">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 id="change-password-title" className="text-xl font-bold text-slate-900 leading-tight">
              {t('forcePasswordChange.title', 'Set New Password')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t(
                'forcePasswordChange.desc',
                'For your security, you must set a new password on your first sign-in or after a password reset.'
              )}
            </p>
          </div>
        </div>

        {/* Visible Password Rules Box */}
        <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-200/80 p-4">
          <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            {t('forcePasswordChange.rulesTitle', 'Password Requirements:')}
          </span>
          <ul className="space-y-1.5 text-xs text-slate-600">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-none" />
              <span>{t('forcePasswordChange.ruleMinLength', 'At least 8 characters')}</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-none" />
              <span>{t('forcePasswordChange.ruleNotUsername', 'Cannot be your username')}</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-none" />
              <span>
                {t(
                  'forcePasswordChange.ruleNotCommon',
                  'Cannot be a common easy-to-guess password'
                )}
              </span>
            </li>
          </ul>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-2.5 text-rose-800 text-xs">
            <ShieldAlert className="w-4 h-4 flex-none mt-0.5" />
            <p className="leading-relaxed font-medium">{error}</p>
          </div>
        )}

        <form method="post" action="#" onSubmit={handleSubmit} className="mt-5 space-y-4">
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            value={username || ''}
            readOnly
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />

          <div>
            <label
              htmlFor="current-password"
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              {t('forcePasswordChange.currentPasswordLabel', 'Current (temporary) password')}
            </label>
            <div className="relative">
              <input
                id="current-password"
                name="currentPassword"
                type={showCurrent ? 'text' : 'password'}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 pr-10 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                aria-label={showCurrent ? t('staffAuth.hidePassword') : t('staffAuth.showPassword')}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="new-password"
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              {t('forcePasswordChange.newPasswordLabel', 'New password')}
            </label>
            <div className="relative">
              <input
                id="new-password"
                name="newPassword"
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 pr-10 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                aria-label={showNew ? t('staffAuth.hidePassword') : t('staffAuth.showPassword')}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              {t('forcePasswordChange.confirmPasswordLabel', 'Confirm new password')}
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                name="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 pr-10 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                aria-label={showConfirm ? t('staffAuth.hidePassword') : t('staffAuth.showPassword')}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition disabled:opacity-60"
            >
              {loading
                ? t('common.saving', 'Changing Password...')
                : t('forcePasswordChange.submitBtn', 'Change Password')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
