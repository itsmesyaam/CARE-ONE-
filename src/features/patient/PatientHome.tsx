import React from 'react';
import {
  MapPin,
  CalendarPlus,
  Phone,
  Check,
  Sun,
  Moon,
  Plus,
  HeartPulse,
  Droplet,
  Scale,
  FlaskConical,
  Activity,
  FileText,
  Pill,
  Smartphone,
  AlertTriangle,
  BadgeCheck,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { usePatient } from './PatientContext';
import { MedicationItem } from './mock';

function Dots({ p }: { p: [number, number, number] | null }) {
  const { lang } = usePatient();
  if (!p) {
    return (
      <span className="text-xs text-[var(--ink2)]">
        {lang === 'ml' ? 'ആവശ്യമെങ്കിൽ' : 'When needed'}
      </span>
    );
  }
  return (
    <span
      className="dots"
      aria-label={`Morning ${p[0]}, Noon ${p[1]}, Night ${p[2]}`}
    >
      {p.map((x, i) => (
        <i key={i} className={x ? 'on' : ''} />
      ))}
      <b aria-hidden="true">{p.join('-')}</b>
    </span>
  );
}

function Spark({ data }: { data: number[] }) {
  if (!data || data.length < 2) return <div style={{ height: 34 }} />;
  const w = 120;
  const h = 34;
  const mn = Math.min(...data);
  const mx = Math.max(...data);
  const r = mx - mn || 1;
  const pts = data.map((v, i) => [
    (i * (w - 8)) / (data.length - 1) + 4,
    h - 5 - ((v - mn) / r) * (h - 10),
  ]);
  const lastPt = pts[pts.length - 1];
  const lx = lastPt ? lastPt[0] : 0;
  const ly = lastPt ? lastPt[1] : 0;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full mt-2" style={{ height: 34 }} aria-hidden="true">
      <polyline
        points={pts.map(p => p.join(',')).join(' ')}
        fill="none"
        stroke="#1F6B4F"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lx} cy={ly} r="3.5" fill="#fff" stroke="#1F6B4F" strokeWidth="2.2" />
    </svg>
  );
}

export function Ticket() {
  const { lang, d, toast } = usePatient();
  const n = d.next;

  const downloadIcs = () => {
    try {
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//ABC Hospital//Care//EN',
        'BEGIN:VEVENT',
        `UID:${n.ics}@abchospital.example`,
        'DTSTAMP:20261006T140000Z',
        `DTSTART:${n.ics}`,
        'DURATION:PT30M',
        'SUMMARY:Visit at ABC Hospital',
        'LOCATION:ABC Hospital',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');
      const blob = new Blob([ics], { type: 'text/calendar' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'abc-hospital-visit.ics';
      a.click();
    } catch {
      // Ignore sandbox blob download restriction
    }
    toast('Calendar file saved.');
  };

  return (
    <section aria-label={lang === 'ml' ? 'അടുത്ത സന്ദർശനം' : 'Next visit'}>
      <div className="ticket">
        <div className="tk-main">
          <p className="tk-lbl">{lang === 'ml' ? 'അടുത്ത സന്ദർശനം' : 'Next visit'}</p>
          <p className="tk-doc">{n.doc}</p>
          <p style={{ opacity: 0.85 }}>{n.dept}</p>
          <div className="tk-when">
            <div>
              <span>{lang === 'ml' ? 'തീയതി' : 'Date'}</span>
              <b>
                {n.day}, {n.date}
              </b>
            </div>
            <div>
              <span>{lang === 'ml' ? 'സമയം' : 'Time'}</span>
              <b>{n.time}</b>
            </div>
          </div>
          <p className="tk-place">
            <MapPin size={16} className="flex-none" />
            {n.place}
          </p>
        </div>
        <div className="tk-stub">
          <b className="num">{n.days}</b>
          <span>{lang === 'ml' ? 'ദിവസം ബാക്കി' : 'days to go'}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          type="button"
          className="btn-p btn-sec btn-sm press w-full"
          onClick={downloadIcs}
        >
          <CalendarPlus size={18} className="flex-none" />
          <span>{lang === 'ml' ? 'കലണ്ടറിൽ ചേർക്കുക' : 'Add to calendar'}</span>
        </button>
        <a className="btn-p btn-sec btn-sm press w-full" href="tel:04840001234">
          <Phone size={18} className="flex-none" />
          <span>{lang === 'ml' ? 'ഡെസ്കിൽ വിളിക്കുക' : 'Call the desk'}</span>
        </a>
      </div>
      <p className="text-xs text-[var(--ink3)] mt-2">
        {lang === 'ml'
          ? 'സന്ദർശനം മാറ്റാൻ ഫ്രണ്ട് ഡെസ്കിൽ വിളിക്കുക.'
          : 'To change this visit, call the front desk.'}
      </p>
    </section>
  );
}

function Prep() {
  const { lang, d, openSheet } = usePatient();
  const items = [
    ...d.tests.map(x => ({
      id: x.id,
      label: x.name,
      ok: x.st === 'sent',
      sub:
        x.st === 'sent'
          ? lang === 'ml'
            ? `${x.on}-ൽ അപ്‌ലോഡ് ചെയ്തു`
            : `Uploaded ${x.on}`
          : lang === 'ml'
          ? `${x.due}-നകം`
          : `Due ${x.due}`,
      act:
        x.st !== 'sent'
          ? ([
              lang === 'ml' ? 'അപ്‌ലോഡ്' : 'Upload',
              () => openSheet({ type: 'upload', test: x.id }),
            ] as const)
          : null,
    })),
    ...d.logs.slice(0, 1).map(x => ({
      id: x.id,
      label: x.name,
      ok: false,
      sub: lang === 'ml' ? `അടുത്തത് ${x.next}` : `Next on ${x.next}`,
      act: [
        lang === 'ml' ? 'ഇപ്പോൾ ചേർക്കുക' : 'Log now',
        () => openSheet({ type: 'reading', k: x.k }),
      ] as const,
    })),
  ];

  if (!items.length) return null;
  const doneCount = items.filter(i => i.ok).length;

  return (
    <section className="grp" aria-labelledby="prep-h">
      <div className="flex items-center justify-between px-4 pt-4">
        <h2 className="h3 text-[var(--ink)]" id="prep-h">
          {lang === 'ml' ? 'സന്ദർശനത്തിന് മുമ്പ്' : 'Before your visit'}
        </h2>
        <span className="text-xs text-[var(--ink3)] font-medium">
          {lang === 'ml'
            ? `${items.length}-ൽ ${doneCount} പൂർത്തിയായി`
            : `${doneCount} of ${items.length} done`}
        </span>
      </div>

      <div className="prog mx-4 mt-3 mb-1">
        <i style={{ width: `${(doneCount / items.length) * 100}%` }} />
      </div>

      {items.map(i => (
        <div key={i.id} className="row">
          <span className={`tick ${i.ok ? 'on' : ''}`}>
            {i.ok && <Check size={14} strokeWidth={3} />}
          </span>
          <div className="flex-1 min-w-0">
            <b className={`block text-sm ${i.ok ? 'text-[var(--ink2)]' : 'text-[var(--ink)]'}`}>
              {i.label}
            </b>
            <span className="block text-xs text-[var(--ink3)]">{i.sub}</span>
          </div>
          {i.act && (
            <button
              type="button"
              className="btn-p btn-tint btn-sm press"
              onClick={i.act[1]}
            >
              {i.act[0]}
            </button>
          )}
        </div>
      ))}
    </section>
  );
}

function Meds() {
  const { lang, d, take } = usePatient();
  const allKeys = d.slots.flatMap(s => s.meds.map(m => s.k + '-' + m));
  const takenCount = allKeys.filter(k => d.doses[k]).length;

  return (
    <section aria-labelledby="meds-h">
      <div className="flex items-end justify-between gap-3 mb-3">
        <h2 className="h2 text-[var(--ink)]" id="meds-h">
          {lang === 'ml' ? 'ഇന്നത്തെ മരുന്നുകൾ' : "Today's medicines"}
        </h2>
        <span className="text-xs text-[var(--ink3)] font-medium">
          {lang === 'ml'
            ? `${allKeys.length}-ൽ ${takenCount} കഴിച്ചു`
            : `${takenCount} of ${allKeys.length} taken`}
        </span>
      </div>

      <ol className="list-none p-0 m-0">
        {d.slots.map(s => {
          const done = s.meds.every(m => d.doses[s.k + '-' + m]);
          const Icon = s.k === 'night' ? Moon : Sun;
          const slotLabel =
            s.k === 'morning'
              ? lang === 'ml'
                ? 'രാവിലെ'
                : 'Morning'
              : lang === 'ml'
              ? 'രാത്രി'
              : 'Night';

          return (
            <li key={s.k} className={`tl-i ${done ? 'done' : s.eta ? 'now' : ''}`}>
              <span className="tl-node">
                {done ? <Check size={14} strokeWidth={3} /> : <Icon size={14} />}
              </span>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <b className="text-sm font-bold text-[var(--ink)]">{slotLabel}</b>
                <span className="text-xs text-[var(--ink2)]">{s.time}</span>
                <span className="ml-auto text-xs font-semibold">
                  {done ? (
                    <span className="leaf">{lang === 'ml' ? 'എല്ലാം കഴിച്ചു' : 'All taken'}</span>
                  ) : s.eta ? (
                    <span className="ink3">
                      {lang === 'ml'
                        ? `${s.eta[0]} മണി. ${s.eta[1]} മിനി. കഴിഞ്ഞ്`
                        : `in ${s.eta[0]} hr ${s.eta[1]} min`}
                    </span>
                  ) : null}
                </span>
              </div>

              <ul className="list-none p-0 m-0">
                {s.meds.map(mid => {
                  const m = d.meds.find(x => x.id === mid) as MedicationItem;
                  if (!m) return null;
                  const key = s.k + '-' + mid;
                  const at = d.doses[key];
                  const foodLabel =
                    m.food === 'afterFood'
                      ? lang === 'ml'
                        ? 'ഭക്ഷണശേഷം'
                        : 'after food'
                      : m.food === 'beforeFood'
                      ? lang === 'ml'
                        ? 'ഭക്ഷണത്തിന് മുമ്പ്'
                        : 'before food'
                      : m.food === 'atBed'
                      ? lang === 'ml'
                        ? 'ഉറങ്ങും മുമ്പ്'
                        : 'at bedtime'
                      : '';

                  return (
                    <li key={mid} className="med">
                      <div className="flex-1 min-w-0">
                        <b className="block text-sm text-[var(--ink)]">
                          {m.name} <span className="font-normal text-[var(--ink2)]">{m.dose}</span>
                        </b>
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                          <Dots p={m.p} />
                          <span className="text-xs text-[var(--ink2)]">
                            {m.how}
                            {foodLabel ? `, ${foodLabel}` : ''}
                          </span>
                        </span>
                      </div>
                      <button
                        type="button"
                        className={`take press ${at ? 'on' : ''}`}
                        aria-pressed={!!at}
                        onClick={() => take(key)}
                      >
                        {at ? (
                          <span className="flex items-center gap-1 text-xs">
                            <Check size={16} strokeWidth={3} className="pop" />
                            {at}
                          </span>
                        ) : (
                          <span>{lang === 'ml' ? 'കഴിച്ചു' : 'Mark taken'}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ReadTiles() {
  const { lang, d, openSheet, nav, setMetric } = usePatient();
  const METRICS = {
    bp: [HeartPulse, 'mmHg', lang === 'ml' ? 'രക്തസമ്മർദ്ദം' : 'Blood pressure'],
    sugar: [Droplet, 'mg/dL', lang === 'ml' ? 'ബ്ലഡ് ഷുഗർ' : 'Blood sugar'],
    weight: [Scale, 'kg', lang === 'ml' ? 'ഭാരം' : 'Weight'],
    a1c: [FlaskConical, '%', 'HbA1c'],
  } as const;

  const ks = (['bp', 'sugar', 'weight', 'a1c'] as const).filter(
    k => d.readings[k] && d.readings[k].length > 0
  );

  const formatVal = (k: string, v: number | [number, number]) =>
    k === 'bp' && Array.isArray(v) ? `${v[0]}/${v[1]}` : String(v);

  return (
    <section aria-labelledby="rd-h">
      <div className="flex items-end justify-between gap-3 mb-3">
        <h2 className="h2 text-[var(--ink)]" id="rd-h">
          {lang === 'ml' ? 'നിങ്ങളുടെ റീഡിംഗുകൾ' : 'Your readings'}
        </h2>
        {ks.length > 0 && (
          <button
            type="button"
            className="link text-xs font-bold"
            onClick={() => {
              if (ks[0]) {
                setMetric(ks[0]);
                nav('records', 'readings');
              }
            }}
          >
            {lang === 'ml' ? 'എല്ലാം' : 'See all'}
          </button>
        )}
      </div>

      <div className="hscroll tiles -mx-5 px-5 lg:mx-0 lg:px-0">
        {ks.map(k => {
          const arr = d.readings[k] || [];
          const last = arr[arr.length - 1];
          if (!last) return null;
          const [Icon, unit, label] = METRICS[k];
          const sparkData = arr.map(r => (Array.isArray(r.v) ? r.v[0] : (r.v as number)));

          return (
            <button
              key={k}
              type="button"
              className="tile press"
              onClick={() => {
                setMetric(k);
                nav('records', 'readings');
              }}
            >
              <span className="flex items-center gap-2 text-xs text-[var(--ink2)] font-semibold">
                <Icon size={16} className="leaf" />
                {label}
              </span>
              <span className="mt-2">
                <span className="num text-2xl font-extrabold text-[var(--ink)]">
                  {formatVal(k, last.v)}
                </span>{' '}
                <span className="text-xs text-[var(--ink3)]">{unit}</span>
              </span>
              <Spark data={sparkData} />
              <span className="mt-2">
                {last.s === 'y' ? (
                  <span className="tag tag-zari">
                    {lang === 'ml' ? 'പരിശോധിച്ചിട്ടില്ല' : 'Not yet reviewed'}
                  </span>
                ) : (
                  <span className="text-xs text-[var(--ink3)]">
                    {lang === 'ml' ? 'ഹോസ്പിറ്റൽ' : 'Hospital'}, {last.d}
                  </span>
                )}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          className="tile tile-add press"
          onClick={() => openSheet({ type: 'reading' })}
        >
          <Plus size={22} />
          <span>{lang === 'ml' ? 'റീഡിംഗ് ചേർക്കുക' : 'Log a reading'}</span>
        </button>
      </div>
    </section>
  );
}

function RecentReports() {
  const { lang, d, openSheet, nav } = usePatient();
  const KIND_CONFIG = {
    lab: [FlaskConical, 'leaf'],
    scan: [Activity, 'mist'],
    rx: [Pill, 'zari'],
    disc: [FileText, 'mist'],
    other: [FileText, 'mist'],
  } as const;

  return (
    <section aria-labelledby="rr-h">
      <div className="flex items-end justify-between gap-3 mb-3">
        <h2 className="h2 text-[var(--ink)]" id="rr-h">
          {lang === 'ml' ? 'പുതിയ റിപ്പോർട്ടുകൾ' : 'Recent reports'}
        </h2>
        <button
          type="button"
          className="link text-xs font-bold"
          onClick={() => nav('records', 'reports')}
        >
          {lang === 'ml' ? 'എല്ലാം' : 'See all'}
        </button>
      </div>

      <div className="grp">
        {d.reports.slice(0, 3).map(r => {
          const [Icon, tone] = KIND_CONFIG[r.kind] || KIND_CONFIG.other;

          return (
            <button
              key={r.id}
              type="button"
              className="row press text-left"
              onClick={() => openSheet({ type: 'report', id: r.id })}
            >
              <span className={`ico ico-${tone}`}>
                <Icon size={20} />
              </span>
              <span className="flex-1 min-w-0">
                <b className="block truncate text-sm font-bold text-[var(--ink)]">{r.title}</b>
                <span className="block text-xs text-[var(--ink3)] truncate">
                  {r.s === 'y'
                    ? lang === 'ml'
                      ? 'നിങ്ങൾ അപ്‌ലോഡ് ചെയ്തത്'
                      : 'Uploaded by you'
                    : r.src}
                  , {r.date}
                </span>
                <span className="block mt-1.5">
                  {r.st === 'rev' ? (
                    <span className="tag tag-leaf">
                      <BadgeCheck size={14} />
                      {lang === 'ml' ? 'പരിശോധിച്ചു' : 'Reviewed'}
                    </span>
                  ) : (
                    <span className="tag tag-zari">
                      <Clock size={14} />
                      {lang === 'ml' ? 'പരിശോധന കാത്തിരിക്കുന്നു' : 'Waiting for review'}
                    </span>
                  )}
                </span>
              </span>
              <ChevronRight size={20} className="ink3 flex-none" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function InstallPrompt() {
  const { lang, inst, setInst, toast } = usePatient();
  if (inst) return null;

  return (
    <section className="note-card">
      <span className="ico ico-leaf">
        <Smartphone size={20} />
      </span>
      <div className="flex-1">
        <h2 className="h3 text-[var(--ink)]">
          {lang === 'ml' ? 'ഹോം സ്ക്രീനിൽ ചേർക്കുക' : 'Add to your home screen'}
        </h2>
        <p className="text-xs text-[var(--ink2)] mt-1 leading-relaxed">
          {lang === 'ml'
            ? 'ഓർമ്മപ്പെടുത്തലുകൾ ഫോണിൽ കൃത്യമായി ലഭിക്കാൻ ഹോം സ്ക്രീനിൽ ചേർക്കുക.'
            : 'Reminders work best from the home screen. On iPhone, tap Share, then Add to Home Screen.'}
        </p>
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            className="btn-p btn-pri btn-sm press"
            onClick={() => {
              setInst(true);
              toast('Added to your home screen');
            }}
          >
            {lang === 'ml' ? 'ഇൻസ്റ്റാൾ' : 'Install'}
          </button>
          <button
            type="button"
            className="btn-p btn-ghost btn-sm press"
            onClick={() => setInst(true)}
          >
            {lang === 'ml' ? 'പിന്നീട്' : 'Later'}
          </button>
        </div>
      </div>
    </section>
  );
}

function SosBanner() {
  const { lang } = usePatient();
  return (
    <section className="sos" aria-labelledby="sos-h">
      <div className="flex gap-3">
        <AlertTriangle size={22} className="flex-none mt-0.5 lat" />
        <div>
          <h2 className="h3 text-[var(--lat)]" id="sos-h">
            {lang === 'ml' ? 'ഗുരുതരമായ ബുദ്ധിമുട്ടുണ്ടോ?' : 'Feeling very unwell?'}
          </h2>
          <p className="text-xs text-[#6B2417] mt-1 leading-relaxed">
            {lang === 'ml'
              ? 'ആപ്പിനായി കാത്തിരിക്കരുത്. 112-ലോ ABC കാഷ്വാലിറ്റിയിലോ വിളിക്കുക.'
              : "Don't wait for the app. Call 112 or ABC casualty."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <a className="btn-p btn-sm btn-danger press w-full" href="tel:112">
          <Phone size={18} />
          <span>{lang === 'ml' ? '112 വിളിക്കുക' : 'Call 112'}</span>
        </a>
        <a className="btn-p btn-sm btn-sec press w-full" href="tel:04840000112">
          <span>{lang === 'ml' ? 'കാഷ്വാലിറ്റി' : 'Call casualty'}</span>
        </a>
      </div>
    </section>
  );
}

export function PatientHome(): React.JSX.Element {
  const { lang, p } = usePatient();

  return (
    <div>
      {/* Header Greeting */}
      <div className="pt-3 pb-7 lg:pt-0">
        <p className="text-xs sm:text-sm font-semibold text-[var(--ink3)]">
          {lang === 'ml' ? 'ചൊവ്വാഴ്ച, ഒക്ടോബർ 6' : 'Tuesday, 6 October'}
        </p>
        <h1 className="disp greet mt-1 text-[var(--ink)] kin">
          {lang === 'ml' ? 'നമസ്കാരം,' : 'Good evening,'}
          <br />
          {p.first}
        </h1>
      </div>

      <div className="lg:grid lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-7 flex flex-col gap-9">
          <div className="lg:hidden flex flex-col gap-6">
            <Ticket />
            <Prep />
          </div>
          <Meds />
          <ReadTiles />
          <RecentReports />
          <div className="lg:hidden flex flex-col gap-6">
            <InstallPrompt />
            <SosBanner />
          </div>
        </div>

        <div className="hidden lg:block lg:col-span-5">
          <div className="sticky top-10 flex flex-col gap-6">
            <Ticket />
            <Prep />
            <InstallPrompt />
            <SosBanner />
          </div>
        </div>
      </div>
    </div>
  );
}
