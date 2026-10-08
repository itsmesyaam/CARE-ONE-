import React, { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, Phone, Check } from 'lucide-react';
import { usePatient } from './PatientContext';

interface SymptomSheetModalProps {
  onClose: () => void;
}

export function SymptomSheetModal({ onClose }: SymptomSheetModalProps): React.JSX.Element {
  const { lang, addSymptom } = usePatient();
  const [sel, setSel] = useState<string[]>([]);
  const [txt, setTxt] = useState('');
  const [since, setSince] = useState<'today' | 'yesterday' | 'days23' | 'week'>('today');
  const [sev, setSev] = useState<'mild' | 'moderate' | 'severe'>('mild');

  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    sheetRef.current?.focus();
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const red = sel.includes('chest') || sel.includes('breath') || sev === 'severe';

  const toggleSymptom = (s: string) => {
    setSel(prev => (prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]));
  };

  const symptomList: Array<{ id: string; en: string; ml: string }> = [
    { id: 'dizzy', en: 'Dizziness', ml: 'തലകറക്കം' },
    { id: 'headache', en: 'Headache', ml: 'തലവേദന' },
    { id: 'breath', en: 'Breathlessness', ml: 'ശ്വാസംമുട്ടൽ' },
    { id: 'chest', en: 'Chest pain', ml: 'നെഞ്ചുവേദന' },
    { id: 'swelling', en: 'Swollen feet', ml: 'കാലിൽ നീര്' },
    { id: 'tired', en: 'Tiredness', ml: 'ക്ഷീണം' },
    { id: 'fever', en: 'Fever', ml: 'പനി' },
    { id: 'otherS', en: 'Something else', ml: 'മറ്റെന്തെങ്കിലും' },
  ];

  const onsetList: Array<{ id: 'today' | 'yesterday' | 'days23' | 'week'; en: string; ml: string }> = [
    { id: 'today', en: 'Today', ml: 'ഇന്ന്' },
    { id: 'yesterday', en: 'Yesterday', ml: 'ഇന്നലെ' },
    { id: 'days23', en: '2 to 3 days ago', ml: '2-3 ദിവസം മുമ്പ്' },
    { id: 'week', en: 'Over a week', ml: 'ഒരാഴ്ചയിലേറെ' },
  ];

  const severityOptions: Array<{ id: 'mild' | 'moderate' | 'severe'; en: string; ml: string }> = [
    { id: 'mild', en: 'Mild', ml: 'നേരിയത്' },
    { id: 'moderate', en: 'Moderate', ml: 'മിതമായത്' },
    { id: 'severe', en: 'Severe', ml: 'കഠിനമായത്' },
  ];

  const handleSubmit = () => {
    if (!sel.length && !txt.trim()) return;
    addSymptom({ sel, txt, sev, since });
    onClose();
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
        aria-label={lang === 'ml' ? 'ലക്ഷണം അറിയിക്കുക' : 'Tell us a symptom'}
        className="sheet relative w-full lg:max-w-lg bg-white rounded-t-3xl lg:rounded-3xl p-5 lg:p-7 shadow-2xl z-10 max-h-[92vh] overflow-y-auto outline-none"
      >
        <div className="grab lg:hidden mx-auto mb-2 w-12 h-1.5 bg-neutral-300 rounded-full" />

        {/* Modal Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="disp text-xl lg:text-2xl font-bold text-[var(--ink)]">
            {lang === 'ml' ? 'ലക്ഷണം അറിയിക്കുക' : 'Tell us a symptom'}
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

        {/* Emergency SOS Callout */}
        <div className="sos flex gap-3">
          <AlertTriangle size={22} className="flex-none text-[var(--lat)] mt-0.5" />
          <div className="flex-1">
            <b className="block text-[var(--lat)] font-bold text-base leading-tight">
              {lang === 'ml'
                ? 'ഈ ഫോം 24 മണിക്കൂറും നിരീക്ഷിക്കുന്നില്ല.'
                : "This form isn't watched around the clock."}
            </b>
            <p className="text-xs sm:text-sm mt-1 leading-snug text-[#6B2417]">
              {lang === 'ml'
                ? 'അടിയന്തര സാഹചര്യത്തിൽ 112-ലോ ABC കാഷ്വാലിറ്റിയിലോ (0484 000 0112) വിളിക്കുക.'
                : 'In an emergency, call 112 or ABC casualty on 0484 000 0112.'}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <a
                className="btn-p btn-sm btn-danger press inline-flex items-center gap-1.5 shadow-sm text-sm"
                href="tel:112"
              >
                <Phone size={16} />
                <span>{lang === 'ml' ? '112 വിളിക്കുക' : 'Call 112'}</span>
              </a>
              <a
                className="btn-p btn-sm btn-sec press inline-flex items-center gap-1.5 text-sm"
                href="tel:04840000112"
              >
                <Phone size={16} />
                <span>{lang === 'ml' ? 'കാഷ്വാലിറ്റി വിളിക്കുക' : 'Call ABC casualty'}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Symptom Selection Chips */}
        <p className="lbl mt-6">
          {lang === 'ml' ? 'എന്താണ് അനുഭവപ്പെടുന്നത്?' : 'What are you feeling?'}
        </p>
        <div className="flex flex-wrap gap-2">
          {symptomList.map(s => {
            const isSelected = sel.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                className={`chip press ${isSelected ? 'on' : ''}`}
                aria-pressed={isSelected}
                onClick={() => toggleSymptom(s.id)}
              >
                {isSelected && <Check size={16} className="inline mr-1" />}
                <span>{lang === 'ml' ? s.ml : s.en}</span>
              </button>
            );
          })}
        </div>

        {/* Red Flag Warning */}
        {red && (
          <div className="warn mt-4" role="alert">
            <AlertTriangle size={20} className="flex-none text-[var(--lat)] mt-0.5" />
            <p className="font-semibold text-sm leading-snug">
              {lang === 'ml'
                ? 'നെഞ്ചുവേദന, ശ്വാസതടസ്സം, കഠിനമായ ലക്ഷണങ്ങൾ അടിയന്തര സാഹചര്യമാകാം. മറുപടിക്ക് കാത്തിരിക്കാതെ ഉടൻ 112-ലോ കാഷ്വാലിറ്റിയിലോ വിളിക്കുക.'
                : "Chest pain, trouble breathing or severe symptoms can be an emergency. Call 112 or casualty now. Don't wait for a reply here."}
            </p>
          </div>
        )}

        {/* Free Text Description */}
        <label className="lbl mt-6" htmlFor="sx">
          {lang === 'ml' ? 'നിങ്ങളുടെ വാക്കുകളിൽ വിവരിക്കുക' : 'Describe it in your own words'}
        </label>
        <div className="field p-3 min-h-[90px] items-start">
          <textarea
            id="sx"
            rows={3}
            value={txt}
            onChange={e => setTxt(e.target.value)}
            placeholder={
              lang === 'ml'
                ? 'ഉദാഹരണത്തിന്: എഴുന്നേറ്റു നിൽക്കുമ്പോൾ തലകറക്കം, ഞായറാഴ്ച മുതൽ'
                : 'For example: dizzy when I stand up, since Sunday'
            }
            className="w-full resize-none p-0 outline-none text-sm sm:text-base text-[var(--ink)] bg-transparent"
          />
        </div>

        {/* Onset Timing */}
        <p className="lbl mt-5">
          {lang === 'ml' ? 'എപ്പോൾ തുടങ്ങി?' : 'When did it start?'}
        </p>
        <div className="flex flex-wrap gap-2">
          {onsetList.map(item => (
            <button
              key={item.id}
              type="button"
              className={`chip press ${since === item.id ? 'on' : ''}`}
              aria-pressed={since === item.id}
              onClick={() => setSince(item.id)}
            >
              <span>{lang === 'ml' ? item.ml : item.en}</span>
            </button>
          ))}
        </div>

        {/* Severity Segmented Selector */}
        <p className="lbl mt-5">
          {lang === 'ml' ? 'എത്രത്തോളം ബുദ്ധിമുട്ടുണ്ട്?' : 'How bad is it?'}
        </p>
        <div
          className="seg"
          role="radiogroup"
          aria-label={lang === 'ml' ? 'എത്രത്തോളം ബുദ്ധിമുട്ടുണ്ട്?' : 'How bad is it?'}
        >
          {severityOptions.map(opt => {
            const isSelected = sev === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={lang === 'ml' ? opt.ml : opt.en}
                className={isSelected ? 'on' : ''}
                onClick={() => setSev(opt.id)}
              >
                <span>{lang === 'ml' ? opt.ml : opt.en}</span>
              </button>
            );
          })}
        </div>

        {/* Submit Button */}
        <button
          type="button"
          className="btn-p btn-pri press w-full mt-7 shadow-sm"
          disabled={!sel.length && !txt.trim()}
          onClick={handleSubmit}
        >
          <span>{lang === 'ml' ? 'ഡോക്ടർമാർക്ക് അയയ്ക്കുക' : 'Send to my care team'}</span>
        </button>
      </div>
    </div>
  );
}
