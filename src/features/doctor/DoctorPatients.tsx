import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Clock,
  ChevronRight,
  Lock,
  ShieldAlert,
  FileText,
  Activity,
  AlertCircle,
  Check,
} from 'lucide-react';
import {
  DirectoryPatient,
  MOCK_DIRECTORY_PATIENTS,
  IS_MOCK_DATA,
} from './mock';
import { EmergencyAccessModal } from './EmergencyAccessModal';

export function DoctorPatients(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'review' | 'overdue'>('all');
  const [selectedEmergencyPatient, setSelectedEmergencyPatient] = useState<DirectoryPatient | null>(null);
  const [glassActive, setGlassActive] = useState<
    Record<string, { until: string; untilTime: number; reason: string }>
  >({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const qq = q.trim().toLowerCase();
  const qd = q.replace(/\D/g, '');

  const match = (p: DirectoryPatient) =>
    !qq ||
    p.name.toLowerCase().includes(qq) ||
    p.mrn.toLowerCase().includes(qq) ||
    (qd.length >= 4 && p.phone.replace(/\D/g, '').includes(qd));

  const needsReview = (p: DirectoryPatient) =>
    p.signals.rep > 0 || p.signals.sx > 0;

  const careTeamPatients = MOCK_DIRECTORY_PATIENTS.filter(
    (p) => p.inCareTeam && match(p)
  ).sort((a, b) => a.name.localeCompare(b.name));

  const filteredLists = {
    all: careTeamPatients,
    review: careTeamPatients.filter(needsReview),
    overdue: careTeamPatients.filter((p) => Boolean(p.overdue)),
  };

  const list = filteredLists[filter];
  const others =
    qq.length >= 3
      ? MOCK_DIRECTORY_PATIENTS.filter((p) => !p.inCareTeam && match(p))
      : [];

  const handleOpenChart = (patientId: string) => {
    navigate(`/doctor/chart/${patientId}`);
  };

  const handleGrantGlass = (patientId: string, reason: string) => {
    const expiration = new Date(Date.now() + 4 * 3600 * 1000);
    const untilFormatted = expiration.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });

    setGlassActive((prev) => ({
      ...prev,
      [patientId]: { until: untilFormatted, untilTime: expiration.getTime(), reason },
    }));

    setSelectedEmergencyPatient(null);
    const msg = t('emergencyModal.grantedToast', { time: untilFormatted });
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  return (
    <div className="staff-theme w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-white shadow-xl animate-in fade-in"
          role="status"
        >
          <Check size={18} className="text-[#C9A43B]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="pt-2 pb-6 lg:pt-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="disp h1 text-2xl lg:text-3xl font-bold text-[var(--ink)]">
              {t('doctorPatients.title')}
            </h1>
            <p className="mt-1.5 text-sm lg:text-base text-[var(--ink2)]">
              {t('doctorPatients.subtitle')}
            </p>
          </div>
          {IS_MOCK_DATA && (
            <span className="tag tag-zari text-xs self-start">
              {t('doctorToday.sampleData')}
            </span>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="field relative">
        <Search size={20} className="text-[var(--ink3)] flex-none" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('doctorPatients.searchPlaceholder')}
          aria-label="Search patients"
          className="w-full bg-transparent border-none focus:outline-none"
        />
        {q && (
          <button
            type="button"
            className="icon-btn p-1 text-[var(--ink3)] hover:text-[var(--ink)]"
            onClick={() => setQ('')}
            aria-label="Clear search"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2 mt-4">
        <button
          type="button"
          className={`chip press ${filter === 'all' ? 'on' : ''}`}
          onClick={() => setFilter('all')}
        >
          <span>{t('doctorPatients.all')}</span>
          <span className="text-xs opacity-70">
            {filteredLists.all.length}
          </span>
        </button>

        <button
          type="button"
          className={`chip press ${filter === 'review' ? 'on' : ''}`}
          onClick={() => setFilter('review')}
        >
          <span>{t('doctorPatients.needsReview')}</span>
          <span className="text-xs opacity-70">
            {filteredLists.review.length}
          </span>
        </button>

        <button
          type="button"
          className={`chip press ${filter === 'overdue' ? 'on' : ''}`}
          onClick={() => setFilter('overdue')}
        >
          <span>{t('doctorPatients.overdue')}</span>
          <span className="text-xs opacity-70">
            {filteredLists.overdue.length}
          </span>
        </button>
      </div>

      {/* Care Team Patients List */}
      {list.length > 0 ? (
        <div className="mt-6">
          {/* Desktop Table Header */}
          <div className="tbl-h">
            <span>{t('doctorPatients.patientCol')}</span>
            <span>{t('doctorPatients.conditionsCol')}</span>
            <span>{t('doctorPatients.lastVisitCol')}</span>
            <span>{t('doctorPatients.nextVisitCol')}</span>
            <span>{t('doctorPatients.sinceLastVisitCol')}</span>
            <span />
          </div>

          <div className="grp">
            {list.map((patient) => {
              const initials = patient.name
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0])
                .join('')
                .toUpperCase();

              return (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => handleOpenChart(patient.id)}
                  className="row prow press text-left hover:bg-[var(--mist)]/40 transition-colors"
                >
                  {/* Patient Primary Identifier */}
                  <span className="flex items-center gap-3 flex-1 min-w-0">
                    <span
                      className="rounded-full flex items-center justify-center font-bold select-none shrink-0 bg-[var(--leaft)] text-[var(--leafd)]"
                      style={{ width: 40, height: 40, fontSize: 15 }}
                      aria-hidden="true"
                    >
                      {initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block text-base text-[var(--ink)] truncate">
                        {patient.name}
                      </b>
                      <span className="block text-sm text-[var(--ink3)] truncate">
                        {patient.age} yrs, {patient.sex}, {patient.mrn}
                      </span>
                      {/* Mobile Signals & Next Visit */}
                      <span className="flex flex-wrap items-center gap-1.5 mt-1.5 lg:hidden">
                        <span className="text-xs text-[var(--ink2)] mr-1">
                          Next: {patient.nextVisit}
                        </span>
                        {patient.overdue && (
                          <span className="tag tag-lat text-xs">
                            <Clock size={11} />
                            {t('doctorPatients.overdueSince', { date: patient.overdue })}
                          </span>
                        )}
                        {patient.signals.rep > 0 && (
                          <span className="tag tag-leaf text-xs">
                            <FileText size={11} />
                            {patient.signals.rep}
                          </span>
                        )}
                        {patient.signals.rd > 0 && (
                          <span className="tag tag-mist text-xs">
                            <Activity size={11} />
                            {patient.signals.rd}
                          </span>
                        )}
                        {patient.signals.sx > 0 && (
                          <span className="tag tag-lat text-xs">
                            <AlertCircle size={11} />
                            {patient.signals.sx}
                          </span>
                        )}
                      </span>
                    </span>
                  </span>

                  {/* Conditions (Desktop) */}
                  <span className="hidden lg:block">
                    <span className="text-sm text-[var(--ink2)] line-clamp-2">
                      {patient.conditions.join(', ') || 'None recorded'}
                    </span>
                  </span>

                  {/* Last Visit (Desktop) */}
                  <span className="hidden lg:block text-sm text-[var(--ink)]">
                    {patient.lastVisit}
                  </span>

                  {/* Next Visit (Desktop) */}
                  <span className="hidden lg:block text-sm text-[var(--ink)]">
                    {patient.nextVisit}
                  </span>

                  {/* Desktop Signals & Overdue Tag */}
                  <span className="hidden lg:flex flex-wrap items-center gap-1.5">
                    {patient.overdue && (
                      <span className="tag tag-lat text-xs">
                        <Clock size={12} />
                        {t('doctorPatients.overdueSince', { date: patient.overdue })}
                      </span>
                    )}
                    {patient.signals.rep > 0 && (
                      <span className="tag tag-leaf text-xs">
                        <FileText size={12} />
                        {patient.signals.rep} {patient.signals.rep === 1 ? 'report' : 'reports'}
                      </span>
                    )}
                    {patient.signals.rd > 0 && (
                      <span className="tag tag-mist text-xs">
                        <Activity size={12} />
                        {patient.signals.rd} {patient.signals.rd === 1 ? 'reading' : 'readings'}
                      </span>
                    )}
                    {patient.signals.sx > 0 && (
                      <span className="tag tag-lat text-xs">
                        <AlertCircle size={12} />
                        {patient.signals.sx} {patient.signals.sx === 1 ? 'symptom' : 'symptoms'}
                      </span>
                    )}
                  </span>

                  {/* Chevron Right */}
                  <ChevronRight size={20} className="text-[var(--ink3)] flex-none" />
                </button>
              );
            })}
          </div>
        </div>
      ) : others.length === 0 ? (
        <div className="mt-8 p-10 text-center rounded-[20px] bg-white border border-[var(--line)]">
          <Search size={32} className="mx-auto text-[var(--ink3)] mb-2.5 opacity-60" />
          <h2 className="text-lg font-bold text-[var(--ink)]">
            {t('doctorPatients.noPatientsMatch')}
          </h2>
          <p className="text-sm text-[var(--ink2)] mt-1">
            {t('doctorPatients.noPatientsBody')}
          </p>
        </div>
      ) : (
        <p className="text-[var(--ink2)] mt-6 text-sm font-medium">
          {t('doctorPatients.noneMatchCareTeam')}
        </p>
      )}

      {/* Other Patients Outside Care Team (Break-Glass Flow) */}
      {others.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-[var(--ink)] mb-2">
            {t('doctorPatients.otherHospitalPatients')}
          </h2>
          <div className="lock-note mb-3">
            <Lock size={18} className="flex-none mt-0.5 text-[var(--ink3)]" />
            <span>{t('doctorPatients.otherPatientsNote')}</span>
          </div>

          <div className="grp">
            {others.map((patient) => {
              const initials = patient.name
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0])
                .join('')
                .toUpperCase();

              const active = glassActive[patient.id];

              return (
                <div
                  key={patient.id}
                  className="row flex-wrap justify-between items-center gap-3"
                >
                  <span className="flex items-center gap-3 flex-1 min-w-0">
                    <span
                      className="rounded-full flex items-center justify-center font-bold select-none shrink-0 bg-[var(--leaft)] text-[var(--leafd)]"
                      style={{ width: 40, height: 40, fontSize: 15 }}
                      aria-hidden="true"
                    >
                      {initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block text-base text-[var(--ink)] truncate">
                        {patient.name}
                      </b>
                      <span className="block text-sm text-[var(--ink3)] truncate">
                        {patient.mrn}, {patient.phone}
                      </span>
                    </span>
                  </span>

                  {/* Access Button */}
                  {active ? (
                    <button
                      type="button"
                      onClick={() => handleOpenChart(patient.id)}
                      className="btn btn-tint btn-sm"
                    >
                      {t('doctorPatients.openChart')} ({t('doctorPatients.accessActive', { hours: 4 })})
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedEmergencyPatient(patient)}
                      className="btn btn-dline btn-sm"
                    >
                      <ShieldAlert size={16} />
                      {t('doctorPatients.emergencyAccess')}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Emergency Access Break-Glass Modal */}
      {selectedEmergencyPatient && (
        <EmergencyAccessModal
          patient={selectedEmergencyPatient}
          isOpen={Boolean(selectedEmergencyPatient)}
          onClose={() => setSelectedEmergencyPatient(null)}
          onGrant={handleGrantGlass}
        />
      )}
    </div>
  );
}
