import React from 'react';
import {
  Lock,
  Pill,
  FlaskConical,
  Upload,
  HeartPulse,
  Footprints,
  CalendarDays,
  Check,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { usePatient } from './PatientContext';

function Ring({ v, label }: { v: number; label: string }) {
  const r = 14;
  const c = 2 * Math.PI * r;
  const pct = Math.round(Math.min(v, 1) * 100);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className="inline-flex items-center justify-center"
    >
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#DCE3DD" strokeWidth="4" />
        {v > 0 && (
          <circle
            cx="18"
            cy="18"
            r={r}
            fill="none"
            stroke="#1F6B4F"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${c * Math.min(v, 1)} ${c}`}
            transform="rotate(-90 18 18)"
            style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.2, 1, 0.3, 1)' }}
          />
        )}
        {v >= 1 && (
          <path
            d="M12.5 18.5l3.6 3.6 7.4-7.4"
            fill="none"
            stroke="#1F6B4F"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  );
}

function Dots({ p, lang }: { p: number[] | null; lang: string }) {
  if (!p) {
    return (
      <span className="text-sm text-[var(--ink2)]">
        {lang === 'ml' ? 'ആവശ്യമുള്ളപ്പോൾ' : 'When needed'}
      </span>
    );
  }
  return (
    <span
      className="dots"
      aria-label={
        lang === 'ml'
          ? `രാവിലെ ${p[0]}, ഉച്ചയ്ക്ക് ${p[1]}, രാത്രി ${p[2]}`
          : `Morning ${p[0]}, Noon ${p[1]}, Night ${p[2]}`
      }
    >
      {p.map((x, i) => (
        <i key={i} className={x ? 'on' : ''} />
      ))}
      <b aria-hidden="true">{p.join('-')}</b>
    </span>
  );
}

function PlanGroup({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="h2 flex items-center gap-2 mb-3 text-[var(--ink)]">
        <Icon size={20} className="leaf" aria-hidden="true" />
        <span>{title}</span>
      </h2>
      <div className="grp">{children}</div>
    </section>
  );
}

export function PatientCarePlan(): React.JSX.Element {
  const { lang, d, openSheet, setTab, toast } = usePatient();

  // 7-day adherence calculations
  const perDay = d.slots.reduce((acc, s) => acc + s.meds.length, 0);
  const takenToday = Object.keys(d.doses).length;
  const weekVals = [...d.week, perDay ? takenToday / perDay : 0];
  const totalTaken = Math.round(d.week.reduce((a, b) => a + b, 0) * perDay) + takenToday;
  const daysOfWeek = [
    { en: 'W', ml: 'ബു', date: 30, full: 'Wednesday, 30 Sep' },
    { en: 'T', ml: 'വ്യാ', date: 1, full: 'Thursday, 1 Oct' },
    { en: 'F', ml: 'വെ', date: 2, full: 'Friday, 2 Oct' },
    { en: 'S', ml: 'ശ', date: 3, full: 'Saturday, 3 Oct' },
    { en: 'S', ml: 'ഞാ', date: 4, full: 'Sunday, 4 Oct' },
    { en: 'M', ml: 'തി', date: 5, full: 'Monday, 5 Oct' },
    { en: 'T', ml: 'ചൊ', date: 6, full: 'Tuesday, 6 Oct' },
  ];

  return (
    <div className="fadein">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="disp h1 text-[var(--ink)]">
            {lang === 'ml' ? 'പരിചരണ പദ്ധതി' : 'Care plan'}
          </h1>
          <span className="sample-badge">Sample</span>
        </div>
        <p className="text-[var(--ink2)] mt-2 text-sm sm:text-base">
          {lang === 'ml'
            ? `${d.planFrom}-ൽ ${d.doc} തയ്യാറാക്കിയത് · അടുത്ത പരിശോധന: ${d.review}`
            : `Plan from ${d.planFrom}, ${d.doc} · Next review on ${d.review}`}
        </p>
      </div>

      {/* Lock Note */}
      <div className="lock-note" role="note">
        <Lock size={18} className="flex-none mt-0.5 text-[var(--ink2)]" aria-hidden="true" />
        <span>
          {lang === 'ml'
            ? 'ഡോക്ടർമാർക്ക് മാത്രമേ ഈ പദ്ധതി മാറ്റാനാകൂ. മരുന്നുകളോ പരിശോധനകളോ മാറ്റാൻ ഡോക്ടറോട് സംസാരിക്കുക.'
            : 'Only your care team can edit this plan. To change medicines or tests, speak to your doctor.'}
        </span>
      </div>

      {/* 7-Day Adherence Section */}
      <section className="grp p-4 mt-6" aria-labelledby="weekly-adherence-title">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="h3 text-[var(--ink)]" id="weekly-adherence-title">
            {lang === 'ml' ? 'കഴിഞ്ഞ 7 ദിവസങ്ങൾ' : 'Last 7 days'}
          </h2>
          <span className="text-sm text-[var(--ink3)]">
            {lang === 'ml'
              ? `${perDay * 7}-ൽ ${totalTaken} മരുന്നുകൾ കഴിച്ചു`
              : `${totalTaken} of ${perDay * 7} doses taken`}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1 mt-3">
          {daysOfWeek.map((dayItem, idx) => {
            const isToday = idx === 6;
            const progress = weekVals[idx] ?? 0;
            return (
              <div key={idx} className={`day ${isToday ? 'today' : ''}`}>
                <span className="text-xs text-[var(--ink3)] font-medium">
                  {lang === 'ml' ? dayItem.ml : dayItem.en}
                </span>
                <Ring v={progress} label={`${dayItem.full}: ${Math.round(progress * 100)}%`} />
                <span className="text-xs font-semibold text-[var(--ink)]">{dayItem.date}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Two Column Layout */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-8">
        {/* Left Column: Medicines & Tests */}
        <div>
          {/* Active Medicines */}
          <PlanGroup title={lang === 'ml' ? 'മരുന്നുകൾ' : 'Medicines'} icon={Pill}>
            {d.meds
              .filter((m) => m.on)
              .map((m) => (
                <div key={m.id} className="row">
                  <div className="flex-1 min-w-0">
                    <b className="block text-sm font-bold text-[var(--ink)]">
                      {m.name} <span className="font-medium text-[var(--ink2)]">{m.dose}</span>
                    </b>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <Dots p={m.p} lang={lang} />
                      <span className="text-xs sm:text-sm text-[var(--ink2)]">
                        {m.how}
                        {m.food
                          ? lang === 'ml'
                            ? m.food === 'afterFood'
                              ? ', ഭക്ഷണത്തിന് ശേഷം'
                              : m.food === 'beforeFood'
                                ? ', ഭക്ഷണത്തിന് മുമ്പ്'
                                : ', ഉറങ്ങുന്നതിന് മുമ്പ്'
                            : m.food === 'afterFood'
                              ? ', After food'
                              : m.food === 'beforeFood'
                                ? ', Before food'
                                : ', At bedtime'
                          : ''}
                      </span>
                    </span>
                    <span className="block text-xs text-[var(--ink3)] mt-1">
                      {lang === 'ml' ? `${m.since} മുതൽ` : `Started on ${m.since}`}
                    </span>
                  </div>
                </div>
              ))}
          </PlanGroup>

          {/* Tests Due & Uploaded */}
          {d.tests.length > 0 && (
            <PlanGroup title={lang === 'ml' ? 'പരിശോധനകൾ' : 'Tests'} icon={FlaskConical}>
              {d.tests.map((test) => (
                <div key={test.id} className="row">
                  <div className="flex-1 min-w-0">
                    <b className="block text-sm font-bold text-[var(--ink)]">{test.name}</b>
                    <span className="block mt-1.5">
                      {test.st === 'sent' ? (
                        <span className="tag tag-leaf">
                          <Check size={14} className="flex-none" aria-hidden="true" />
                          <span>
                            {lang === 'ml'
                              ? `${test.on}-ൽ അപ്‌ലോഡ് ചെയ്തു`
                              : `Uploaded on ${test.on}`}
                          </span>
                        </span>
                      ) : (
                        <span className="tag tag-zari">
                          <Clock size={14} className="flex-none" aria-hidden="true" />
                          <span>
                            {lang === 'ml' ? `${test.due}-ന് മുൻപ് ചെയ്യുക` : `Due on ${test.due}`}
                          </span>
                        </span>
                      )}
                    </span>
                  </div>
                  {test.st !== 'sent' && (
                    <button
                      type="button"
                      className="btn-p btn-tint btn-sm press flex items-center gap-1.5"
                      onClick={() => openSheet({ type: 'upload', test: test.id })}
                      aria-label={`${lang === 'ml' ? 'അപ്‌ലോഡ് ചെയ്യുക' : 'Upload'}: ${test.name}`}
                    >
                      <Upload size={16} />
                      <span>{lang === 'ml' ? 'അപ്‌ലോഡ്' : 'Upload'}</span>
                    </button>
                  )}
                </div>
              ))}
            </PlanGroup>
          )}
        </div>

        {/* Right Column: Readings, Instructions, Follow-up */}
        <div>
          {/* Readings to Log */}
          <PlanGroup
            title={lang === 'ml' ? 'രേഖപ്പെടുത്തേണ്ട അളവുകൾ' : 'Readings to log'}
            icon={HeartPulse}
          >
            {d.logs.map((log) => (
              <div key={log.id} className="row items-start">
                <div className="flex-1 min-w-0">
                  <b className="block text-sm font-bold text-[var(--ink)]">{log.name}</b>
                  <span className="block text-xs sm:text-sm text-[var(--ink2)]">{log.when}</span>
                  <span className="block text-xs text-[var(--ink3)] mt-1">
                    {lang === 'ml'
                      ? `അവസാനം: ${log.last}. അടുത്തത്: ${log.next}.`
                      : `Last logged: ${log.last}. Next on ${log.next}.`}
                  </span>
                  {log.missed && (
                    <span className="block mt-1.5">
                      <span className="tag tag-lat">
                        {lang === 'ml' ? `${log.missed}-ൽ വിട്ടുപോയി` : `Missed on ${log.missed}`}
                      </span>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="btn-p btn-tint btn-sm press flex items-center gap-1.5"
                  onClick={() => openSheet({ type: 'reading', k: log.k })}
                  aria-label={`${lang === 'ml' ? 'രേഖപ്പെടുത്തുക' : 'Log now'}: ${log.name}`}
                >
                  <span>{lang === 'ml' ? 'രേഖപ്പെടുത്തുക' : 'Log now'}</span>
                </button>
              </div>
            ))}
          </PlanGroup>

          {/* Doctor Instructions */}
          <PlanGroup
            title={lang === 'ml' ? 'നിർദ്ദേശങ്ങൾ' : 'Doctor instructions'}
            icon={Footprints}
          >
            {d.instr.map((instruction, idx) => (
              <div key={idx} className="row items-start gap-3">
                <span
                  className="flex-none mt-2 rounded-full bg-[var(--leaf)]"
                  style={{ width: 8, height: 8 }}
                  aria-hidden="true"
                />
                <p className="text-sm sm:text-base text-[var(--ink)] leading-relaxed">
                  {instruction}
                </p>
              </div>
            ))}
          </PlanGroup>

          {/* Follow-up Visit */}
          <PlanGroup
            title={lang === 'ml' ? 'തുടർ സന്ദർശനം' : 'Follow-up visit'}
            icon={CalendarDays}
          >
            <button
              type="button"
              className="row press text-left w-full"
              onClick={() => {
                setTab('appts');
                toast(lang === 'ml' ? 'അപ്പോയിന്റ്മെന്റുകൾ' : 'Appointments');
              }}
            >
              <span className="ico ico-zari" aria-hidden="true">
                <CalendarDays size={20} />
              </span>
              <span className="flex-1 min-w-0">
                <b className="block text-sm font-bold text-[var(--ink)]">
                  {d.next.day}, {d.next.date}, {d.next.time}
                </b>
                <span className="block text-xs sm:text-sm text-[var(--ink2)]">
                  {d.next.doc}, {d.next.dept}
                </span>
              </span>
              <ChevronRight size={20} className="ink3" aria-hidden="true" />
            </button>
          </PlanGroup>
        </div>
      </div>
    </div>
  );
}
