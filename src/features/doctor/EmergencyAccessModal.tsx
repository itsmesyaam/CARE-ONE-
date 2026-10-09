import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, Timer, X } from 'lucide-react';
import { GLASS_QUICK_REASONS } from './mock';

export interface EmergencyAccessModalProps {
  patient: {
    id: string;
    name: string;
    mrn: string;
    phone?: string;
    owner?: string;
    dept?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onGrant: (patientId: string, reason: string) => void;
}

export function EmergencyAccessModal({
  patient,
  isOpen,
  onClose,
  onGrant,
}: EmergencyAccessModalProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const [why, setWhy] = useState('');
  const [ok, setOk] = useState(false);

  // 4 hours expiration window
  const [expirationTime] = useState(() => new Date(Date.now() + 4 * 3600 * 1000));
  const untilFormatted = expirationTime.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  const valid = why.trim().length >= 10 && ok;

  if (!isOpen) return null;

  const handleGrant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onGrant(patient.id, why.trim());
  };

  const initials = patient.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-modal-title"
    >
      <div className="staff-theme w-full max-w-lg rounded-[24px] bg-white p-6 shadow-2xl border border-[var(--line)] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
          <div className="flex items-center gap-2 text-[var(--lat)] font-bold text-lg">
            <ShieldAlert size={22} />
            <h2 id="emergency-modal-title" className="text-xl font-bold text-[var(--ink)]">
              {t('emergencyModal.title')}
            </h2>
          </div>
          <button
            type="button"
            className="icon-btn p-1.5 rounded-full hover:bg-[var(--mist)] text-[var(--ink3)] hover:text-[var(--ink)]"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Patient Identity */}
        <div className="flex items-center gap-3.5 mt-4 p-3 rounded-2xl bg-[var(--mist)]">
          <span
            className="rounded-full flex items-center justify-center font-bold select-none shrink-0 bg-[var(--leaft)] text-[var(--leafd)]"
            style={{ width: 44, height: 44, fontSize: 16 }}
            aria-hidden="true"
          >
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <b className="block text-base text-[var(--ink)] truncate">{patient.name}</b>
            <span className="block text-sm text-[var(--ink3)] truncate">
              {t('emergencyModal.underDoctor', {
                mrn: patient.mrn,
                doctor: patient.owner || 'Attending Physician',
                dept: patient.dept || 'Department',
              })}
            </span>
          </div>
        </div>

        {/* DPDP Statutory Warning */}
        <div className="warn mt-4" role="note">
          <ShieldAlert size={20} className="flex-none text-[var(--lat)] mt-0.5" />
          <p className="text-sm leading-relaxed text-[#6B2417] font-medium">
            {t('emergencyModal.warning')}
          </p>
        </div>

        {/* Emergency Reason Form */}
        <form onSubmit={handleGrant} className="mt-5">
          <label
            htmlFor="emergency-reason"
            className="block text-sm font-bold text-[var(--ink)] mb-1.5"
          >
            {t('emergencyModal.reason')}
          </label>
          <textarea
            id="emergency-reason"
            rows={3}
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            placeholder={t('emergencyModal.reasonPh')}
            className="w-full rounded-xl border border-[var(--line)] p-3 text-base text-[var(--ink)] focus:outline-none focus:border-[var(--leaf)] focus:ring-1 focus:ring-[var(--leaf)]"
          />
          <p className="mt-1 text-xs text-[var(--ink3)]">{t('emergencyModal.reasonHint')}</p>

          {/* Quick Preset Reason Chips */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {GLASS_QUICK_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                className={`chip press text-xs ${why === reason ? 'on' : ''}`}
                onClick={() => setWhy(reason)}
              >
                {reason}
              </button>
            ))}
          </div>

          {/* Duration info */}
          <p className="flex items-center gap-2 text-sm text-[var(--ink2)] mt-5">
            <Timer size={16} className="flex-none text-[var(--ink3)]" />
            <span>{t('emergencyModal.endsAt', { time: untilFormatted })}</span>
          </p>

          {/* Acknowledgment Checkbox */}
          <label className="check mt-4" htmlFor="emergency-ack">
            <input
              id="emergency-ack"
              type="checkbox"
              checked={ok}
              onChange={(e) => setOk(e.target.checked)}
            />
            <span className="text-sm font-semibold text-[var(--ink)]">
              {t('emergencyModal.ackCheckbox')}
            </span>
          </label>

          {/* Submit Action */}
          <button type="submit" disabled={!valid} className="btn btn-danger w-full mt-6">
            <ShieldAlert size={18} />
            {t('emergencyModal.submitBtn')}
          </button>
        </form>
      </div>
    </div>
  );
}
