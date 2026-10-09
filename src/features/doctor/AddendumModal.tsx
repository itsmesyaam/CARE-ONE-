import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Lock, BadgeCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const DR_RAHUL_STAFF_ID = 'b0000000-0000-0000-0000-000000000003';

export interface AddendumModalProps {
  encounterId: string;
  patientId: string;
  encounterDate: string;
  doctorName: string;
  onClose: () => void;
  onSaved: () => void;
}

export function AddendumModal({
  encounterId,
  patientId,
  encounterDate,
  doctorName,
  onClose,
  onSaved,
}: AddendumModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const [kind, setKind] = useState<'Wrong detail' | 'Missing detail' | 'Other'>('Wrong detail');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 5 || busy) return;

    setBusy(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.from('encounter_addenda').insert({
        encounter_id: encounterId,
        patient_id: patientId,
        doctor_id: DR_RAHUL_STAFF_ID,
        reason: kind,
        notes: text.trim(),
      });

      if (error) throw error;
      setBusy(false);
      onSaved();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error saving addendum');
      setBusy(false);
    }
  };

  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Add Addendum">
      <div className="sheet-panel p-6 sm:p-8">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--ink)]">
              {t('doctorChart.addCorrection')}
            </h2>
            <p className="text-xs text-[var(--ink3)] mt-0.5">
              Original consultation note from {encounterDate} ({doctorName})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--ink3)] hover:bg-[var(--mist)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="lock-note mb-5">
          <Lock size={16} className="flex-none mt-0.5 text-[var(--ink2)]" />
          <span className="text-xs leading-relaxed">
            {t('doctorChart.signedNotesLock')}
          </span>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-xs font-bold text-[var(--ink2)] mb-2">
              {t('doctorChart.correctionKind')}
            </label>
            <div className="flex flex-wrap gap-2">
              {(['Wrong detail', 'Missing detail', 'Other'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`chip ${kind === k ? 'on' : ''}`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--ink2)] mb-1">
              {t('doctorChart.correctionDetails')}
            </label>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('doctorChart.correctionPh')}
              className="w-full p-3 bg-white rounded-xl border border-[var(--line)] text-sm text-[var(--ink)]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-sec btn-sm"
            >
              {t('doctorAccount.cancel')}
            </button>
            <button
              type="submit"
              disabled={text.trim().length < 5 || busy}
              className="btn btn-pri btn-sm"
            >
              {busy ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing...
                </>
              ) : (
                <>
                  <BadgeCheck size={16} /> {t('doctorChart.signCorrection')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
