import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  X,
  ChevronRight,
  Lock,
  ShieldAlert,
  FileText,
  Activity,
  Check,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { EmergencyAccessModal } from './EmergencyAccessModal';

const DR_RAHUL_STAFF_ID = 'b0000000-0000-0000-0000-000000000003';

interface DbPatient {
  id: string;
  uhid: string;
  full_name: string;
  dob: string;
  gender: string;
  blood_group: string | null;
  phone: string;
  created_at: string;
}

function calculateAge(dobString: string): number {
  const dob = new Date(dobString);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

export function DoctorPatients(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'review' | 'overdue'>('all');
  const [selectedEmergencyPatient, setSelectedEmergencyPatient] = useState<{
    id: string;
    name: string;
    mrn: string;
    phone: string;
    owner?: string;
    dept?: string;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Fetch Patients
  const { data: patients = [] } = useQuery<DbPatient[]>({
    queryKey: ['doctor', 'patients', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('patients').select('*').order('full_name');
      if (error) return [];
      return data || [];
    },
  });

  // 2. Fetch Doctor's Care Team
  const { data: careTeam = [], refetch: refetchCareTeam } = useQuery({
    queryKey: ['doctor', 'patients', 'care_team'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('care_team')
        .select('patient_id, expires_at')
        .eq('staff_id', DR_RAHUL_STAFF_ID)
        .is('revoked_at', null);
      if (error) return [];
      return data || [];
    },
  });

  // 3. Fetch Active Emergency Accesses
  const { data: emergencyAccesses = [], refetch: refetchEmergency } = useQuery({
    queryKey: ['doctor', 'patients', 'emergency_access'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emergency_access')
        .select('patient_id, expires_at, reason')
        .eq('staff_id', DR_RAHUL_STAFF_ID)
        .gt('expires_at', new Date().toISOString());
      if (error) return [];
      return data || [];
    },
  });

  // 4. Fetch Conditions
  const { data: conditions = [] } = useQuery({
    queryKey: ['doctor', 'patients', 'conditions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('conditions').select('patient_id, name, status');
      if (error) return [];
      return data || [];
    },
  });

  // 5. Fetch Pending Documents (for Needs Review signal)
  const { data: pendingDocs = [] } = useQuery({
    queryKey: ['doctor', 'patients', 'pending_docs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('documents').select('patient_id').eq('review_status', 'pending');
      if (error) return [];
      return data || [];
    },
  });

  // 6. Fetch Pending Symptoms (for Needs Review signal)
  const { data: pendingSymptoms = [] } = useQuery({
    queryKey: ['doctor', 'patients', 'pending_symptoms'],
    queryFn: async () => {
      const { data, error } = await supabase.from('symptom_reports').select('patient_id').is('reviewed_at', null);
      if (error) return [];
      return data || [];
    },
  });

  // 7. Fetch Encounters for last visit
  const { data: encounters = [] } = useQuery({
    queryKey: ['doctor', 'patients', 'encounters'],
    queryFn: async () => {
      const { data, error } = await supabase.from('encounters').select('patient_id, signed_at').eq('status', 'signed');
      if (error) return [];
      return data || [];
    },
  });

  // 8. Fetch Upcoming Appointments for next visit
  const { data: appointments = [] } = useQuery({
    queryKey: ['doctor', 'patients', 'appointments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('patient_id, appointment_date')
        .gte('appointment_date', new Date().toISOString())
        .order('appointment_date', { ascending: true });
      if (error) return [];
      return data || [];
    },
  });

  const carePatientIds = new Set(careTeam.map((ct) => ct.patient_id));
  const emergencyPatientMap = new Map(emergencyAccesses.map((ea) => [ea.patient_id, ea]));

  const qq = q.trim().toLowerCase();
  const qd = q.replace(/\D/g, '');

  const matchPatient = (p: DbPatient) =>
    !qq ||
    p.full_name.toLowerCase().includes(qq) ||
    p.uhid.toLowerCase().includes(qq) ||
    (qd.length >= 4 && p.phone.replace(/\D/g, '').includes(qd));


  // Build directory items for care team patients
  const careTeamPatients = patients
    .filter((p) => (carePatientIds.has(p.id) || emergencyPatientMap.has(p.id)) && matchPatient(p))
    .map((p) => {
      const conds = conditions.filter((c) => c.patient_id === p.id && c.status === 'active').map((c) => c.name);
      const repCount = pendingDocs.filter((d) => d.patient_id === p.id).length;
      const sxCount = pendingSymptoms.filter((s) => s.patient_id === p.id).length;

      const lastEnc = encounters
        .filter((e) => e.patient_id === p.id && Boolean(e.signed_at))
        .sort((a, b) => new Date(b.signed_at!).getTime() - new Date(a.signed_at!).getTime())[0];

      const nextAppt = appointments.find((a) => a.patient_id === p.id);

      return {
        id: p.id,
        name: p.full_name,
        mrn: p.uhid,
        phone: p.phone,
        age: calculateAge(p.dob),
        gender: p.gender,
        conditions: conds,
        repCount,
        sxCount,
        lastVisit: lastEnc?.signed_at ? new Date(lastEnc.signed_at).toLocaleDateString([], { day: 'numeric', month: 'short' }) : 'New patient',
        nextVisit: nextAppt ? new Date(nextAppt.appointment_date).toLocaleDateString([], { day: 'numeric', month: 'short' }) : 'None booked',
        isEmergency: emergencyPatientMap.has(p.id),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const filteredLists = {
    all: careTeamPatients,
    review: careTeamPatients.filter((p) => p.repCount > 0 || p.sxCount > 0),
    overdue: careTeamPatients.filter(() => false),
  };

  const list = filteredLists[filter];

  // Patients outside care team
  const others =
    qq.length >= 3
      ? patients
          .filter((p) => !carePatientIds.has(p.id) && !emergencyPatientMap.has(p.id) && matchPatient(p))
          .map((p) => ({
            id: p.id,
            name: p.full_name,
            mrn: p.uhid,
            phone: p.phone,
            age: calculateAge(p.dob),
            gender: p.gender,
            owner: 'Hospital Care Team',
            dept: 'General Medicine',
          }))
      : [];

  const handleGrantGlass = async (targetPid: string, reason: string) => {
    try {
      const { error } = await supabase.rpc('request_emergency_access', {
        p_patient_id: targetPid,
        p_reason: reason,
      });
      if (error) {
        setToastMessage(error.message);
        setTimeout(() => setToastMessage(null), 5000);
        return;
      }
      setSelectedEmergencyPatient(null);
      await refetchEmergency();
      await refetchCareTeam();
      const msg = t('emergencyModal.grantedToast', { time: '4 hours' });
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 5000);
    } catch {
      setToastMessage('Failed to grant emergency access.');
      setTimeout(() => setToastMessage(null), 5000);
    }
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
        <h1 className="disp h1 text-2xl lg:text-3xl font-bold text-[var(--ink)]">
          {t('doctorPatients.title')}
        </h1>
        <p className="mt-1 text-sm text-[var(--ink2)]">
          {t('doctorPatients.subtitle')}
        </p>
      </div>

      {/* Search Bar */}
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
          <span className="text-xs opacity-70 ml-1">{filteredLists.all.length}</span>
        </button>

        <button
          type="button"
          className={`chip press ${filter === 'review' ? 'on' : ''}`}
          onClick={() => setFilter('review')}
        >
          <span>{t('doctorPatients.needsReview')}</span>
          <span className="text-xs opacity-70 ml-1">{filteredLists.review.length}</span>
        </button>

        <button
          type="button"
          className={`chip press ${filter === 'overdue' ? 'on' : ''}`}
          onClick={() => setFilter('overdue')}
        >
          <span>{t('doctorPatients.overdue')}</span>
          <span className="text-xs opacity-70 ml-1">{filteredLists.overdue.length}</span>
        </button>
      </div>

      {/* Care Team Patients List */}
      {list.length > 0 ? (
        <div className="mt-6">
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
                  onClick={() => navigate(`/doctor/chart/${patient.id}`)}
                  className="row prow press text-left w-full"
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
                        {patient.age} yrs, {patient.gender}, {patient.mrn}
                      </span>
                    </span>
                  </span>

                  <span className="hidden lg:block flex-1 min-w-0">
                    <span className="clamp2 text-sm text-[var(--ink2)]">
                      {patient.conditions.join(', ') || 'None recorded'}
                    </span>
                  </span>

                  <span className="hidden lg:block text-sm text-[var(--ink)]">
                    {patient.lastVisit}
                  </span>

                  <span className="hidden lg:block text-sm text-[var(--ink)]">
                    {patient.nextVisit}
                  </span>

                  <span className="hidden lg:flex items-center gap-2">
                    {patient.repCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-[#FFF6E5] text-[#A67814] font-bold">
                        <FileText size={12} />
                        <span>{patient.repCount}</span>
                      </span>
                    )}
                    {patient.sxCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-[#FFF2EE] text-[var(--lat)] font-bold">
                        <Activity size={12} />
                        <span>{patient.sxCount}</span>
                      </span>
                    )}
                    {patient.isEmergency && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-[#FFF2EE] text-[var(--lat)] font-bold">
                        <ShieldAlert size={12} />
                        <span>Emergency</span>
                      </span>
                    )}
                  </span>

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
          <div className="lock-note mb-3 p-3.5 rounded-xl bg-[var(--mist)] text-xs text-[var(--ink2)] flex items-start gap-2">
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

              return (
                <div
                  key={patient.id}
                  className="row flex-wrap justify-between items-center gap-3 p-4 bg-white rounded-xl border border-[var(--line)]"
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

                  <button
                    type="button"
                    onClick={() => setSelectedEmergencyPatient(patient)}
                    className="btn btn-dline btn-sm inline-flex items-center gap-1.5"
                  >
                    <ShieldAlert size={16} />
                    <span>{t('doctorPatients.emergencyAccess')}</span>
                  </button>
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
