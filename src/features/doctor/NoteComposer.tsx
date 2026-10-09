import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Plus,
  Trash2,
  BadgeCheck,
} from 'lucide-react';
import { apiFetch } from '../../lib/api-client';

const COMMON_DRUGS = [
  'Metformin ER 500mg',
  'Metformin ER 1000mg',
  'Telmisartan 40mg',
  'Telmisartan 80mg',
  'Atorvastatin 10mg',
  'Atorvastatin 20mg',
  'Amlodipine 5mg',
  'Glimepiride 1mg',
  'Glimepiride 2mg',
  'Paracetamol 650mg',
  'Pantoprazole 40mg',
  'Amoxicillin 500mg',
  'Penicillin V 250mg',
  'Augmentin 625mg',
];

const PENICILLIN_RELATED = ['penicillin', 'amoxicillin', 'ampicillin', 'augmentin', 'cloxacillin'];

export interface NoteComposerProps {
  patientId: string;
  patientName: string;
  uhid: string;
  allergies: Array<{ substance: string; reaction: string; severity: string }>;
  activeMeds: Array<{ id: string; drug: string; dose: string; instructions: string }>;
  onClose: () => void;
  onSigned: () => void;
}

export function NoteComposer({
  patientId,
  patientName,
  uhid,
  allergies,
  activeMeds,
  onClose,
  onSigned,
}: NoteComposerProps): React.JSX.Element {
  const { t } = useTranslation();
  const [step, setStep] = useState<number>(0);
  const [busy, setBusy] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 1: Note state
  const [vitals, setVitals] = useState({ sys: '138', dia: '88', pulse: '76', wt: '72.5' });
  const [reason, setReason] = useState('Glycemic review and exertion fatigue follow-up');
  const [findings, setFindings] = useState(
    'Fasting blood sugars elevated over past fortnight. BP 138/88 mmHg. Mild exertional palpitations noted. Chest clear.'
  );
  const [diagnoses, setDiagnoses] = useState([
    { name: 'Type 2 Diabetes Mellitus', active: true },
    { name: 'Essential Hypertension', active: true },
  ]);
  const [newDx, setNewDx] = useState('');
  const [customPlan] = useState('');

  // Step 2: Medicines state
  interface PrescribedMed {
    name: string;
    dose: string;
    timing: { morning: boolean; afternoon: boolean; night: boolean };
    food: 'after_food' | 'before_food';
  }
  const [prescriptions, setPrescriptions] = useState<PrescribedMed[]>([]);
  const [drugInput, setDrugInput] = useState('');
  const [doseInput, setDoseInput] = useState('');
  const [timingInput, setTimingInput] = useState({ morning: true, afternoon: false, night: true });
  const [foodInput, setFoodInput] = useState<'after_food' | 'before_food'>('after_food');

  // Step 3: Care plan state
  const [followUpWeeks, setFollowUpWeeks] = useState('4');
  const [testsDue, setTestsDue] = useState(['HbA1c', 'Lipid Profile']);
  const [dietNote, setDietNote] = useState('Limit rice to 1 cup per meal. Avoid processed sugar. 30 mins brisk walking daily.');
  const [selectedDietGuide, setSelectedDietGuide] = useState('e1111111-1111-1111-1111-111111111111');

  // Step 4: Sign state
  const [signAck, setSignAck] = useState(false);

  const stepsList = [
    t('doctorComposer.stepNote'),
    t('doctorComposer.stepMeds'),
    t('doctorComposer.stepPlan'),
    t('doctorComposer.stepSign'),
  ];

  const handleAddDiagnosis = () => {
    if (!newDx.trim()) return;
    if (!diagnoses.some((d) => d.name.toLowerCase() === newDx.trim().toLowerCase())) {
      setDiagnoses([...diagnoses, { name: newDx.trim(), active: true }]);
    }
    setNewDx('');
  };

  const checkAllergyConflict = (drug: string): { substance: string; reaction: string } | null => {
    const low = drug.toLowerCase();
    for (const a of allergies) {
      const aSub = a.substance.toLowerCase();
      if (low.includes(aSub)) return { substance: a.substance, reaction: a.reaction };
      if (aSub === 'penicillin' && PENICILLIN_RELATED.some((p) => low.includes(p))) {
        return { substance: a.substance, reaction: a.reaction };
      }
    }
    return null;
  };

  const checkDuplicate = (drug: string): boolean => {
    const low = drug.toLowerCase();
    return activeMeds.some((m) => m.drug.toLowerCase().includes(low) || low.includes(m.drug.toLowerCase()));
  };

  const handleAddPrescription = () => {
    if (!drugInput.trim()) return;
    setPrescriptions([
      ...prescriptions,
      {
        name: drugInput.trim(),
        dose: doseInput.trim() || 'As directed',
        timing: timingInput,
        food: foodInput,
      },
    ]);
    setDrugInput('');
    setDoseInput('');
  };

  const handleSignNote = async () => {
    if (!signAck || busy) return;
    setBusy(true);
    setErrorMsg(null);

    try {
      const dxSummary = diagnoses
        .filter((d) => d.active)
        .map((d) => d.name);

      const clinicalNotesText = `Vitals: BP ${vitals.sys}/${vitals.dia} mmHg, Pulse ${vitals.pulse}/min, Weight ${vitals.wt} kg.\n\nFindings: ${findings}\n\nPlan: ${
        customPlan || 'Continue oral anti-diabetic and antihypertensive therapy with strict dietary adherence.'
      }`;

      await apiFetch(`/api/doctor/patients/${patientId}/consultation`, {
        method: 'POST',
        body: JSON.stringify({
          reason,
          chiefComplaint: reason,
          clinicalNotes: clinicalNotesText,
          diagnoses: dxSummary,
          vitals: {
            sys: vitals.sys,
            dia: vitals.dia,
            pulse: vitals.pulse,
            wt: vitals.wt,
          },
          prescriptions: prescriptions.map((rx) => ({
            name: rx.name,
            drug: rx.name,
            dose: rx.dose,
            timing: rx.timing,
            food: rx.food,
          })),
          selectedDietGuide: selectedDietGuide || undefined,
          dietNote: dietNote || undefined,
        }),
      });

      setBusy(false);
      onSigned();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || (err instanceof Error ? err.message : 'Error signing note');
      setErrorMsg(msg);
      setBusy(false);
    }
  };

  const allergyConflict = checkAllergyConflict(drugInput);
  const dupConflict = checkDuplicate(drugInput);

  return (
    <div className="staff-theme">
      <aside className="composer" role="dialog" aria-modal="true" aria-label="Consultation Note Composer">
        <div className="zari-band" />

        {/* Composer Header */}
        <div className="cmp-head">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-[var(--leaf)] tracking-wider uppercase">
                {t('doctorComposer.todaysNote')}
              </span>
              <h2 className="text-xl font-bold text-[var(--ink)] truncate">{patientName}</h2>
              <span className="text-xs text-[var(--ink3)]">{uhid}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--ink3)] hover:bg-[var(--mist)] hover:text-[var(--ink)] transition-colors"
              aria-label="Close composer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Stepper Tabs */}
          <div className="steps mt-4" role="tablist">
            {stepsList.map((sName, idx) => {
              const isCurrent = step === idx;
              const isPast = step > idx;
              return (
                <button
                  key={sName}
                  type="button"
                  onClick={() => setStep(idx)}
                  className={`stp ${isCurrent ? 'on' : isPast ? 'ok' : ''}`}
                >
                  <i>{isPast ? <Check size={12} strokeWidth={3} /> : idx + 1}</i>
                  <span>{sName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Composer Body */}
        <div className="cmp-body">
          {errorMsg && (
            <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold">
              {errorMsg}
            </div>
          )}

          {/* STEP 0: NOTE */}
          {step === 0 && (
            <div className="flex flex-col gap-5">
              {allergies.length > 0 && (
                <div className="p-3 rounded-xl bg-[#FFF6E5] border border-[#F3D27A] flex items-center gap-2 text-sm font-bold text-[#76570F]">
                  <AlertTriangle size={18} className="flex-none text-[#C9A43B]" />
                  <span>
                    {t('doctorChart.allergicTo', {
                      allergies: allergies.map((a) => `${a.substance} (${a.reaction})`).join(', '),
                    })}
                  </span>
                </div>
              )}

              {/* Vitals Grid */}
              <div>
                <h3 className="text-sm font-bold text-[var(--ink2)] mb-2">
                  {t('doctorComposer.vitals')}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--ink3)] mb-1">
                      {t('doctorComposer.bpUpper')} (mmHg)
                    </label>
                    <input
                      type="number"
                      value={vitals.sys}
                      onChange={(e) => setVitals({ ...vitals, sys: e.target.value })}
                      className="w-full h-11 px-3 bg-white rounded-xl border border-[var(--line)] font-bold text-[var(--ink)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--ink3)] mb-1">
                      {t('doctorComposer.bpLower')} (mmHg)
                    </label>
                    <input
                      type="number"
                      value={vitals.dia}
                      onChange={(e) => setVitals({ ...vitals, dia: e.target.value })}
                      className="w-full h-11 px-3 bg-white rounded-xl border border-[var(--line)] font-bold text-[var(--ink)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--ink3)] mb-1">
                      {t('doctorComposer.pulse')} (/min)
                    </label>
                    <input
                      type="number"
                      value={vitals.pulse}
                      onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })}
                      className="w-full h-11 px-3 bg-white rounded-xl border border-[var(--line)] font-bold text-[var(--ink)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--ink3)] mb-1">
                      {t('doctorComposer.weight')} (kg)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={vitals.wt}
                      onChange={(e) => setVitals({ ...vitals, wt: e.target.value })}
                      className="w-full h-11 px-3 bg-white rounded-xl border border-[var(--line)] font-bold text-[var(--ink)]"
                    />
                  </div>
                </div>
              </div>

              {/* Reason for Visit */}
              <div>
                <label className="block text-sm font-bold text-[var(--ink2)] mb-1">
                  {t('doctorComposer.reasonForVisit')}
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full h-11 px-3 bg-white rounded-xl border border-[var(--line)] text-sm font-semibold text-[var(--ink)]"
                />
              </div>

              {/* Clinical Findings */}
              <div>
                <label className="block text-sm font-bold text-[var(--ink2)] mb-1">
                  {t('doctorComposer.findings')}
                </label>
                <textarea
                  rows={3}
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                  className="w-full p-3 bg-white rounded-xl border border-[var(--line)] text-sm text-[var(--ink)]"
                />
              </div>

              {/* Diagnoses Chips */}
              <div>
                <label className="block text-sm font-bold text-[var(--ink2)] mb-2">
                  {t('doctorComposer.diagnoses')}
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {diagnoses.map((dx, i) => (
                    <button
                      key={dx.name}
                      type="button"
                      onClick={() => {
                        const cur = diagnoses[i];
                        if (cur) {
                          const copy = [...diagnoses];
                          copy[i] = { name: cur.name, active: !cur.active };
                          setDiagnoses(copy);
                        }
                      }}
                      className={`chip ${dx.active ? 'on' : ''}`}
                    >
                      {dx.active && <Check size={14} />}
                      <span>{dx.name}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t('doctorComposer.addDiagnosis')}
                    value={newDx}
                    onChange={(e) => setNewDx(e.target.value)}
                    className="flex-1 h-10 px-3 bg-white rounded-xl border border-[var(--line)] text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddDiagnosis}
                    className="btn btn-tint btn-sm"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: MEDICINES */}
          {step === 1 && (
            <div className="flex flex-col gap-6">
              {/* Existing active medicines */}
              <div>
                <h3 className="text-sm font-bold text-[var(--ink2)] mb-2">
                  {t('doctorComposer.currentMedicines')}
                </h3>
                <div className="flex flex-col gap-2">
                  {activeMeds.map((m) => (
                    <div key={m.id} className="p-3 bg-white rounded-xl border border-[var(--line)] flex items-center justify-between">
                      <div>
                        <b className="block text-sm text-[var(--ink)]">{m.drug} {m.dose}</b>
                        <span className="text-xs text-[var(--ink3)]">{m.instructions}</span>
                      </div>
                      <span className="tag tag-leaf">Active</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Prescription */}
              <div className="p-4 bg-[var(--leaft)] rounded-2xl border border-[rgba(31,107,79,0.2)] flex flex-col gap-3">
                <h3 className="text-sm font-bold text-[var(--leafd)]">
                  {t('doctorComposer.addMedicine')}
                </h3>

                <div>
                  <input
                    type="text"
                    list="drug-suggestions"
                    placeholder="Search or enter medicine name..."
                    value={drugInput}
                    onChange={(e) => setDrugInput(e.target.value)}
                    className="w-full h-11 px-3 bg-white rounded-xl border border-[var(--line)] text-sm font-semibold text-[var(--ink)]"
                  />
                  <datalist id="drug-suggestions">
                    {COMMON_DRUGS.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>

                {/* Automatic Allergy Detection Alert */}
                {allergyConflict && (
                  <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle size={18} className="text-rose-600 flex-none" />
                    <span>
                      {t('doctorComposer.allergyAlert', {
                        substance: allergyConflict.substance,
                        reaction: allergyConflict.reaction,
                      })}
                    </span>
                  </div>
                )}

                {/* Duplicate Active Drug Warning */}
                {dupConflict && (
                  <div className="p-3 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-600 flex-none" />
                    <span>
                      {t('doctorComposer.duplicateAlert', {
                        drug: drugInput,
                        dose: 'active',
                      })}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--ink2)] mb-1">
                      {t('doctorComposer.dose')}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 500 mg"
                      value={doseInput}
                      onChange={(e) => setDoseInput(e.target.value)}
                      className="w-full h-10 px-3 bg-white rounded-xl border border-[var(--line)] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--ink2)] mb-1">
                      {t('doctorComposer.withFood')}
                    </label>
                    <select
                      value={foodInput}
                      onChange={(e) => setFoodInput(e.target.value as 'after_food' | 'before_food')}
                      className="w-full h-10 px-3 bg-white rounded-xl border border-[var(--line)] text-sm"
                    >
                      <option value="after_food">{t('doctorComposer.afterFood')}</option>
                      <option value="before_food">{t('doctorComposer.beforeFood')}</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex gap-2 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setTimingInput({ ...timingInput, morning: !timingInput.morning })}
                      className={`px-2.5 py-1 rounded-lg border ${
                        timingInput.morning ? 'bg-[var(--leaf)] text-white border-[var(--leaf)]' : 'bg-white text-[var(--ink2)]'
                      }`}
                    >
                      Morning
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimingInput({ ...timingInput, afternoon: !timingInput.afternoon })}
                      className={`px-2.5 py-1 rounded-lg border ${
                        timingInput.afternoon ? 'bg-[var(--leaf)] text-white border-[var(--leaf)]' : 'bg-white text-[var(--ink2)]'
                      }`}
                    >
                      Noon
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimingInput({ ...timingInput, night: !timingInput.night })}
                      className={`px-2.5 py-1 rounded-lg border ${
                        timingInput.night ? 'bg-[var(--leaf)] text-white border-[var(--leaf)]' : 'bg-white text-[var(--ink2)]'
                      }`}
                    >
                      Night
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddPrescription}
                    disabled={!drugInput.trim()}
                    className="btn btn-pri btn-sm"
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>
              </div>

              {/* Newly Added Prescriptions */}
              {prescriptions.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-[var(--ink3)] mb-2 uppercase tracking-wide">
                    New Prescriptions for This Visit
                  </h4>
                  <div className="flex flex-col gap-2">
                    {prescriptions.map((rx, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white rounded-xl border border-[var(--line)] flex items-center justify-between"
                      >
                        <div>
                          <b className="block text-sm text-[var(--ink)]">
                            {rx.name} {rx.dose}
                          </b>
                          <span className="text-xs text-[var(--ink2)]">
                            {rx.timing.morning ? '1' : '0'}-{rx.timing.afternoon ? '1' : '0'}-{rx.timing.night ? '1' : '0'} • {rx.food === 'after_food' ? 'After food' : 'Before food'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPrescriptions(prescriptions.filter((_, j) => j !== idx))}
                          className="text-rose-500 p-1 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: CARE PLAN */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              {/* Follow-up selection */}
              <div>
                <label className="block text-sm font-bold text-[var(--ink2)] mb-2">
                  {t('doctorComposer.followUp')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    ['2', '2 weeks'],
                    ['4', '4 weeks'],
                    ['6', '6 weeks'],
                    ['12', '3 months'],
                  ].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        if (val) setFollowUpWeeks(val);
                      }}
                      className={`chip ${followUpWeeks === val ? 'on' : ''}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tests before next visit */}
              <div>
                <label className="block text-sm font-bold text-[var(--ink2)] mb-2">
                  {t('doctorComposer.testsBeforeNext')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {['HbA1c', 'Lipid Profile', 'Fasting Blood Sugar', 'Echocardiogram (2D Echo)', 'Serum Creatinine'].map((tName) => {
                    const isSelected = testsDue.includes(tName);
                    return (
                      <button
                        key={tName}
                        type="button"
                        onClick={() => {
                          if (isSelected) setTestsDue(testsDue.filter((x) => x !== tName));
                          else setTestsDue([...testsDue, tName]);
                        }}
                        className={`chip ${isSelected ? 'on' : ''}`}
                      >
                        {isSelected && <Check size={14} />}
                        <span>{tName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Diet Guidance Attachment */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-amber-950">
                    {t('doctorChart.dietAdvice')}
                  </h4>
                  <span className="text-xs bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                    Hospital Guide
                  </span>
                </div>
                <p className="text-xs text-amber-800 mb-3">
                  Attach an approved hospital nutrition guide to the patient's care plan.
                </p>
                <select
                  value={selectedDietGuide}
                  onChange={(e) => setSelectedDietGuide(e.target.value)}
                  className="w-full h-10 px-3 bg-white rounded-xl border border-amber-300 text-sm font-semibold text-amber-950 mb-3"
                >
                  <option value="e1111111-1111-1111-1111-111111111111">Diabetes Diet Guidance (Kerala)</option>
                  <option value="e2222222-2222-2222-2222-222222222222">Low-Salt Blood Pressure Diet</option>
                  <option value="e3333333-3333-3333-3333-333333333333">Heart-Healthy Dietary Guide</option>
                </select>

                <label className="block text-xs font-bold text-amber-900 mb-1">
                  Doctor's Specific Diet Notes:
                </label>
                <textarea
                  rows={2}
                  value={dietNote}
                  onChange={(e) => setDietNote(e.target.value)}
                  className="w-full p-2.5 bg-white rounded-xl border border-amber-300 text-xs text-amber-950"
                />
              </div>
            </div>
          )}

          {/* STEP 3: SIGN */}
          {step === 3 && (
            <div className="flex flex-col gap-5">
              <div className="p-4 bg-[var(--paper)] rounded-2xl border border-[var(--line)] flex flex-col gap-3">
                <h3 className="text-sm font-bold text-[var(--ink)]">
                  {t('doctorComposer.theNote')} Summary
                </h3>
                <div className="text-xs text-[var(--ink2)] leading-relaxed space-y-1.5">
                  <p>
                    <b className="text-[var(--ink)]">Vitals:</b> BP {vitals.sys}/{vitals.dia} mmHg, Pulse {vitals.pulse}/min, Weight {vitals.wt} kg
                  </p>
                  <p>
                    <b className="text-[var(--ink)]">Reason:</b> {reason}
                  </p>
                  <p>
                    <b className="text-[var(--ink)]">Diagnoses:</b>{' '}
                    {diagnoses.filter((d) => d.active).map((d) => d.name).join(', ')}
                  </p>
                  {prescriptions.length > 0 && (
                    <p>
                      <b className="text-[var(--ink)]">New Medicines:</b>{' '}
                      {prescriptions.map((rx) => `${rx.name} ${rx.dose}`).join('; ')}
                    </p>
                  )}
                  <p>
                    <b className="text-[var(--ink)]">Follow-up:</b> In {followUpWeeks} weeks
                  </p>
                </div>
              </div>

              {/* Doctor Digital Signature Confirmation */}
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--leaf)] text-white font-bold flex items-center justify-center">
                    RM
                  </div>
                  <div>
                    <b className="block text-sm text-[var(--ink)]">Dr. Rahul Menon</b>
                    <span className="text-xs text-[var(--ink3)]">KMC Reg: 48291 • General Medicine</span>
                  </div>
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={signAck}
                    onChange={(e) => setSignAck(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded text-[var(--leaf)] border-gray-300 focus:ring-[var(--leaf)]"
                  />
                  <span className="text-xs font-semibold text-[var(--ink)] leading-snug">
                    {t('doctorComposer.signConfirmation')}
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Composer Footer Navigation */}
        <div className="cmp-foot">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="btn btn-sec btn-sm"
            >
              <ChevronLeft size={16} /> {t('doctorComposer.back')}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost btn-sm text-rose-600"
            >
              {t('doctorComposer.discard')}
            </button>
          )}

          <div className="flex-1" />

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="btn btn-pri btn-sm"
            >
              {t('doctorComposer.next', { step: stepsList[step + 1] })} <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              disabled={!signAck || busy}
              onClick={handleSignNote}
              className="btn btn-pri btn-sm"
            >
              {busy ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing...
                </>
              ) : (
                <>
                  <BadgeCheck size={16} /> {t('doctorComposer.signNote')}
                </>
              )}
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
