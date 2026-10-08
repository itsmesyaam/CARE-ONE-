import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  ChevronRight,
  FileText,
  Activity,
  FlaskConical,
} from 'lucide-react';
import {
  MOCK_DOCTOR,
  MOCK_CLINIC_SCHEDULE,
  MOCK_WAITING_REPORTS,
  MOCK_WAITING_SYMPTOMS,
  IS_MOCK_DATA,
} from './mock';

export function DoctorToday(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Patients booked today
  const clinic = MOCK_CLINIC_SCHEDULE;
  const live = clinic.filter((a) => a.status !== 'cancel');
  const nextPatient = clinic.find((a) => a.status === 'booked' || a.status === 'draft') || null;
  const remainingCount = live.filter((a) => a.status === 'booked' || a.status === 'draft').length;

  const handleOpenChart = (patientId: string) => {
    // In later phases, this opens the patient chart view
    navigate(`/doctor/chart/${patientId}`);
  };

  return (
    <div className="staff-theme w-full">
      {/* Clinic Header & Kerala Greeting */}
      <div className="pt-2 pb-7 lg:pt-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold text-sm text-[var(--ink3)]">
            {t('doctorToday.dateLine')}
          </p>
          {IS_MOCK_DATA && (
            <span className="tag tag-zari text-xs">
              {t('doctorToday.sampleData')}
            </span>
          )}
        </div>

        <h1 className="disp greet kin mt-1 text-[var(--ink)] whitespace-pre-line">
          {t('doctorToday.goodMorning')}
        </h1>

        <p className="mt-3 text-base text-[var(--ink2)]">
          {remainingCount > 0
            ? t('doctorToday.opDetails', {
                room: MOCK_DOCTOR.room,
                left: remainingCount,
                total: live.length,
              })
            : t('doctorToday.allSeen', { room: MOCK_DOCTOR.room })}
        </p>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-10">
        {/* Left Column: Next Patient Ticket + Today's Clinic */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          {/* Next Patient Ticket Card */}
          {nextPatient ? (
            <section aria-label="Next patient" className="spring" style={{ '--i': 0 } as React.CSSProperties}>
              <div className="ticket">
                <div className="tk-main">
                  <p className="text-xs font-semibold tracking-wider uppercase text-white/80">
                    {t('doctorToday.nextPatient', { type: nextPatient.type.toLowerCase() })}
                  </p>
                  <p className="tk-name text-white">{nextPatient.name}</p>
                  <p className="text-sm text-white/85 mt-0.5">
                    {nextPatient.age} yrs, {nextPatient.sex}, {nextPatient.mrn}
                  </p>
                  <p className="mt-3 font-medium text-white/95 text-base">
                    {nextPatient.reason}
                  </p>

                  {/* Signals Counters */}
                  <div className="flex flex-wrap gap-2 mt-3.5">
                    {nextPatient.signals.rep > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-xs">
                        <FileText size={13} />
                        {nextPatient.signals.rep} report
                      </span>
                    )}
                    {nextPatient.signals.rd > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-xs">
                        <Activity size={13} />
                        {nextPatient.signals.rd} readings
                      </span>
                    )}
                  </div>

                  {/* Allergy Warning Banner */}
                  {nextPatient.allergies.length > 0 && (
                    <div className="flex items-center gap-2 mt-3.5 text-sm font-semibold text-[#F3D27A]">
                      <AlertTriangle size={16} className="flex-none" />
                      <span>
                        {t('doctorToday.allergicTo', {
                          allergies: nextPatient.allergies.map((a) => a.n.toLowerCase()).join(' and '),
                        })}
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenChart(nextPatient.id)}
                    className="btn btn-light btn-sm mt-5 font-bold"
                  >
                    {t('doctorToday.openChart')}
                  </button>
                </div>

                {/* Ticket Stub with Cutouts */}
                <div className="tk-stub">
                  <b className="num text-white">
                    {nextPatient.time.slice(0, -3)}
                  </b>
                  <span className="text-white/85 font-bold">
                    {nextPatient.time.slice(-2)}
                  </span>
                </div>
              </div>
            </section>
          ) : (
            <section className="note-card">
              <span className="ico ico-leaf">
                <Check size={20} />
              </span>
              <div>
                <h2 className="h3 text-[var(--ink)]">
                  {t('doctorToday.noPatientsWaiting')}
                </h2>
                <p className="text-sm text-[var(--ink2)] mt-1">
                  {t('doctorToday.noPatientsWaitingSub')}
                </p>
              </div>
            </section>
          )}

          {/* Today's Clinic List */}
          <section aria-labelledby="clinic-heading">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 id="clinic-heading" className="h2 text-[var(--ink)]">
                {t('doctorToday.todaysClinic')}
              </h2>
              <span className="text-sm font-semibold text-[var(--ink3)]">
                {t('doctorToday.bookedCount', { count: live.length })}
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {clinic.map((appt, i) => {
                const isNext = nextPatient?.id === appt.id;
                const isDone = appt.status === 'done';

                return (
                  <button
                    key={appt.id}
                    type="button"
                    onClick={() => handleOpenChart(appt.id)}
                    className={`cl ${isNext ? 'is-nx' : ''} ${isDone ? 'is-done' : ''} press`}
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="num font-bold text-base text-[var(--ink)]">
                      {appt.time}
                    </div>

                    <div className="min-w-0 pr-2">
                      <b className="block truncate text-base font-bold text-[var(--ink)]">
                        {appt.name}
                      </b>
                      <span className="block truncate text-sm text-[var(--ink2)]">
                        {appt.reason}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {appt.status === 'done' ? (
                        <span className="tag tag-mist text-xs">Done</span>
                      ) : appt.status === 'draft' ? (
                        <span className="tag tag-zari text-xs">In progress</span>
                      ) : (
                        <span className="tag tag-leaf text-xs">Booked</span>
                      )}
                      <ChevronRight size={18} className="text-[var(--ink3)]" />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right Column: Waiting Queue (Reports & Symptoms) */}
        <div className="lg:col-span-5 mt-8 lg:mt-0">
          <section aria-labelledby="waiting-heading" className="grp p-5 sm:p-6 bg-white">
            <div className="flex items-center justify-between mb-5">
              <h2 id="waiting-heading" className="h2 text-[var(--ink)]">
                {t('doctorToday.waitingForYou')}
              </h2>
              <span className="tag tag-zari">
                {MOCK_WAITING_REPORTS.length + MOCK_WAITING_SYMPTOMS.length} waiting
              </span>
            </div>

            {/* Waiting Lab Reports */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-[var(--ink2)] flex items-center gap-1.5">
                  <FlaskConical size={16} className="text-[var(--leaf)]" />
                  {t('doctorToday.labReports')}
                </span>
                <span className="text-xs font-semibold text-[var(--ink3)]">
                  {MOCK_WAITING_REPORTS.length}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {MOCK_WAITING_REPORTS.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-sm"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <b className="block truncate text-[var(--ink)]">{r.patientName}</b>
                      <span className="block truncate text-xs text-[var(--ink3)]">
                        {r.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-none">
                      {r.urgent && (
                        <span className="tag tag-lat text-xs">
                          {t('doctorToday.urgent')}
                        </span>
                      )}
                      <span className="text-xs text-[var(--ink3)] font-medium">
                        {t('doctorToday.daysWaiting', { count: r.daysWaiting })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Waiting Symptoms */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-[var(--ink2)] flex items-center gap-1.5">
                  <AlertTriangle size={16} className="text-amber-600" />
                  {t('doctorToday.reportedSymptoms')}
                </span>
                <span className="text-xs font-semibold text-[var(--ink3)]">
                  {MOCK_WAITING_SYMPTOMS.length}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {MOCK_WAITING_SYMPTOMS.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <b className="truncate text-[var(--ink)]">{s.patientName}</b>
                      <span
                        className={`tag text-xs ${
                          s.severity === 'severe'
                            ? 'tag-lat'
                            : s.severity === 'moderate'
                            ? 'tag-zari'
                            : 'tag-mist'
                        }`}
                      >
                        {s.severity}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--ink2)] line-clamp-2 mt-1">
                      "{s.text}"
                    </p>
                    <div className="mt-2 text-right">
                      <span className="text-xs text-[var(--ink3)] font-medium">
                        {t('doctorToday.daysWaiting', { count: s.daysWaiting })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
