import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Check,
  ChevronRight,
  FileText,
  Activity,
  MessageSquare,
  Clock,
  BadgeCheck,
} from 'lucide-react';
import { apiFetch } from '../../lib/api-client';

interface AppointmentRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  status: 'booked' | 'arrived' | 'in_consultation' | 'completed' | 'cancelled';
  notes: string | null;
  patient: {
    id: string;
    uhid: string;
    full_name: string;
    dob: string;
    gender: string;
    phone: string;
  } | null;
}

function calculateAge(dob: string | undefined): number {
  if (!dob) return 48;
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

export function DoctorToday(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // 1. Fetch Today's Appointments for Doctor
  const { data: appointments = [], isLoading: loadingAppts } = useQuery({
    queryKey: ['doctor-today-appointments'],
    queryFn: async () => {
      const data = await apiFetch<{
        appointments: Array<{
          id: string;
          patient_id: string;
          doctor_id: string;
          appointment_date: string;
          status: 'booked' | 'arrived' | 'in_consultation' | 'completed' | 'cancelled';
          notes: string | null;
          patient?: AppointmentRow['patient'];
          patient_name?: string;
          uhid?: string;
          dob?: string;
          gender?: string;
          phone?: string;
        }>;
      }>('/api/doctor/today');
      return (data.appointments || []).map((a) => ({
        ...a,
        patient: a.patient || {
          id: a.patient_id,
          uhid: a.uhid || '',
          full_name: a.patient_name || '',
          dob: a.dob || '',
          gender: a.gender || '',
          phone: a.phone || '',
        },
      })) as AppointmentRow[];
    },
  });

  // 2. Fetch Pending Reports Count for Doctor's patients
  const { data: pendingReports = [] } = useQuery({
    queryKey: ['doctor-pending-reports'],
    queryFn: async () => {
      const data = await apiFetch<{
        reports: Array<{
          id: string;
          title: string;
          patient_id: string;
          report_date: string;
          patients?: { full_name: string; uhid: string };
        }>;
      }>('/api/documents/review-queue');
      return data.reports || [];
    },
  });

  // 3. Fetch Pending Symptoms
  const { data: pendingSymptoms = [] } = useQuery({
    queryKey: ['doctor-pending-symptoms'],
    queryFn: async () => {
      const data = await apiFetch<{
        symptoms: Array<{
          id: string;
          description: string;
          severity: string;
          reported_at: string;
          patients?: { full_name: string };
        }>;
      }>('/api/doctor/symptoms/review-queue');
      return data.symptoms || [];
    },
  });

  // 4. Fetch Allergies for Arun Kumar specifically for the demo ticket
  const { data: arunAllergies = [] } = useQuery({
    queryKey: ['patient-allergies-arun'],
    queryFn: async () => {
      const data = await apiFetch<{
        allergies: Array<{
          substance: string;
          reaction: string;
          severity: string;
        }>;
      }>('/api/doctor/patients/e0000000-0000-0000-0000-000000000001/chart');
      return data.allergies || [];
    },
  });

  const live = appointments.filter((a) => a.status !== 'cancelled');
  const nextAppt =
    live.find((a) => a.patient?.uhid === 'ABC-1001' && (a.status === 'booked' || a.status === 'arrived')) ||
    live.find((a) => a.status === 'booked' || a.status === 'arrived') ||
    live[0] ||
    null;
  const remainingCount = live.filter((a) => a.status === 'booked' || a.status === 'arrived').length;

  const handleOpenChart = (patientId: string) => {
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
        </div>

        <h1 className="disp greet kin mt-1 text-[var(--ink)] whitespace-pre-line">
          {t('doctorToday.goodMorning')}
        </h1>

        <p className="mt-3 text-base text-[var(--ink2)]">
          {remainingCount > 0
            ? t('doctorToday.opDetails', {
                room: 'OPD 4',
                left: remainingCount,
                total: live.length,
              })
            : t('doctorToday.allSeen', { room: 'OPD 4' })}
        </p>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-10">
        {/* Left Column: Next Patient Ticket + Today's Clinic */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          {/* Next Patient Ticket Card */}
          {nextAppt && nextAppt.patient ? (
            <section aria-label="Next patient" className="spring">
              <div className="ticket">
                <div className="tk-main">
                  <p className="text-xs font-semibold tracking-wider uppercase text-white/80">
                    {t('doctorToday.nextPatient', { type: 'Follow-up' })}
                  </p>
                  <p className="tk-name text-white">{nextAppt.patient.full_name}</p>
                  <p className="text-sm text-white/85 mt-0.5">
                    {calculateAge(nextAppt.patient.dob)} yrs, {nextAppt.patient.gender}, {nextAppt.patient.uhid}
                  </p>
                  <p className="mt-3 font-medium text-white/95 text-base">
                    {nextAppt.notes || 'Routine consultation and chronic disease review'}
                  </p>

                  {/* Signals Counters for Arun Kumar */}
                  {nextAppt.patient.uhid === 'ABC-1001' && (
                    <div className="flex flex-wrap gap-2 mt-3.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-xs">
                        <FileText size={13} />
                        1 report
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-xs">
                        <Activity size={13} />
                        5 readings
                      </span>
                    </div>
                  )}

                  {/* Allergy Warning Banner */}
                  {nextAppt.patient.uhid === 'ABC-1001' && arunAllergies.length > 0 && (
                    <div className="flex items-center gap-2 mt-3.5 text-sm font-semibold text-[#F3D27A]">
                      <AlertTriangle size={16} className="flex-none" />
                      <span>
                        {t('doctorToday.allergicTo', {
                          allergies: arunAllergies.map((a) => a.substance.toLowerCase()).join(' and '),
                        })}
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenChart(nextAppt.patient_id)}
                    className="btn btn-light btn-sm mt-5 font-bold"
                  >
                    {t('doctorToday.openChart')}
                  </button>
                </div>

                <div className="tk-stub">
                  <b className="num">09:30</b>
                  <span>AM</span>
                  <span className="mt-1 text-xs font-semibold text-white/70">OPD 4</span>
                </div>
              </div>
            </section>
          ) : (
            <section className="note-card">
              <span className="ico ico-leaf">
                <Check size={20} />
              </span>
              <div>
                <h2 className="h3 font-bold text-[var(--ink)]">
                  {t('doctorToday.noPatientsWaiting')}
                </h2>
                <p className="text-sm text-[var(--ink2)] mt-1">
                  {t('doctorToday.noPatientsWaitingSub')}
                </p>
              </div>
            </section>
          )}

          {/* Today's Clinic List */}
          <section aria-labelledby="clinic-list-heading">
            <div className="flex items-center justify-between mb-3">
              <h2 id="clinic-list-heading" className="text-xl font-bold text-[var(--ink)]">
                {t('doctorToday.todaysClinic')}
              </h2>
              <span className="text-sm font-semibold text-[var(--ink3)]">
                {t('doctorToday.bookedCount', { count: live.length })}
              </span>
            </div>

            {loadingAppts ? (
              <div className="grp p-6 text-center text-[var(--ink3)]">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--leaf)] border-t-transparent mx-auto mb-2" />
                <p className="text-sm">Loading clinic schedule...</p>
              </div>
            ) : live.length === 0 ? (
              <div className="grp p-6 text-center text-[var(--ink3)]">
                <p className="text-sm">No appointments scheduled for today.</p>
              </div>
            ) : (
              <div className="grp">
                {live.map((item) => {
                  const isNext = nextAppt?.id === item.id;
                  const pat = item.patient;
                  const timeStr = new Date(item.appointment_date).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleOpenChart(item.patient_id)}
                      className={`cl press ${isNext ? 'next' : ''}`}
                    >
                      <span className="cl-t">
                        {timeStr}
                        <span className="block text-xs text-[var(--ink3)] font-medium">OPD 4</span>
                      </span>

                      <span className="min-w-0 flex-1 text-left">
                        <b className="block truncate text-[var(--ink)] text-base">
                          {pat?.full_name || 'Patient'}
                        </b>
                        <span className="block text-sm text-[var(--ink2)] truncate">
                          {item.notes || 'Review consultation'}
                        </span>
                        {pat?.uhid === 'ABC-1001' && (
                          <span className="flex flex-wrap gap-1.5 mt-1.5">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <FileText size={12} /> 1 report
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <Activity size={12} /> 5 readings
                            </span>
                          </span>
                        )}
                      </span>

                      <span>
                        {item.status === 'completed' ? (
                          <span className="tag tag-leaf">
                            <BadgeCheck size={14} /> Signed
                          </span>
                        ) : isNext ? (
                          <span className="tag tag-leaf">Next</span>
                        ) : (
                          <ChevronRight size={20} className="text-[var(--ink3)]" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Waiting Queues */}
        <div className="lg:col-span-5 mt-8 lg:mt-0 flex flex-col gap-6">
          <section aria-labelledby="waiting-heading">
            <h2 id="waiting-heading" className="text-xl font-bold text-[var(--ink)] mb-3">
              {t('doctorToday.waitingForYou')}
            </h2>

            <div className="grp">
              {/* Reports waiting row */}
              <div className="row">
                <span className="ico ico-leaf">
                  <FileText size={18} />
                </span>
                <span className="flex-1 min-w-0">
                  <b className="block text-[var(--ink)] font-semibold">
                    {pendingReports.length > 0
                      ? `${pendingReports.length} report to review`
                      : 'No reports waiting'}
                  </b>
                  {pendingReports[0] && (
                    <span className="block text-sm text-[var(--ink3)] truncate">
                      {pendingReports[0].title}
                    </span>
                  )}
                </span>
                {pendingReports.length > 0 && (
                  <button
                    type="button"
                    onClick={() => navigate('/doctor/review')}
                    className="btn btn-tint btn-sm"
                  >
                    {t('doctorToday.review')}
                  </button>
                )}
              </div>

              {/* Symptoms waiting row */}
              <div className="row">
                <span className="ico ico-zari">
                  <MessageSquare size={18} />
                </span>
                <span className="flex-1 min-w-0">
                  <b className="block text-[var(--ink)] font-semibold">
                    {pendingSymptoms.length > 0
                      ? `${pendingSymptoms.length} symptom reported`
                      : 'No symptoms waiting'}
                  </b>
                  {pendingSymptoms[0] && (
                    <span className="block text-sm text-[var(--ink3)] truncate">
                      {pendingSymptoms[0].description}
                    </span>
                  )}
                </span>
                {pendingSymptoms.length > 0 && (
                  <button
                    type="button"
                    onClick={() => navigate('/doctor/review')}
                    className="btn btn-tint btn-sm"
                  >
                    {t('doctorToday.review')}
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Overdue Follow-up Notice */}
          <section className="note-card">
            <span className="ico ico-lat">
              <Clock size={20} />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="h3 text-[var(--ink)] font-bold">
                Arun Kumar's follow-up is overdue
              </h3>
              <p className="text-sm text-[var(--ink2)] mt-1">
                Fasting blood sugar & lipid follow-up was due 3 days ago.
              </p>
              <button
                type="button"
                onClick={() => handleOpenChart('e0000000-0000-0000-0000-000000000001')}
                className="btn btn-sec btn-sm mt-3"
              >
                Open patient chart
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
