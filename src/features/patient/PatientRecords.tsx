import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Search,
  X,
  Check,
  Clock,
  ChevronRight,
  FlaskConical,
  Camera,
  FileText,
  Pill,
  BadgeCheck,
  Eye,
  Download,
  AlertTriangle,
  ShieldCheck,
  FileUp,
  Lock,
  Plus,
  MessageSquare,
} from 'lucide-react';
import { usePatient, isReadingHigh } from './PatientContext';
import { PatientReportItem } from './mock';

interface KindInfo {
  icon: React.ElementType;
  tone: string;
  en: string;
  ml: string;
}

const KIND_DEFAULT: KindInfo = { icon: FileText, tone: 'mist', en: 'Document', ml: 'രേഖ' };

const KIND_META: Record<string, KindInfo> = {
  lab: { icon: FlaskConical, tone: 'leaf', en: 'Lab test', ml: 'ലാബ് പരിശോധന' },
  scan: { icon: Camera, tone: 'zari', en: 'Scan / Image', ml: 'സ്കാൻ / ഇമേജ്' },
  rx: { icon: Pill, tone: 'leaf', en: 'Prescription', ml: 'മരുന്ന് കുറിപ്പ്' },
  disc: { icon: FileText, tone: 'zari', en: 'Discharge summary', ml: 'ഡിസ്ചാർജ് സംഗ്രഹം' },
  other: KIND_DEFAULT,
};

const getKindMeta = (kind: string): KindInfo => KIND_META[kind] ?? KIND_DEFAULT;

function StatusTag({ r, lang }: { r: PatientReportItem; lang: string }) {
  if (r.st === 'rev') {
    return (
      <span className="tag tag-leaf">
        <BadgeCheck size={14} className="flex-none" aria-hidden="true" />
        <span>{lang === 'ml' ? 'പരിശോധിച്ചു' : 'Reviewed'}</span>
      </span>
    );
  }
  return (
    <span className="tag tag-zari">
      <Clock size={14} className="flex-none" aria-hidden="true" />
      <span>{lang === 'ml' ? 'പരിശോധന കാക്കുന്നു' : 'Waiting for review'}</span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// REPORT VIEWER MODAL
// ─────────────────────────────────────────────────────────────
export function ReportSheetModal({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const { lang, d, toast } = usePatient();
  const r = d.reports.find(x => x.id === id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!r) return null;

  const meta = getKindMeta(r.kind);
  const KindIcon = meta.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center lg:p-6">
      <div className="scrim absolute inset-0 bg-black/45" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={r.title}
        className="sheet relative w-full lg:max-w-2xl bg-white rounded-t-3xl lg:rounded-3xl p-6 shadow-2xl z-10 max-h-[90vh] flex flex-col"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="disp text-xl sm:text-2xl font-bold text-[var(--ink)]">{r.title}</h2>
          <button
            type="button"
            className="icon-btn press"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        <div className="sheet-body overflow-y-auto flex-1 pr-1">
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <StatusTag r={r} lang={lang} />
            <span className="text-xs sm:text-sm text-[var(--ink3)]">
              {r.s === 'y'
                ? lang === 'ml'
                  ? 'നിങ്ങൾ അപ്‌ലോഡ് ചെയ്തത്'
                  : 'Uploaded by you'
                : r.src || 'ABC Hospital'},{' '}
              {r.date}
            </span>
          </div>

          {/* Document Preview Card */}
          <div className="docprev mt-5 flex items-center gap-4 p-4 rounded-2xl bg-[var(--mist)]" aria-hidden="true">
            <div className="docpage">
              <span className={`ico ico-${meta.tone}`} style={{ width: 24, height: 24, borderRadius: 7 }}>
                <KindIcon size={14} />
              </span>
              <i style={{ width: '65%' }} />
              <i style={{ width: '85%' }} />
              <i style={{ width: '75%' }} />
              <i style={{ width: '50%' }} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-[var(--ink)] truncate">{r.file}</span>
              <span className="block text-xs text-[var(--ink3)] mt-0.5">{r.size}</span>
            </div>
          </div>

          {/* Review Details or Waiting Notice */}
          {r.st === 'rev' ? (
            <>
              <div className="revby mt-5">
                <BadgeCheck size={20} className="flex-none text-[var(--leafd)]" />
                <span className="text-sm">
                  {lang === 'ml'
                    ? `${r.by || d.doc} ${r.on || r.date}-ൽ പരിശോധിച്ചു`
                    : `Reviewed by ${r.by || d.doc} on ${r.on || r.date}`}
                </span>
              </div>

              {r.vals && r.vals.length > 0 && (
                <div className="mt-6">
                  <h3 className="h3 text-[var(--ink)] mb-2">
                    {lang === 'ml' ? 'പ്രധാന പരിശോധനാ ഫലങ്ങൾ' : 'Key values from report'}
                  </h3>
                  <div className="grp">
                    {r.vals.map((v, i) => (
                      <div key={i} className="row">
                        <div className="flex-1 min-w-0">
                          <b className="block text-sm text-[var(--ink)]">{v.k}</b>
                          {v.ref && <span className="block text-xs text-[var(--ink3)]">{v.ref}</span>}
                        </div>
                        <span className="text-right">
                          <span className={`num text-lg font-bold ${v.hi ? 'text-[var(--lat)]' : 'text-[var(--ink)]'}`}>
                            {v.v}
                          </span>{' '}
                          {v.u && <span className="text-xs text-[var(--ink3)]">{v.u}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="lock-note mt-5" role="note">
              <Clock size={18} className="flex-none mt-0.5 text-[var(--ink2)]" />
              <span className="text-sm">
                {lang === 'ml'
                  ? 'ഡോക്ടർ ഈ റിപ്പോർട്ട് പരിശോധിച്ച ശേഷം കുറിപ്പുകൾ ഇവിടെ ചേർക്കും.'
                  : 'Your doctor will review this report and record key findings here.'}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              type="button"
              className="btn-p btn-sec press flex items-center justify-center gap-2"
              onClick={() =>
                toast(
                  lang === 'ml'
                    ? 'സുരക്ഷിത ലിങ്ക് തയ്യാറായി. 15 മിനിറ്റിൽ കാലഹരണപ്പെടും.'
                    : 'Secure link generated. Link expires in 15 minutes.'
                )
              }
            >
              <Eye size={18} />
              <span>{lang === 'ml' ? 'കാണുക' : 'Open file'}</span>
            </button>
            <button
              type="button"
              className="btn-p btn-sec press flex items-center justify-center gap-2"
              onClick={() =>
                toast(
                  lang === 'ml'
                    ? 'ഡൗൺലോഡ് ആരംഭിച്ചു'
                    : 'Download started'
                )
              }
            >
              <Download size={18} />
              <span>{lang === 'ml' ? 'ഡൗൺലോഡ്' : 'Download'}</span>
            </button>
          </div>

          <p className="text-xs text-[var(--ink3)] mt-3 text-center">
            {lang === 'ml'
              ? 'സുരക്ഷയ്ക്കായി ലിങ്കുകൾ 15 മിനിറ്റിൽ കാലഹരണപ്പെടും.'
              : 'Secure encrypted files. Access is logged under India DPDP Act.'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// UPLOAD REPORT MODAL
// ─────────────────────────────────────────────────────────────
export function UploadSheetModal({
  test,
  onClose,
}: {
  test?: string;
  onClose: () => void;
}) {
  const { lang, d, addReport, openSheet, toast } = usePatient();
  const pend = d.tests.filter(x => x.st !== 'sent');

  const [stepState, setStepState] = useState<'pick' | 'details' | 'prog' | 'done'>('pick');
  const [file, setFile] = useState<{ name: string; size: number; img: boolean } | null>(null);
  const [err, setErr] = useState<string>('');
  const [kind, setKind] = useState<string>('lab');
  const [name, setName] = useState<string>('');
  const [date, setDate] = useState<string>('2026-10-06');
  const [linkOn, setLinkOn] = useState<boolean>(!!test);
  const [link, setLink] = useState<string>(test || (pend[0]?.id || ''));
  const [progStep, setProgStep] = useState<number>(0);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleFileSelect = (f: File | null | undefined) => {
    if (!f) return;
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(f.type)) {
      setErr(
        lang === 'ml'
          ? 'PDF, JPG അല്ലെങ്കിൽ PNG ഫയലുകൾ മാത്രം അപ്‌ലോഡ് ചെയ്യുക.'
          : 'Please select a PDF, JPG, or PNG document.'
      );
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setErr(
        lang === 'ml'
          ? 'ഫയൽ വലുപ്പം 10 MB-ൽ കുറവായിരിക്കണം.'
          : 'File size must be under 10 MB.'
      );
      return;
    }
    setErr('');
    setFile({ name: f.name, size: f.size, img: f.type !== 'application/pdf' });
    setName(f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 60));
    setStepState('details');
  };

  const startUpload = () => {
    setStepState('prog');
    setProgStep(1);

    setTimeout(() => {
      setProgStep(2);
    }, 600);

    setTimeout(() => {
      setProgStep(3);
      if (file) {
        const id = addReport({
          title: name.trim(),
          kind,
          file,
          test: linkOn ? link : null,
        });
        setCreatedId(id);
      }
      setStepState('done');
      toast(lang === 'ml' ? 'റിപ്പോർട്ട് വിജയകരമായി അയച്ചു' : 'Report uploaded successfully');
    }, 1300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center lg:p-6">
      <div className="scrim absolute inset-0 bg-black/45" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={lang === 'ml' ? 'റിപ്പോർട്ട് അപ്‌ലോഡ് ചെയ്യുക' : 'Upload a report'}
        className="sheet relative w-full lg:max-w-lg bg-white rounded-t-3xl lg:rounded-3xl p-6 shadow-2xl z-10 max-h-[90vh] flex flex-col"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="disp text-xl sm:text-2xl font-bold text-[var(--ink)]">
            {stepState === 'done'
              ? lang === 'ml'
                ? 'അപ്‌ലോഡ് പൂർത്തിയായി'
                : 'Report uploaded'
              : lang === 'ml'
              ? 'റിപ്പോർട്ട് അപ്‌ലോഡ് ചെയ്യുക'
              : 'Upload a report'}
          </h2>
          <button
            type="button"
            className="icon-btn press"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        <div className="sheet-body overflow-y-auto flex-1 pr-1">
          {stepState === 'pick' && (
            <div className="pt-2">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="bigpick press"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera size={28} />
                  <b>{lang === 'ml' ? 'ഫോട്ടോ എടുക്കുക' : 'Take photo'}</b>
                </button>
                <button
                  type="button"
                  className="bigpick press"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileUp size={28} />
                  <b>{lang === 'ml' ? 'ഫയൽ തിരഞ്ഞെടുക്കുക' : 'Choose file'}</b>
                </button>
              </div>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/jpeg,image/png"
                capture="environment"
                className="hidden"
                onChange={e => handleFileSelect(e.target.files?.[0])}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                className="hidden"
                onChange={e => handleFileSelect(e.target.files?.[0])}
              />

              <p className="text-xs sm:text-sm text-[var(--ink2)] mt-4 leading-relaxed">
                {lang === 'ml'
                  ? 'ലാബ് ഫലങ്ങൾ, കുറിപ്പുകൾ, സ്കാനുകൾ എന്നിവ PDF, JPG അല്ലെങ്കിൽ PNG ആയി അപ്‌ലോഡ് ചെയ്യാം. പരമാവധി 10 MB.'
                  : 'Upload lab results, prescriptions or discharge summaries in PDF, JPG or PNG. Max 10 MB.'}
              </p>

              {err && (
                <p className="err mt-3 text-[var(--lat)] flex items-center gap-2 text-sm font-semibold" role="alert">
                  <AlertTriangle size={18} className="flex-none" />
                  <span>{err}</span>
                </p>
              )}

              <div className="lock-note mt-4" role="note">
                <ShieldCheck size={18} className="flex-none mt-0.5 text-[var(--ink2)]" />
                <span className="text-xs sm:text-sm">
                  {lang === 'ml'
                    ? 'റിപ്പോർട്ടുകൾ ഇന്ത്യയിലെ സുരക്ഷിത സെർവറുകളിൽ സൂക്ഷിക്കുന്നു. പരിചരണ സംഘത്തിന് മാത്രമേ പ്രവേശനമുള്ളൂ.'
                    : 'Documents are encrypted and stored in India. Only your treating doctor and team can view them.'}
                </span>
              </div>

              <button
                type="button"
                className="link text-sm mt-5 block font-semibold"
                onClick={() => {
                  setFile({ name: 'hba1c-report.jpg', size: 2480000, img: true });
                  setName('HbA1c report');
                  setStepState('details');
                }}
              >
                {lang === 'ml' ? 'സാമ്പിൾ റിപ്പോർട്ട് ഉപയോഗിക്കുക' : 'Use sample report'}
              </button>
            </div>
          )}

          {stepState === 'details' && file && (
            <div className="pt-2">
              <div className="filechip">
                <span className="ico ico-leaf">
                  {file.img ? <Camera size={18} /> : <FileText size={18} />}
                </span>
                <span className="flex-1 min-w-0">
                  <b className="block truncate text-sm text-[var(--ink)]">{file.name}</b>
                  <span className="text-xs text-[var(--ink3)]">
                    {file.size > 1024 * 1024
                      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                      : `${Math.round(file.size / 1024)} KB`}
                  </span>
                </span>
                <button
                  type="button"
                  className="link text-xs font-semibold"
                  onClick={() => {
                    setFile(null);
                    setStepState('pick');
                  }}
                >
                  {lang === 'ml' ? 'മാറ്റുക' : 'Change'}
                </button>
              </div>

              <p className="text-xs font-semibold text-[var(--ink3)] uppercase tracking-wider mt-5">
                {lang === 'ml' ? 'റിപ്പോർട്ട് തരം' : 'Report category'}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {([
                  ['lab', lang === 'ml' ? 'ലാബ്' : 'Lab test'],
                  ['scan', lang === 'ml' ? 'സ്കാൻ' : 'Scan'],
                  ['rx', lang === 'ml' ? 'മരുന്ന് കുറിപ്പ്' : 'Prescription'],
                  ['disc', lang === 'ml' ? 'ഡിസ്ചാർജ്' : 'Discharge'],
                  ['other', lang === 'ml' ? 'മറ്റുള്ളവ' : 'Other'],
                ] as const).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    className={`chip press ${kind === v ? 'on' : ''}`}
                    onClick={() => setKind(v)}
                  >
                    {l}
                  </button>
                ))}
              </div>

              <label className="block text-xs font-semibold text-[var(--ink3)] uppercase tracking-wider mt-5" htmlFor="report-name-input">
                {lang === 'ml' ? 'റിപ്പോർട്ടിന്റെ പേര്' : 'Report title'}
              </label>
              <div className="field mt-1.5">
                <input
                  id="report-name-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={lang === 'ml' ? 'ഉദാ. രക്തപരിശോധന' : 'e.g. Blood test'}
                />
              </div>

              <label className="block text-xs font-semibold text-[var(--ink3)] uppercase tracking-wider mt-4" htmlFor="report-date-input">
                {lang === 'ml' ? 'പരിശോധനാ തീയതി' : 'Test date'}
              </label>
              <div className="field mt-1.5">
                <input
                  id="report-date-input"
                  type="date"
                  value={date}
                  max="2026-10-06"
                  onChange={e => setDate(e.target.value)}
                />
              </div>

              {pend.length > 0 && (
                <div className="mt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-[var(--ink)]">
                    <input
                      type="checkbox"
                      checked={linkOn}
                      onChange={e => setLinkOn(e.target.checked)}
                      className="rounded"
                    />
                    <span>{lang === 'ml' ? 'പരിചരണ പദ്ധതിയിലെ പരിശോധനയുമായി ബന്ധിപ്പിക്കുക' : 'Link to a care plan test'}</span>
                  </label>
                  {linkOn && (
                    <div className="flex flex-wrap gap-2 mt-2 ml-6">
                      {pend.map(x => (
                        <button
                          key={x.id}
                          type="button"
                          className={`chip press ${link === x.id ? 'on' : ''}`}
                          onClick={() => setLink(x.id)}
                        >
                          {x.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                className="btn-p btn-pri press w-full mt-7 shadow-sm"
                disabled={!name.trim()}
                onClick={startUpload}
              >
                <Upload size={20} />
                <span>{lang === 'ml' ? 'അപ്‌ലോഡ് ചെയ്യുക' : 'Upload'}</span>
              </button>
            </div>
          )}

          {stepState === 'prog' && (
            <div className="py-6 text-center">
              <div className="prog">
                <i style={{ width: `${(progStep / 3) * 100}%` }} />
              </div>
              <ul className="mt-6 flex flex-col gap-3 text-left max-w-xs mx-auto">
                {[
                  lang === 'ml' ? 'ചിത്രം ചുരുക്കുന്നു' : 'Optimizing document',
                  lang === 'ml' ? 'മെറ്റാഡാറ്റ നീക്കംചെയ്യുന്നു' : 'Removing private metadata',
                  lang === 'ml' ? 'സുരക്ഷിതമായി അപ്‌ലോഡ് ചെയ്യുന്നു' : 'Uploading to secure hospital vault',
                ].map((s, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm">
                    <span className={`tick ${idx + 1 <= progStep ? 'on' : ''}`}>
                      {idx + 1 <= progStep && <Check size={14} />}
                    </span>
                    <span className={idx + 1 <= progStep ? 'font-semibold text-[var(--ink)]' : 'text-[var(--ink3)]'}>
                      {s}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {stepState === 'done' && (
            <div className="text-center py-6">
              <span className="bigcheck mx-auto">
                <Check size={40} strokeWidth={3} />
              </span>
              <p className="text-lg font-bold text-[var(--ink)] mt-5 max-w-sm mx-auto">
                {lang === 'ml'
                  ? `റിപ്പോർട്ട് ലഭിച്ചു. ${d.doc} പരിശോധിച്ച് കുറിപ്പുകൾ രേഖപ്പെടുത്തും.`
                  : `Report received. Sent to ${d.doc} for clinical review.`}
              </p>
              <div className="grid grid-cols-2 gap-3 mt-7">
                <button
                  type="button"
                  className="btn-p btn-sec press"
                  onClick={onClose}
                >
                  {lang === 'ml' ? 'പൂർത്തിയായി' : 'Done'}
                </button>
                <button
                  type="button"
                  className="btn-p btn-pri press"
                  onClick={() => {
                    onClose();
                    if (createdId) openSheet({ type: 'report', id: createdId });
                  }}
                >
                  {lang === 'ml' ? 'കാണുക' : 'View report'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN RECORDS & REPORTS COMPONENT
// ─────────────────────────────────────────────────────────────
export function PatientRecords(): React.JSX.Element {
  const { lang, recTab, setRecTab, openSheet, d, metric, setMetric } = usePatient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKind, setFilterKind] = useState('all');

  const tabs = [
    { key: 'reports', label: lang === 'ml' ? 'റിപ്പോർട്ടുകൾ' : 'Reports', count: d.reports.length },
    { key: 'readings', label: lang === 'ml' ? 'അളവുകൾ' : 'Readings' },
    { key: 'meds', label: lang === 'ml' ? 'മരുന്നുകൾ' : 'Medicines' },
    { key: 'visits', label: lang === 'ml' ? 'സന്ദർശനങ്ങൾ' : 'Visit notes' },
    { key: 'summary', label: lang === 'ml' ? 'ആരോഗ്യ സംഗ്രഹം' : 'Health summary' },
  ];

  // Reports filtering & grouping
  const filteredReports = d.reports.filter(r => {
    const matchFilter =
      filterKind === 'all' ||
      (filterKind === 'rev' && r.st === 'rev') ||
      (filterKind === 'wait' && r.st === 'wait') ||
      (filterKind === 'me' && r.s === 'y');
    const matchQuery = r.title.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchFilter && matchQuery;
  });

  const groupedReports = filteredReports.reduce((acc, r) => {
    acc[r.mon] = acc[r.mon] || [];
    acc[r.mon]!.push(r);
    return acc;
  }, {} as Record<string, PatientReportItem[]>);

  return (
    <div className="fadein">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="disp h1 text-[var(--ink)]">
              {lang === 'ml' ? 'രേഖകൾ' : 'Records'}
            </h1>
            <span className="sample-badge">Sample</span>
          </div>
          <p className="text-[var(--ink2)] mt-1 text-sm sm:text-base">
            {lang === 'ml'
              ? 'നിങ്ങളുടെ ലാബ് റിപ്പോർട്ടുകൾ, കുറിപ്പുകൾ, പരിശോധനാ ഫലങ്ങൾ'
              : 'Your medical reports, test results and consultation notes'}
          </p>
        </div>

        <button
          type="button"
          className="btn-p btn-pri btn-sm press flex items-center gap-2 shadow-sm"
          onClick={() => openSheet({ type: 'upload' })}
          aria-label={lang === 'ml' ? 'റിപ്പോർട്ട് അപ്‌ലോഡ് ചെയ്യുക' : 'Upload a report'}
        >
          <Upload size={18} />
          <span>{lang === 'ml' ? 'അപ്‌ലോഡ്' : 'Upload'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div
        className="hscroll flex gap-2 -mx-5 px-5 lg:mx-0 lg:px-0 mb-6"
        role="tablist"
        aria-label={lang === 'ml' ? 'രേഖകൾ' : 'Records'}
      >
        {tabs.map(tabItem => {
          const isActive = recTab === tabItem.key;
          return (
            <button
              key={tabItem.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`pill press ${isActive ? 'on' : ''}`}
              onClick={() => setRecTab(tabItem.key)}
            >
              <span>{tabItem.label}</span>
              {tabItem.count !== undefined && (
                <span className="pill-n">{tabItem.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: REPORTS */}
      {recTab === 'reports' && (
        <div className="fadein">
          {/* Search Bar */}
          <div className="field">
            <Search size={20} className="text-[var(--ink3)] flex-none mr-3" aria-hidden="true" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={lang === 'ml' ? 'റിപ്പോർട്ടുകൾ തിരയുക...' : 'Search reports...'}
              aria-label={lang === 'ml' ? 'റിപ്പോർട്ടുകൾ തിരയുക' : 'Search reports'}
            />
            {searchQuery && (
              <button
                type="button"
                className="icon-btn press"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap gap-2 mt-3">
            {([
              ['all', lang === 'ml' ? 'എല്ലാം' : 'All'],
              ['rev', lang === 'ml' ? 'പരിശോധിച്ചത്' : 'Reviewed'],
              ['wait', lang === 'ml' ? 'പരിശോധന കാക്കുന്നത്' : 'Waiting review'],
              ['me', lang === 'ml' ? 'നിങ്ങൾ അപ്‌ലോഡ് ചെയ്തത്' : 'By you'],
            ] as const).map(([v, l]) => (
              <button
                key={v}
                type="button"
                className={`chip press ${filterKind === v ? 'on' : ''}`}
                aria-pressed={filterKind === v}
                onClick={() => setFilterKind(v)}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Reports Grouped by Month */}
          {filteredReports.length === 0 ? (
            <div className="mt-8 text-center p-8 rounded-2xl border-2 border-dashed border-[var(--line)]">
              <Search size={32} className="mx-auto text-[var(--ink3)] mb-2" />
              <p className="font-bold text-[var(--ink)]">
                {lang === 'ml' ? 'റിപ്പോർട്ടുകൾ കണ്ടെത്തിയില്ല' : 'No reports found'}
              </p>
              <p className="text-xs sm:text-sm text-[var(--ink2)] mt-1">
                {lang === 'ml'
                  ? 'മറ്റൊരു വാക്ക് നൽകി തിരയുക'
                  : 'Try a different search query or filter'}
              </p>
            </div>
          ) : (
            Object.entries(groupedReports).map(([month, reports]) => (
              <section key={month} className="mt-6">
                <h2 className="text-xs sm:text-sm font-bold text-[var(--ink3)] uppercase tracking-wider mb-2">
                  {month}
                </h2>
                <div className="grp">
                  {reports.map(r => {
                    const meta = getKindMeta(r.kind);
                    const KindIcon = meta.icon;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        className="row press text-left w-full"
                        onClick={() => openSheet({ type: 'report', id: r.id })}
                      >
                        <span className={`ico ico-${meta.tone}`} aria-hidden="true">
                          <KindIcon size={20} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <b className="block truncate text-sm font-bold text-[var(--ink)]">
                            {r.title}
                          </b>
                          <span className="block text-xs sm:text-sm text-[var(--ink3)] truncate">
                            {r.s === 'y'
                              ? lang === 'ml'
                                ? 'നിങ്ങൾ അപ്‌ലോഡ് ചെയ്തത്'
                                : 'Uploaded by you'
                              : r.src || 'ABC Hospital'},{' '}
                            {r.date}
                          </span>
                          <span className="block mt-1.5">
                            <StatusTag r={r} lang={lang} />
                          </span>
                        </span>
                        <ChevronRight size={20} className="ink3 flex-none" aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          )}

          {/* Privacy Note */}
          <div className="lock-note mt-6" role="note">
            <ShieldCheck size={18} className="flex-none mt-0.5 text-[var(--ink2)]" />
            <span className="text-xs sm:text-sm">
              {lang === 'ml'
                ? 'ഇന്ത്യൻ ഡിപിഡിപി നിയമപ്രകാരം രേഖകൾ എൻക്രിപ്റ്റ് ചെയ്ത് സൂക്ഷിക്കുന്നു. നിങ്ങളുടെ പരിചരണ സംഘത്തിന് മാത്രമേ പ്രവേശനമുള്ളൂ.'
                : 'Encrypted and stored in India under DPDP rules. Only your treating doctor and clinical team can access.'}
            </span>
          </div>
        </div>
      )}

      {/* TAB 2: READINGS */}
      {recTab === 'readings' && (
        <div className="fadein">
          <h2 className="h3 text-[var(--ink)] mb-4">
            {lang === 'ml' ? 'രക്തസമ്മർദ്ദ ചരിത്രം' : 'Blood pressure readings'}
          </h2>

          {/* Metric Selector Chips */}
          <div className="flex flex-wrap gap-2 mb-5">
            {([
              ['bp', lang === 'ml' ? 'രക്തസമ്മർദ്ദം' : 'Blood pressure'],
              ['sugar', lang === 'ml' ? 'ഷുഗർ' : 'Blood sugar'],
              ['weight', lang === 'ml' ? 'ശരീരഭാരം' : 'Weight'],
              ['a1c', 'HbA1c'],
            ] as const).map(([val, label]) => {
              const active = (metric || 'bp') === val;
              return (
                <button
                  key={val}
                  type="button"
                  className={`chip press ${active ? 'on' : ''}`}
                  aria-pressed={active}
                  onClick={() => setMetric(val)}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Metric Overview Card */}
          {(() => {
            const currentMetric = (metric || 'bp') as 'bp' | 'sugar' | 'weight' | 'a1c';
            const arr = d.readings[currentMetric] || [];
            const last = arr[arr.length - 1];
            const unit = currentMetric === 'bp' ? 'mmHg' : currentMetric === 'sugar' ? 'mg/dL' : currentMetric === 'weight' ? 'kg' : '%';
            const valStr = last ? (Array.isArray(last.v) ? `${last.v[0]}/${last.v[1]}` : String(last.v)) : '—';
            const tg = d.tg[currentMetric as keyof typeof d.tg] || (currentMetric === 'weight' ? 'below 68 kg' : '');
            const high = last ? isReadingHigh(currentMetric, last.v) : false;

            return (
              <div className="grp p-5 mb-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs sm:text-sm font-semibold text-[var(--ink2)]">
                      {lang === 'ml' ? 'ഏറ്റവും പുതിയത്' : 'Latest reading'}, {last?.d || 'Today'}
                    </span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="num text-3xl sm:text-4xl font-extrabold text-[var(--ink)]">
                        {valStr}
                      </span>
                      <span className="text-sm sm:text-base font-semibold text-[var(--ink3)]">
                        {unit}
                      </span>
                    </div>
                  </div>
                  {last && (
                    <span className={`tag ${high ? 'tag-lat' : 'tag-leaf'}`}>
                      {high
                        ? lang === 'ml'
                          ? 'ലക്ഷ്യത്തിന് പുറത്ത്'
                          : 'Outside target'
                        : lang === 'ml'
                        ? 'ലക്ഷ്യ പരിധിയിൽ'
                        : 'In target'}
                    </span>
                  )}
                </div>

                {tg && (
                  <p className="text-xs sm:text-sm text-[var(--ink3)] mt-2">
                    {lang === 'ml'
                      ? `ലക്ഷ്യം: ${tg} (${d.doc} നിശ്ചയിച്ചത്)`
                      : `Target: ${tg} set by ${d.doc}`}
                  </p>
                )}

                <div className="mt-5 flex items-center justify-between pt-4 border-t border-[var(--line)]">
                  <span className="text-xs text-[var(--ink3)]">
                    {lang === 'ml' ? `${arr.length} അളവുകൾ രേഖപ്പെടുത്തി` : `${arr.length} readings recorded`}
                  </span>
                  <button
                    type="button"
                    className="btn-p btn-tint btn-sm press flex items-center gap-1.5"
                    onClick={() => openSheet({ type: currentMetric === 'a1c' ? 'upload' : 'reading', k: currentMetric })}
                  >
                    <Plus size={16} />
                    <span>{lang === 'ml' ? 'റീഡിംഗ് ചേർക്കുക' : 'Log reading'}</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Reading History */}
          <div className="grp p-5">
            <h3 className="h3 text-[var(--ink)] mb-3">
              {lang === 'ml' ? 'മുൻകാല അളവുകൾ' : 'History'}
            </h3>
            {(() => {
              const currentMetric = (metric || 'bp') as 'bp' | 'sugar' | 'weight' | 'a1c';
              const arr = d.readings[currentMetric] || [];
              const unit = currentMetric === 'bp' ? 'mmHg' : currentMetric === 'sugar' ? 'mg/dL' : currentMetric === 'weight' ? 'kg' : '%';

              if (arr.length === 0) {
                return (
                  <p className="text-sm text-[var(--ink3)] py-4 text-center">
                    {lang === 'ml' ? 'റീഡിംഗുകൾ ലഭ്യമല്ല' : 'No readings found'}
                  </p>
                );
              }

              return (
                <div className="flex flex-col gap-2">
                  {[...arr].reverse().map((reading, idx) => {
                    const valStr = Array.isArray(reading.v)
                      ? `${reading.v[0]}/${reading.v[1]}`
                      : String(reading.v);
                    const high = isReadingHigh(currentMetric, reading.v);

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-2 border-b border-[var(--line)] last:border-0"
                      >
                        <div>
                          <b className="block text-sm text-[var(--ink)]">
                            {valStr} <span className="font-normal text-xs text-[var(--ink3)]">{unit}</span>
                          </b>
                          <span className="text-xs text-[var(--ink3)]">
                            {reading.d}
                            {reading.ctx ? ` · ${reading.ctx === 'fasting' ? (lang === 'ml' ? 'വെറുംവയറ്റിൽ' : 'Fasting') : (lang === 'ml' ? 'ഭക്ഷണശേഷം' : 'After meal')}` : ''}
                          </span>
                        </div>
                        <span className={`tag ${high ? 'tag-lat' : 'tag-leaf'}`}>
                          {high
                            ? lang === 'ml'
                              ? 'ഉയർന്നത്'
                              : 'Elevated'
                            : lang === 'ml'
                            ? 'സാധാരണം'
                            : 'Target'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 3: MEDICINES */}
      {recTab === 'meds' && (
        <div className="fadein">
          <div className="grp">
            {d.meds.map(m => (
              <div key={m.id} className="row">
                <span className="ico ico-leaf"><Pill size={20} /></span>
                <div className="flex-1 min-w-0">
                  <b className="block text-sm font-bold text-[var(--ink)]">{m.name} {m.dose}</b>
                  <span className="block text-xs text-[var(--ink2)]">{m.how} · {m.by}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="lock-note mt-4" role="note">
            <Lock size={18} className="flex-none mt-0.5" />
            <span className="text-xs sm:text-sm">
              {lang === 'ml'
                ? 'ഡോക്ടർക്ക് മാത്രമേ മരുന്നുകൾ മാറ്റാനാവൂ. പാർശ്വഫലങ്ങൾ ഉണ്ടെങ്കിൽ പരിചരണ സംഘത്തെ അറിയിക്കുക.'
                : 'Only your doctor can change your medicines. Having side effects? Tell your care team.'}
            </span>
          </div>
        </div>
      )}

      {/* TAB 4: VISITS */}
      {recTab === 'visits' && (
        <div className="fadein flex flex-col gap-4">
          <div className="lock-note" role="note">
            <Lock size={18} className="flex-none mt-0.5" />
            <span className="text-xs sm:text-sm">
              {lang === 'ml'
                ? 'ഒപ്പിട്ട കുറിപ്പുകൾ മാറ്റാനാവില്ല. തിരുത്തലുകൾ താഴെ ചേർക്കും.'
                : "Signed notes can't be changed. If your doctor corrects something, it's added below the original."}
            </span>
          </div>
          {d.visits.map(v => (
            <div key={v.id} className="grp p-5">
              <div className="flex items-center justify-between mb-2">
                <b className="text-base text-[var(--ink)]">{v.reason}</b>
                <span className="text-xs text-[var(--ink3)]">{v.date}</span>
              </div>
              <p className="text-xs text-[var(--ink2)] mb-3">{v.doc} · {v.dept}</p>
              <div className="p-3 rounded-xl bg-[var(--mist)] text-xs sm:text-sm text-[var(--ink)] mb-3">
                <b>{lang === 'ml' ? 'കണ്ടെത്തൽ:' : 'Clinical note:'}</b> {v.found}
              </div>
              <p className="text-xs text-[var(--leafd)] font-semibold">
                ✓ {lang === 'ml' ? `${v.signed}-ൽ ഒപ്പുവെച്ചു` : `Signed on ${v.signed}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* TAB 5: SUMMARY */}
      {recTab === 'summary' && (
        <div className="fadein flex flex-col gap-5">
          <div className="grp p-5">
            <h2 className="h3 text-[var(--ink)] mb-3">{lang === 'ml' ? 'രോഗാവസ്ഥകൾ' : 'Active conditions'}</h2>
            {d.conds.map((c, i) => (
              <div key={i} className="py-1.5 flex items-center justify-between text-sm">
                <span className="font-semibold text-[var(--ink)]">{c.n}</span>
                <span className="text-xs text-[var(--ink3)]">{lang === 'ml' ? `${c.since} മുതൽ` : `Since ${c.since}`}</span>
              </div>
            ))}
          </div>

          <div className="grp p-5">
            <h2 className="h3 text-[var(--ink)] mb-3">{lang === 'ml' ? 'അലർജികൾ' : 'Allergies'}</h2>
            {d.allergies.map((a, i) => (
              <div key={i} className="py-1.5 flex items-center justify-between text-sm">
                <div>
                  <b className="text-[var(--ink)]">{a.n}</b>
                  <span className="text-xs text-[var(--ink2)] ml-2">({a.r})</span>
                </div>
                <span className="tag tag-lat">{a.sev}</span>
              </div>
            ))}
          </div>

          <div className="grp p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="h3 text-[var(--ink)]">{lang === 'ml' ? 'അറിയിച്ച ലക്ഷണങ്ങൾ' : 'Reported symptoms'}</h2>
              <button
                type="button"
                className="btn-p btn-tint btn-sm press flex items-center gap-1.5"
                onClick={() => openSheet({ type: 'symptom' })}
              >
                <Plus size={16} />
                <span>{lang === 'ml' ? 'ലക്ഷണം ചേർക്കുക' : 'Report symptom'}</span>
              </button>
            </div>
            {d.symptoms && d.symptoms.length > 0 ? (
              <div className="flex flex-col gap-3">
                {d.symptoms.map(s => (
                  <div key={s.id} className="row items-start">
                    <span className="ico ico-mist flex-none">
                      <MessageSquare size={18} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <b className="block text-sm text-[var(--ink)]">{s.text}</b>
                      <span className="block text-xs text-[var(--ink3)] mt-0.5">
                        {s.date} · {s.sev === 'mild' ? (lang === 'ml' ? 'നേരിയത്' : 'Mild') : s.sev === 'moderate' ? (lang === 'ml' ? 'മിതമായത്' : 'Moderate') : (lang === 'ml' ? 'കഠിനമായത്' : 'Severe')}
                      </span>
                      <span className="block mt-1.5">
                        <span className={`tag ${s.st === 'seen' ? 'tag-leaf' : 'tag-zari'}`}>
                          {s.st === 'seen'
                            ? lang === 'ml'
                              ? `${s.by || d.doc} പരിശോധിച്ചു`
                              : `Reviewed by ${s.by || d.doc}`
                            : lang === 'ml'
                            ? 'പരിശോധന കാക്കുന്നു'
                            : 'Waiting review'}
                        </span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--ink3)] py-4 text-center">
                {lang === 'ml' ? 'ലക്ഷണങ്ങൾ ഒന്നും അറിയിച്ചിട്ടില്ല' : 'No symptoms reported'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
