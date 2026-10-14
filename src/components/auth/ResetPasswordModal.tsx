import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, Copy, Check, AlertTriangle, X } from 'lucide-react';

interface ResetPasswordModalProps {
  isOpen: boolean;
  title: string;
  username: string;
  temporaryPassword: string;
  onClose: () => void;
}

export function ResetPasswordModal({
  isOpen,
  title,
  username,
  temporaryPassword,
  onClose,
}: ResetPasswordModalProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers or test environments
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-none">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 id="reset-modal-title" className="text-lg font-bold text-slate-900 leading-tight">
                {title}
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{username}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            aria-label={t('common.cancel', 'Close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="rounded-2xl bg-amber-50/70 border border-amber-200/80 p-3.5 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-none mt-0.5" />
            <p className="text-xs text-amber-900 leading-relaxed">
              {t(
                'resetPasswordModal.onceNotice',
                'This temporary password will only be shown ONCE. Please copy and share it securely with the user.'
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t('resetPasswordModal.tempPasswordLabel', 'Temporary Password')}
            </span>
            <div className="mt-2 flex items-center justify-between gap-3">
              <code className="font-mono text-xl sm:text-2xl font-bold text-slate-900 tracking-wider select-all">
                {temporaryPassword}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 text-xs font-bold transition shadow-sm"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? t('resetPasswordModal.copied', 'Copied!') : t('resetPasswordModal.copyBtn', 'Copy')}</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            {t(
              'resetPasswordModal.mustChangeNotice',
              'The user will be required to choose a new password upon their first sign-in.'
            )}
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition"
          >
            {t('common.cancel', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
}
