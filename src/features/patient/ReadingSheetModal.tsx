import React, { useState, useEffect, useRef } from 'react';
import { X, HeartPulse, Droplet, Scale, Info, AlertTriangle, ShieldCheck } from 'lucide-react';
import { usePatient, isReadingHigh } from './PatientContext';

interface ReadingSheetModalProps {
  onClose: () => void;
  k0?: string;
}

interface NumFieldProps {
  id: string;
  label: string;
  v: string;
  set: (val: string) => void;
  unit: string;
  big?: boolean;
  step?: string;
  placeholder?: string;
}

function NumField({ id, label, v, set, unit, big, step, placeholder }: NumFieldProps) {
  return (
    <div>
      <label className="lbl" htmlFor={id}>
        {label}
      </label>
      <div className="field">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step || '1'}
          value={v}
          placeholder={placeholder}
          onChange={e => set(e.target.value)}
          className={big ? 'num-big' : ''}
        />
        <span className="text-[var(--ink3)] text-sm font-semibold flex-none ml-2">{unit}</span>
      </div>
    </div>
  );
}

export function ReadingSheetModal({ onClose, k0 }: ReadingSheetModalProps): React.JSX.Element {
  const { lang, d, addReading } = usePatient();
  const [k, setK] = useState<string>(k0 && k0 !== 'a1c' ? k0 : 'bp');
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [pulse, setPulse] = useState('');
  const [ctx, setCtx] = useState<'fasting' | 'afterMeal' | 'random'>('fasting');
  const [when, setWhen] = useState<'now' | 'earlier'>('now');
  const [tm, setTm] = useState('07:30');

  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    sheetRef.current?.focus();
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const n1 = parseFloat(a);
  const n2 = parseFloat(b);

  const valid =
    k === 'bp'
      ? !isNaN(n1) && !isNaN(n2) && n1 >= 60 && n1 <= 260 && n2 >= 30 && n2 <= 160 && n1 > n2
      : k === 'sugar'
      ? !isNaN(n1) && n1 >= 20 && n1 <= 600
      : !isNaN(n1) && n1 >= 2 && n1 <= 300;

  const filled = k === 'bp' ? a.trim() !== '' && b.trim() !== '' : a.trim() !== '';
  const v: number | [number, number] = k === 'bp' ? [n1, n2] : n1;

  const tg = d.tg[k as keyof typeof d.tg] || (k === 'weight' ? 'below 68 kg' : '');
  const high = valid && !!tg && (k !== 'sugar' || ctx === 'fasting') && isReadingHigh(k, v);

  const metricOptions: Array<{ id: string; label: string; icon: React.ElementType }> = [
    { id: 'bp', label: lang === 'ml' ? 'രക്തസമ്മർദ്ദം' : 'Blood pressure', icon: HeartPulse },
    { id: 'sugar', label: lang === 'ml' ? 'ഷുഗർ' : 'Blood sugar', icon: Droplet },
    { id: 'weight', label: lang === 'ml' ? 'ശരീരഭാരം' : 'Weight', icon: Scale },
  ];

  const handleSave = () => {
    if (!valid) return;
    addReading(k, v, k === 'sugar' ? ctx : null);
    onClose();
  };

  const getTargetGuidance = () => {
    if (k === 'bp') {
      return lang === 'ml'
        ? `ഡോക്ടറുടെ ലക്ഷ്യം: ${d.tg.bp || '< 130/80 mmHg'} (${d.doc} നിർദ്ദേശിച്ചത്)`
        : `Prescribed target: ${d.tg.bp || '< 130/80 mmHg'} set by ${d.doc}`;
    }
    if (k === 'sugar') {
      return lang === 'ml'
        ? `ഡോക്ടറുടെ ലക്ഷ്യം: ${d.tg.sugar || 'വെറുംവയറ്റിൽ 80-130 mg/dL'} (${d.doc})`
        : `Prescribed target: ${d.tg.sugar || '80 to 130 mg/dL before breakfast'} (${d.doc})`;
    }
    return lang === 'ml'
      ? `ഡോക്ടറുടെ ലക്ഷ്യം: 68 കിലോഗ്രാമിൽ താഴെ (${d.doc})`
      : `Prescribed target: Below 68 kg (${d.doc})`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center lg:p-6">
      {/* Background scrim */}
      <div className="scrim absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      {/* Modal Dialog Content */}
      <div
        ref={sheetRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={lang === 'ml' ? 'റീഡിംഗ് രേഖപ്പെടുത്തുക' : 'Log reading'}
        className="sheet relative w-full lg:max-w-lg bg-white rounded-t-3xl lg:rounded-3xl p-5 lg:p-7 shadow-2xl z-10 max-h-[92vh] overflow-y-auto outline-none"
      >
        <div className="grab lg:hidden mx-auto mb-2 w-12 h-1.5 bg-neutral-300 rounded-full" />

        {/* Modal Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="disp text-xl lg:text-2xl font-bold text-[var(--ink)]">
            {lang === 'ml' ? 'റീഡിംഗ് രേഖപ്പെടുത്തുക' : 'Log a reading'}
          </h2>
          <button
            type="button"
            className="icon-btn press"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Metric Selector (Seg) */}
        <div className="seg" role="radiogroup" aria-label={lang === 'ml' ? 'റീഡിംഗ് തരം' : 'Reading type'}>
          {metricOptions.map(opt => {
            const Icon = opt.icon;
            const isSelected = k === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={opt.label}
                className={isSelected ? 'on' : ''}
                onClick={() => {
                  setK(opt.id);
                  setA('');
                  setB('');
                  setPulse('');
                }}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Icon size={16} />
                  <span>{opt.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Form Fields: BP */}
        {k === 'bp' && (
          <div className="mt-6">
            <div className="grid grid-cols-2 gap-3">
              <NumField
                id="sys"
                label={lang === 'ml' ? 'മുകളിലെ (systolic)' : 'Upper (systolic)'}
                v={a}
                set={setA}
                unit="mmHg"
                placeholder="120"
              />
              <NumField
                id="dia"
                label={lang === 'ml' ? 'താഴത്തെ (diastolic)' : 'Lower (diastolic)'}
                v={b}
                set={setB}
                unit="mmHg"
                placeholder="80"
              />
            </div>
            <div className="mt-4">
              <NumField
                id="pul"
                label={lang === 'ml' ? 'പൾസ് (ഓപ്ഷണൽ)' : 'Pulse (optional)'}
                v={pulse}
                set={setPulse}
                unit="/min"
                placeholder="72"
              />
            </div>
            <p className="text-xs sm:text-sm text-[var(--ink3)] mt-3 flex items-start gap-2">
              <Info size={16} className="flex-none mt-0.5 text-[var(--ink2)]" />
              <span>
                {lang === 'ml'
                  ? 'അളക്കുന്നതിന് മുമ്പ് 5 മിനിറ്റ് വിശ്രമിക്കുക.'
                  : 'Sit and rest for 5 minutes before you measure.'}
              </span>
            </p>
          </div>
        )}

        {/* Form Fields: Sugar */}
        {k === 'sugar' && (
          <div className="mt-6">
            <NumField
              id="sg"
              label={lang === 'ml' ? 'ഷുഗർ അളവ്' : 'Sugar level'}
              v={a}
              set={setA}
              unit="mg/dL"
              big
              placeholder="110"
            />
            <p className="lbl mt-5">
              {lang === 'ml' ? 'എപ്പോൾ എടുത്തു?' : 'When was it taken?'}
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['fasting', lang === 'ml' ? 'വെറുംവയറ്റിൽ' : 'Fasting'],
                  ['afterMeal', lang === 'ml' ? 'ഭക്ഷണത്തിന് 2 മണിക്കൂർ ശേഷം' : '2 hrs after food'],
                  ['random', lang === 'ml' ? 'മറ്റ് സമയം' : 'Random / other'],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  className={`chip press ${ctx === val ? 'on' : ''}`}
                  aria-pressed={ctx === val}
                  onClick={() => setCtx(val)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form Fields: Weight */}
        {k === 'weight' && (
          <div className="mt-6">
            <NumField
              id="wt"
              label={lang === 'ml' ? 'ഭാരം' : 'Weight'}
              v={a}
              set={setA}
              unit="kg"
              big
              step="0.1"
              placeholder="68.0"
            />
          </div>
        )}

        {/* Timing Selector */}
        <p className="lbl mt-6">
          {lang === 'ml' ? 'എപ്പോൾ' : 'When'}
        </p>
        <div className="seg" role="radiogroup" aria-label={lang === 'ml' ? 'എപ്പോൾ' : 'When'}>
          {(
            [
              ['now', lang === 'ml' ? 'ഇപ്പോൾ' : 'Now'],
              ['earlier', lang === 'ml' ? 'ഇന്ന് നേരത്തെ' : 'Earlier today'],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              role="radio"
              aria-checked={when === val}
              aria-label={label}
              className={when === val ? 'on' : ''}
              onClick={() => setWhen(val)}
            >
              {label}
            </button>
          ))}
        </div>

        {when === 'earlier' && (
          <div className="field mt-3">
            <input
              type="time"
              value={tm}
              onChange={e => setTm(e.target.value)}
              aria-label={lang === 'ml' ? 'സമയം' : 'Time taken'}
            />
          </div>
        )}

        {/* Implausible Error Banner */}
        {filled && !valid && (
          <p className="err mt-4" role="alert">
            <AlertTriangle size={18} className="flex-none mt-0.5 text-[var(--lat)]" />
            <span>
              {lang === 'ml'
                ? 'ഈ നമ്പർ പരിശോധിക്കുക. ഈ അളവിന് ഇത് അസാധാരണമായി തോന്നുന്നു.'
                : 'Check this number. It looks unusual for this reading.'}
            </span>
          </p>
        )}

        {/* Elevated / Out of Target Warning */}
        {high && (
          <div className="warn mt-4" role="status">
            <AlertTriangle size={20} className="flex-none text-[var(--lat)] mt-0.5" />
            <p className="text-sm">
              {lang === 'ml'
                ? `${d.doc} നിശ്ചയിച്ച ലക്ഷ്യ പരിധിക്ക് (${tg}) പുറത്താണ് ഇത്. ഡോക്ടറുടെ ശ്രദ്ധയിൽപ്പെടുത്തും. അസ്വസ്ഥത തോന്നിയാൽ 112-ലോ കാഷ്വാലിറ്റിയിലോ വിളിക്കുക.`
                : `This is outside the target ${d.doc} set (${tg}). It will be flagged for your doctor. If you feel unwell, call casualty or 112.`}
            </p>
          </div>
        )}

        {/* Target Guidance Card */}
        <div className="lock-note mt-5" role="note">
          <ShieldCheck size={18} className="flex-none mt-0.5 text-[var(--ink2)]" />
          <span className="text-xs sm:text-sm text-[var(--ink2)] font-medium">
            {getTargetGuidance()}
          </span>
        </div>

        {/* Save Button */}
        <button
          type="button"
          className="btn-p btn-pri press w-full mt-6 shadow-sm"
          disabled={!valid}
          onClick={handleSave}
        >
          <span>{lang === 'ml' ? 'സേവ് ചെയ്യുക' : 'Save reading'}</span>
        </button>
      </div>
    </div>
  );
}
