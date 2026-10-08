import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, LogOut, AlertTriangle } from 'lucide-react';
import { usePatient } from './PatientContext';

interface ConfirmSheetModalProps {
  k?: string;
  onClose: () => void;
}

export function ConfirmSheetModal({ k, onClose }: ConfirmSheetModalProps) {
  const { t } = useTranslation();
  const { lang, signOut } = usePatient();
  const ref = useRef<HTMLDivElement>(null);

  const isWithdraw = k === 'withdraw';
  const title = isWithdraw
    ? lang === 'ml'
      ? 'സമ്മതം പിൻവലിക്കണോ?'
      : 'Withdraw your consent?'
    : t('patientProfile.signOutConfirmTitle');

  const body = isWithdraw
    ? lang === 'ml'
      ? 'നിങ്ങൾ സൈൻ ഔട്ട് ആകും, ആപ്പിൽ രേഖകൾ കാണാനാവില്ല. നിയമപ്രകാരമുള്ള മെഡിക്കൽ രേഖകൾ ഹോസ്പിറ്റൽ സൂക്ഷിക്കും. ചികിത്സയെ ഇത് ബാധിക്കില്ല.'
      : "You'll be signed out and won't see records in the app. ABC Hospital keeps medical records the law requires, and your treatment isn't affected."
    : t('patientProfile.signOutConfirmBody');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleConfirm = async () => {
    onClose();
    await signOut(
      isWithdraw
        ? lang === 'ml'
          ? 'സമ്മതം പിൻവലിച്ചു. നിങ്ങൾ സൈൻ ഔട്ട് ആയി.'
          : "Consent withdrawn. You've been signed out."
        : lang === 'ml'
        ? 'സൈൻ ഔട്ട് ചെയ്തു. നിങ്ങളുടെ രേഖകൾ ഈ ഉപകരണത്തിൽ നിന്ന് നീക്കം ചെയ്തു.'
        : 'Signed out. Your records were cleared from this device.'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center lg:p-6">
      <div className="scrim absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="sheet relative w-full lg:max-w-md bg-white rounded-t-3xl lg:rounded-3xl p-6 shadow-2xl z-10 outline-none"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {isWithdraw ? (
              <AlertTriangle className="text-[var(--lat)]" size={24} />
            ) : (
              <LogOut className="text-[var(--ink2)]" size={24} />
            )}
            <h2 className="disp text-xl font-bold text-[var(--ink)]">{title}</h2>
          </div>
          <button
            type="button"
            className="icon-btn press"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-[var(--ink2)] leading-relaxed mt-2">{body}</p>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            type="button"
            className="btn-p btn-sec press"
            onClick={onClose}
          >
            {t('patientProfile.cancel')}
          </button>
          <button
            type="button"
            className={`btn-p ${isWithdraw ? 'btn-danger' : 'btn-pri'} press`}
            onClick={handleConfirm}
          >
            {isWithdraw
              ? lang === 'ml'
                ? 'പിൻവലിക്കുക'
                : 'Withdraw'
              : t('patientProfile.signOut')}
          </button>
        </div>
      </div>
    </div>
  );
}
