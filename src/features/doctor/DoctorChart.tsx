import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronDown,
  Pencil,
  BadgeCheck,
  AlertTriangle,
  Lock,
  Plus,
  ShieldAlert,
  FileText,
  MessageSquare,
  Clock,
  Activity,
  Check,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { NoteComposer } from './NoteComposer';
import { AddendumModal } from './AddendumModal';
import { EmergencyAccessModal } from './EmergencyAccessModal';

interface PatientRecord {
  id: string;
  uhid: string;
  full_name: string;
  dob: string;
  gender: string;
  blood_group: string | null;
  phone: string;
  created_at: string;
}

interface AllergyRecord {
  id: string;
  substance: string;
  reaction: string;
  severity: string;
}

interface ConditionRecord {
  id: string;
  name: string;
  status: string;
  diagnosed_date: string | null;
}

interface EncounterAddendum {
  id: string;
  reason: string;
  notes: string;
  created_at: string;
}

interface EncounterRecord {
  id: string;
  patient_id: string;
  doctor_id: string;
  chief_complaint: string | null;
  clinical_notes: string | null;
  diagnosis: string | null;
  status: string;
  sensitivity: string;
  signed_at: string | null;
  created_at: string;
  staff?: { full_name: string } | null;
  departments?: { name: string } | null;
  encounter_addenda?: EncounterAddendum[];
}

interface WhatChangedItem {
  happened_at: string;
  kind: 'report' | 'medicine' | 'reading' | 'missed' | 'symptom';
  summary: string;
  ref_table: string;
  ref_id: string;
}

interface ObservationRecord {
  id: string;
  kind: string;
  value_text: string;
  unit: string | null;
  measured_at: string;
  source: string;
  out_of_range: boolean;
}

interface DocumentRecord {
  id: string;
  title: string;
  type: string;
  storage_path: string;
  report_date: string;
  source: string;
  review_status: string;
  reviewed_at: string | null;
}

interface MedicationRecord {
  id: string;
  drug: string;
  dose: string;
  timing: Record<string, boolean> | null;
  instructions: string | null;
  status: string;
  created_at: string;
  stopped_at: string | null;
}

interface DietGuide {
  id: string;
  title_en: string;
  title_ml: string;
  eat_more_en: string;
  eat_more_ml: string;
  eat_less_en: string;
  eat_less_ml: string;
  avoid_en: string;
  avoid_ml: string;
  tips_en: string;
  tips_ml: string;
}

interface CarePlanItem {
  id: string;
  kind: string;
  detail: string;
  due_date: string | null;
  status: string;
  diet_guide_id?: string | null;
  doctor_note?: string | null;
  diet_guides?: DietGuide | null;
}

interface CarePlanRecord {
  id: string;
  status: string;
  review_date: string | null;
  created_at: string;
  care_plan_items?: CarePlanItem[];
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

export function DoctorChart(): React.JSX.Element {
  const { id: patientId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [activeTab, setActiveTab] = useState<'changes' | 'visits' | 'readings' | 'reports' | 'meds' | 'plan'>('changes');
  const [selectedReadingKind, setSelectedReadingKind] = useState<string>('Blood Pressure');
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedEncounterForAddendum, setSelectedEncounterForAddendum] = useState<EncounterRecord | null>(null);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [expandedEncounterId, setExpandedEncounterId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Review Sheet State (for reviewing reports right from What Changed / Reports tab)
  const [reviewSheetDoc, setReviewSheetDoc] = useState<DocumentRecord | null>(null);
  const [docReviewComment, setDocReviewComment] = useState('');
  const [docReviewNextStep, setDocReviewNextStep] = useState<string>('no_action');
  const [docReviewSubmitting, setDocReviewSubmitting] = useState(false);

  // Symptom Sheet State
  const [symptomSheetItem, setSymptomSheetItem] = useState<{ id: string; text: string } | null>(null);
  const [symptomAction, setSymptomAction] = useState('Called the patient');
  const [symptomNote, setSymptomNote] = useState('');
  const [symptomSubmitting, setSymptomSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Fetch Patient Demographics
  const {
    data: patient,
    isLoading: patientLoading,
    error: patientError,
  } = useQuery<PatientRecord | null>({
    queryKey: ['doctor', 'patient', patientId],
    queryFn: async () => {
      if (!patientId) return null;
      try {
        const res = await apiFetch<{ patient: PatientRecord }>(`/api/doctor/patients/${patientId}/chart`);
        return res.patient || null;
      } catch {
        return null;
      }
    },
    enabled: Boolean(patientId),
  });

  // 2. Check Care Team Link
  const { data: careTeamLink, refetch: refetchCareTeam } = useQuery({
    queryKey: ['doctor', 'care_team_check', patientId],
    queryFn: async () => {
      if (!patientId) return null;
      try {
        const res = await apiFetch<{ careTeam: Array<{ patient_id: string }> }>('/api/doctor/care-team');
        return (res.careTeam || []).find((c) => c.patient_id === patientId) || null;
      } catch {
        return null;
      }
    },
    enabled: Boolean(patientId),
  });

  // 3. Check Active Emergency Access
  const { data: activeEmergency, refetch: refetchEmergency } = useQuery({
    queryKey: ['doctor', 'emergency_check', patientId],
    queryFn: async () => {
      if (!patientId) return null;
      try {
        const res = await apiFetch<{ emergencyAccess: Array<{ id: string; patient_id: string; reason: string; expires_at: string }> }>('/api/doctor/emergency-access');
        return (res.emergencyAccess || []).find((ea) => ea.patient_id === patientId) || null;
      } catch {
        return null;
      }
    },
    enabled: Boolean(patientId),
  });

  const hasAccess = Boolean(careTeamLink || activeEmergency);

  // 4. Clinical Full Chart Bundle Query (Enabled only when hasAccess is true)
  const { data: fullChartData, refetch: refetchFullChart } = useQuery({
    queryKey: ['doctor', 'full_chart_bundle', patientId],
    queryFn: async () => {
      if (!patientId || !hasAccess) return null;
      return apiFetch<{
        patient: PatientRecord;
        allergies: AllergyRecord[];
        conditions: ConditionRecord[];
        encounters: EncounterRecord[];
        observations: ObservationRecord[];
        documents: DocumentRecord[];
        medications: MedicationRecord[];
        carePlans: CarePlanRecord[];
      }>(`/api/doctor/patients/${patientId}/chart`);
    },
    enabled: Boolean(patientId && hasAccess),
  });

  const allergies: AllergyRecord[] = fullChartData?.allergies || [];
  const conditions: ConditionRecord[] = fullChartData?.conditions || [];
  const encounters: EncounterRecord[] = fullChartData?.encounters || [];
  const refetchEncounters = refetchFullChart;

  const { data: whatChangedData, refetch: refetchWhatChanged } = useQuery({
    queryKey: ['doctor', 'what_changed', patientId],
    queryFn: async (): Promise<WhatChangedItem[]> => {
      try {
        const res = await apiFetch<{ items: WhatChangedItem[] }>(
          `/api/doctor/patients/${patientId}/what-changed`
        );
        return res.items || [];
      } catch {
        return [];
      }
    },
    enabled: Boolean(patientId && hasAccess),
  });
  const whatChangedItems: WhatChangedItem[] = whatChangedData || [];

  const observations: ObservationRecord[] = fullChartData?.observations || [];
  const documents: DocumentRecord[] = fullChartData?.documents || [];
  const refetchDocuments = refetchFullChart;
  const medications: MedicationRecord[] = fullChartData?.medications || [];
  const refetchMedications = refetchFullChart;
  const carePlans: CarePlanRecord[] = fullChartData?.carePlans || [];
  const refetchCarePlans = refetchFullChart;

  const activeCarePlan = carePlans[0] || null;

  // Check if a note was signed today
  const todaysSignedEncounter = encounters.find((enc) => {
    if (!enc.signed_at) return false;
    const signedDate = new Date(enc.signed_at).toDateString();
    const todayDate = new Date().toDateString();
    return signedDate === todayDate;
  });

  // Handle granting emergency access
  const handleGrantEmergency = async (targetPid: string, reason: string) => {
    try {
      await apiFetch('/api/doctor/emergency-access', {
        method: 'POST',
        body: JSON.stringify({ patientId: targetPid, reason }),
      });
      setEmergencyModalOpen(false);
      await refetchEmergency();
      await refetchCareTeam();
      await refetchFullChart();
      showToast('Emergency break-glass access granted for 4 hours.');
    } catch {
      showToast('Failed to request emergency access.');
    }
  };

  // Handle ending emergency access early
  const handleEndEmergency = async () => {
    if (!activeEmergency) return;
    try {
      await apiFetch(`/api/doctor/emergency-access/${activeEmergency.id}/end`, {
        method: 'POST',
      });
      await refetchEmergency();
      showToast('Emergency access ended.');
    } catch {
      showToast('Failed to end emergency access.');
    }
  };

  // Handle Review Document Submission
  const handleReviewDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewSheetDoc) return;
    if (!docReviewComment.trim()) {
      showToast('Please provide a comment for the patient.');
      return;
    }
    setDocReviewSubmitting(true);
    try {
      await apiFetch(`/api/documents/${reviewSheetDoc.id}/review`, {
        method: 'POST',
      });

      showToast(t('doctorReview.reviewSaved'));
      setReviewSheetDoc(null);
      setDocReviewComment('');
      await refetchDocuments();
      await refetchWhatChanged();
    } catch {
      showToast('Failed to save report review.');
    } finally {
      setDocReviewSubmitting(false);
    }
  };

  // Handle Symptom Seen Submission
  const handleSymptomSeen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptomSheetItem) return;
    setSymptomSubmitting(true);
    try {
      await apiFetch(`/api/doctor/symptoms/${symptomSheetItem.id}/review`, {
        method: 'POST',
      });

      showToast(t('doctorReview.symptomSeenSaved'));
      setSymptomSheetItem(null);
      setSymptomNote('');
      await refetchWhatChanged();
    } catch {
      showToast('Failed to mark symptom seen.');
    } finally {
      setDocReviewSubmitting(false);
    }
  };

  if (patientLoading) {
    return (
      <div className="flex items-center justify-center p-16 text-center text-[var(--ink3)]">
        <Activity className="animate-spin mr-3 text-[var(--leaf)]" size={24} />
        <span className="font-medium text-lg">Loading patient chart...</span>
      </div>
    );
  }

  if (patientError || !patient) {
    return (
      <div className="p-8">
        <button
          type="button"
          onClick={() => navigate('/doctor/today')}
          className="back press inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--ink2)] mb-4"
        >
          <ChevronLeft size={20} />
          <span>{t('doctorToday.today')}</span>
        </button>
        <div className="note-card p-6 rounded-2xl bg-white border border-[var(--line)]">
          <h2 className="text-xl font-bold text-[var(--ink)]">Patient record not found</h2>
          <p className="text-sm text-[var(--ink2)] mt-1">
            Could not find a record matching this identifier.
          </p>
        </div>
      </div>
    );
  }

  // If patient exists but doctor doesn't have care team link or active emergency access:
  if (!hasAccess) {
    return (
      <div className="staff-theme w-full pt-3 lg:pt-0 max-w-xl mx-auto">
        <button
          type="button"
          onClick={() => navigate('/doctor/patients')}
          className="back press inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--ink2)] mb-4"
        >
          <ChevronLeft size={20} />
          <span>{t('doctorToday.patients')}</span>
        </button>

        <h1 className="disp h1 text-2xl font-bold text-[var(--ink)]">{patient.full_name}</h1>
        <p className="text-sm text-[var(--ink2)] mt-1">
          {patient.uhid} &bull; {patient.phone}
        </p>

        <div className="note-card mt-6 p-6 rounded-2xl bg-white border border-[var(--line)] shadow-xs flex items-start gap-4">
          <span className="ico ico-mist p-3 rounded-full bg-[var(--mist)] text-[var(--ink3)] flex-none">
            <Lock size={24} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-[var(--ink)]">Not in your care team</h2>
            <p className="text-sm text-[var(--ink2)] mt-1.5 leading-relaxed">
              You can see contact details only. If you need this clinical record to treat the patient now, use emergency break-glass access.
            </p>
            <button
              type="button"
              className="btn btn-dline sm mt-5 inline-flex items-center gap-2"
              onClick={() => setEmergencyModalOpen(true)}
            >
              <ShieldAlert size={18} />
              <span>Emergency access</span>
            </button>
          </div>
        </div>

        {emergencyModalOpen && (
          <EmergencyAccessModal
            patient={{
              id: patient.id,
              name: patient.full_name,
              mrn: patient.uhid,
              phone: patient.phone,
              owner: 'Hospital Care Team',
              dept: 'General Medicine',
            }}
            isOpen={emergencyModalOpen}
            onClose={() => setEmergencyModalOpen(false)}
            onGrant={handleGrantEmergency}
          />
        )}
      </div>
    );
  }

  const patientAge = calculateAge(patient.dob);
  const activeConditionsList = conditions.filter((c) => c.status === 'active');
  const pastConditionsList = conditions.filter((c) => c.status !== 'active');
  const activeMedicationsList = medications.filter((m) => m.status === 'active');
  const stoppedMedicationsList = medications.filter((m) => m.status !== 'active');

  // Filter observations by selected kind
  const filteredObservations = observations.filter((o) => {
    if (selectedReadingKind === 'Blood Pressure') return o.kind.toLowerCase().includes('pressure') || o.kind === 'BP';
    if (selectedReadingKind === 'Fasting Sugar') return o.kind.toLowerCase().includes('sugar') || o.kind.toLowerCase().includes('glucose');
    if (selectedReadingKind === 'HbA1c') return o.kind.toLowerCase().includes('hba1c');
    if (selectedReadingKind === 'Weight') return o.kind.toLowerCase().includes('weight');
    return true;
  });

  return (
    <div className="staff-theme w-full">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-white shadow-xl animate-in fade-in"
          role="status"
        >
          <CheckCircle2 size={18} className="text-[#C9A43B]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Emergency Active Banner */}
      {activeEmergency && (
        <div className="ebanner mb-6 p-4 rounded-2xl bg-[#FFF5F2] border border-[#F5B9AB] flex items-center justify-between gap-4" role="alert">
          <div className="flex items-center gap-3">
            <ShieldAlert size={24} className="text-[var(--lat)] flex-none" />
            <div className="text-sm">
              <b className="block text-[var(--lat)] font-bold">
                Emergency access active until {new Date(activeEmergency.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </b>
              <span className="text-[var(--ink2)]">
                Reason: {activeEmergency.reason}. Access is logged and audited by hospital administration.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleEndEmergency}
            className="btn btn-sm btn-light press flex-none text-xs"
          >
            End access now
          </button>
        </div>
      )}

      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between gap-3 pt-2 mb-4">
        <button
          type="button"
          onClick={() => navigate('/doctor/today')}
          className="back press inline-flex items-center gap-1 text-sm font-semibold text-[var(--ink2)]"
        >
          <ChevronLeft size={20} />
          <span>{t('doctorToday.today')}</span>
        </button>
      </div>

      {/* Patient Header Card */}
      <div className="bg-white rounded-[24px] border border-[var(--line)] p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-full bg-[var(--leaft)] text-[var(--leafd)] flex items-center justify-center font-bold text-xl flex-none select-none"
              aria-hidden="true"
            >
              {patient.full_name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--ink)] tracking-tight">
                {patient.full_name}
              </h1>
              <p className="text-sm text-[var(--ink2)] mt-0.5">
                {patientAge} yrs, {patient.gender}, {patient.uhid}, {patient.phone}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {activeConditionsList.map((cond) => (
                  <span key={cond.id} className="cond text-xs px-2.5 py-1 rounded-md bg-[var(--mist)] text-[var(--ink)] font-medium">
                    {cond.name}
                  </span>
                ))}
                {pastConditionsList.length > 0 && (
                  <span className="text-xs text-[var(--ink3)]">
                    Past: {pastConditionsList.map((c) => c.name.toLowerCase()).join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Primary Action Button: Consultation Note */}
          <div>
            {todaysSignedEncounter ? (
              <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--leaft)] text-[var(--leafd)] font-semibold text-sm">
                <BadgeCheck size={18} />
                <span>Note signed today</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setComposerOpen(true)}
                className="btn btn-primary inline-flex items-center gap-2"
              >
                <Pencil size={18} />
                <span>{t('doctorChart.startNote')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Allergy Warning Alert */}
        {allergies.length > 0 && (
          <div className="mt-5 p-3 rounded-xl bg-[#FFF8EB] border border-[#F3D27A] flex items-center gap-2.5 text-sm font-semibold text-[#8C6D1F]" role="alert">
            <AlertTriangle size={18} className="text-[#C9A43B] flex-none" />
            <span>
              Allergic to {allergies.map((a) => `${a.substance} (${a.reaction})`).join(', ')}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-[var(--ink3)] mt-4 pt-3 border-t border-[var(--line)]">
          <Eye size={14} className="flex-none" />
          <span>
            In your care team. Every chart opening is logged and reviewed under DPDP Act compliance.
          </span>
        </div>
      </div>

      {/* 6 Tabs Navigation */}
      <div className="hscroll flex gap-2 mt-6 overflow-x-auto pb-1" role="tablist" aria-label="Chart sections">
        {[
          { key: 'changes', label: t('doctorChart.tabChanges'), badge: whatChangedItems.length },
          { key: 'visits', label: t('doctorChart.tabVisits'), count: encounters.length },
          { key: 'readings', label: t('doctorChart.tabReadings'), count: observations.length },
          { key: 'reports', label: t('doctorChart.tabReports'), count: documents.length },
          { key: 'meds', label: t('doctorChart.tabMeds'), count: activeMedicationsList.length },
          { key: 'plan', label: t('doctorChart.tabPlan'), count: activeCarePlan?.care_plan_items?.length || 0 },
        ].map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`pill press px-4 py-2 rounded-full font-semibold text-sm transition-colors flex items-center gap-1.5 ${
              activeTab === tab.key
                ? 'bg-[var(--leaf)] text-white shadow-xs'
                : 'bg-white text-[var(--ink2)] border border-[var(--line)] hover:bg-[var(--mist)]'
            }`}
            onClick={() => setActiveTab(tab.key as 'changes' | 'visits' | 'readings' | 'reports' | 'meds' | 'plan')}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={`pill-n text-xs px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === tab.key ? 'bg-white/30 text-white' : 'bg-[var(--mist)] text-[var(--ink)]'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      <div className="mt-6">
        {/* 1. WHAT CHANGED TAB */}
        {activeTab === 'changes' && (
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            <section className="lg:col-span-7" aria-label="What changed since the last visit">
              <h2 className="text-lg font-bold text-[var(--ink)] mb-3">
                {t('doctorChart.tabChanges')}
              </h2>

              {whatChangedItems.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-[var(--line)] text-[var(--ink3)]">
                  <BadgeCheck size={32} className="mx-auto text-[var(--leaf)] mb-2" />
                  <p className="font-semibold text-base text-[var(--ink)]">Nothing new since last visit</p>
                  <p className="text-sm mt-1">No pending reports, out-of-range readings, or reported symptoms.</p>
                </div>
              ) : (
                <ol className="flex flex-col gap-3">
                  {whatChangedItems.map((item, idx) => {
                    const isReport = item.kind === 'report';
                    const isReading = item.kind === 'reading';
                    const isSymptom = item.kind === 'symptom';
                    const isMissed = item.kind === 'missed';

                    const Icon = isReport
                      ? FileText
                      : isReading
                      ? Activity
                      : isSymptom
                      ? MessageSquare
                      : Clock;

                    const dateFormatted = new Date(item.happened_at).toLocaleDateString([], {
                      day: 'numeric',
                      month: 'short',
                    });

                    return (
                      <li
                        key={`${item.ref_id}-${idx}`}
                        className="chg-i bg-white p-4 rounded-2xl border border-[var(--line)] shadow-xs flex items-start gap-3.5"
                      >
                        <span className="text-xs font-bold text-[var(--ink3)] w-14 flex-none pt-0.5">
                          {dateFormatted}
                        </span>
                        <span className={`p-2 rounded-xl flex-none ${
                          isReading || isMissed
                            ? 'bg-[#FFF2EE] text-[var(--lat)]'
                            : 'bg-[var(--leaft)] text-[var(--leaf)]'
                        }`}>
                          <Icon size={18} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <b className="block text-sm text-[var(--ink)] leading-snug">
                            {item.summary}
                          </b>
                          {isReading && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReadingKind('Blood Pressure');
                                setActiveTab('readings');
                              }}
                              className="btn btn-sm btn-light press mt-2 text-xs"
                            >
                              See trend
                            </button>
                          )}
                          {isReport && (
                            <button
                              type="button"
                              onClick={() => {
                                const foundDoc: DocumentRecord = documents.find((d) => d.id === item.ref_id) || {
                                  id: item.ref_id,
                                  title: item.summary.replace('New report: ', ''),
                                  type: 'lab',
                                  storage_path: '',
                                  report_date: item.happened_at ? item.happened_at.split('T')[0] || '' : '',
                                  source: 'patient',
                                  review_status: 'pending',
                                  reviewed_at: null,
                                };
                                setReviewSheetDoc(foundDoc);
                              }}
                              className="btn btn-sm btn-primary press mt-2 text-xs inline-flex items-center gap-1"
                            >
                              <FileText size={14} />
                              <span>{t('doctorChart.reviewNow')}</span>
                            </button>
                          )}
                          {isSymptom && (
                            <button
                              type="button"
                              onClick={() => {
                                setSymptomSheetItem({
                                  id: item.ref_id,
                                  text: item.summary.replace('Patient reported: ', ''),
                                });
                              }}
                              className="btn btn-sm btn-primary press mt-2 text-xs inline-flex items-center gap-1"
                            >
                              <Check size={14} />
                              <span>{t('doctorReview.markSeen')}</span>
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            {/* Right Column: Mini Readings & Care Plan adherence */}
            <aside className="lg:col-span-5 mt-8 lg:mt-0 flex flex-col gap-6">
              <div className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-xs">
                <h3 className="font-bold text-base text-[var(--ink)] mb-3">Latest readings</h3>
                <div className="grid grid-cols-2 gap-3">
                  {['Blood Pressure', 'HbA1c', 'Fasting Sugar', 'Weight'].map((k) => {
                    const term = k.toLowerCase().split(' ')[0] || '';
                    const matchObs = observations.find((o) => o.kind.toLowerCase().includes(term));
                    return (
                      <div
                        key={k}
                        onClick={() => {
                          setSelectedReadingKind(k);
                          setActiveTab('readings');
                        }}
                        className="tile press p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] cursor-pointer hover:border-[var(--leaf)] transition-colors"
                      >
                        <span className="text-xs font-semibold text-[var(--ink3)] block">{k}</span>
                        <b className="text-xl font-bold text-[var(--ink)] block mt-1">
                          {matchObs ? matchObs.value_text : '—'}
                        </b>
                        <span className="text-xs text-[var(--ink3)] block mt-0.5">
                          {matchObs ? `${matchObs.unit || ''} • ${matchObs.source}` : 'No data'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {activeCarePlan && (
                <div className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-xs">
                  <h3 className="font-bold text-base text-[var(--ink)] mb-1">
                    {t('doctorChart.keepingToPlan')}
                  </h3>
                  <p className="text-xs text-[var(--ink3)] mb-4">
                    Active plan from {new Date(activeCarePlan.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </p>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-[var(--ink2)] mb-1">
                        <span>Medicine doses marked taken</span>
                        <span>85%</span>
                      </div>
                      <div className="w-full bg-[var(--line)] rounded-full h-2 overflow-hidden">
                        <div className="bg-[var(--leaf)] h-full rounded-full" style={{ width: '85%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-[var(--ink2)] mb-1">
                        <span>Home BP checks done</span>
                        <span>5 of 7</span>
                      </div>
                      <div className="w-full bg-[var(--line)] rounded-full h-2 overflow-hidden">
                        <div className="bg-[var(--leaf)] h-full rounded-full" style={{ width: '71%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}

        {/* 2. VISITS TAB */}
        {activeTab === 'visits' && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[var(--ink)]">{t('doctorChart.tabs.visits')}</h2>
              {!todaysSignedEncounter && (
                <button
                  type="button"
                  onClick={() => setComposerOpen(true)}
                  className="btn btn-sm btn-primary inline-flex items-center gap-1.5"
                >
                  <Plus size={16} />
                  <span>{t('doctorChart.newNote')}</span>
                </button>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--mist)] text-xs text-[var(--ink2)] flex items-start gap-2 mb-4">
              <Lock size={16} className="text-[var(--ink3)] flex-none mt-0.5" />
              <span>{t('doctorChart.signedNotesLock')}</span>
            </div>

            {encounters.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-[var(--line)] text-[var(--ink3)]">
                <p className="font-semibold text-base text-[var(--ink)]">No visits recorded yet</p>
                <p className="text-sm mt-1">Today's note will become the first consultation entry.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {encounters.map((enc) => {
                  const isExpanded = expandedEncounterId === enc.id;
                  const dateStr = new Date(enc.signed_at || enc.created_at).toLocaleDateString([], {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <article
                      key={enc.id}
                      className="note bg-white rounded-2xl border border-[var(--line)] p-5 shadow-xs"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedEncounterId(isExpanded ? null : enc.id)}
                        className="w-full text-left flex items-start justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <span className="p-2 rounded-xl bg-[var(--leaft)] text-[var(--leaf)] flex-none">
                            <BadgeCheck size={20} />
                          </span>
                          <div>
                            <b className="block text-base text-[var(--ink)] font-bold">{dateStr}</b>
                            <span className="block text-xs text-[var(--ink3)] mt-0.5">
                              {enc.staff?.full_name || 'Dr. Rahul Menon'} &bull; {enc.departments?.name || 'General Medicine'}
                            </span>
                            <span className="block text-sm text-[var(--ink2)] mt-1 font-medium">
                              {enc.chief_complaint || 'General follow-up consultation'}
                            </span>
                          </div>
                        </div>
                        <ChevronDown
                          size={20}
                          className={`text-[var(--ink3)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-[var(--line)] space-y-3 text-sm">
                          {enc.diagnosis && (
                            <div>
                              <span className="text-xs font-bold text-[var(--ink3)] uppercase tracking-wider block">
                                Diagnosis
                              </span>
                              <p className="font-semibold text-[var(--ink)] mt-0.5">{enc.diagnosis}</p>
                            </div>
                          )}

                          {enc.clinical_notes && (
                            <div>
                              <span className="text-xs font-bold text-[var(--ink3)] uppercase tracking-wider block">
                                Findings & Notes
                              </span>
                              <p className="text-[var(--ink2)] mt-0.5 leading-relaxed">{enc.clinical_notes}</p>
                            </div>
                          )}

                          {/* Addenda List */}
                          {enc.encounter_addenda && enc.encounter_addenda.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-dashed border-[var(--line)] space-y-2">
                              <span className="text-xs font-bold text-[var(--lat)] uppercase tracking-wider block">
                                Corrections & Addenda
                              </span>
                              {enc.encounter_addenda.map((addendum) => (
                                <div key={addendum.id} className="p-3 rounded-xl bg-[#FFF9F5] border border-[#F5D5C6]">
                                  <div className="flex items-center justify-between text-xs font-semibold text-[var(--ink2)]">
                                    <span>Correction ({addendum.reason})</span>
                                    <span>{new Date(addendum.created_at).toLocaleDateString()}</span>
                                  </div>
                                  <p className="text-sm text-[var(--ink)] mt-1">{addendum.notes}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add a correction button */}
                          <div className="pt-3">
                            <button
                              type="button"
                              onClick={() => setSelectedEncounterForAddendum(enc)}
                              className="btn btn-sm btn-light press inline-flex items-center gap-1.5 text-xs"
                            >
                              <Plus size={14} />
                              <span>{t('doctorChart.addCorrection')}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. READINGS TAB */}
        {activeTab === 'readings' && (
          <div className="space-y-6">
            {/* Reading Kind Chips */}
            <div className="flex flex-wrap gap-2">
              {['Blood Pressure', 'Fasting Sugar', 'HbA1c', 'Weight'].map((metric) => (
                <button
                  key={metric}
                  type="button"
                  className={`chip press px-3.5 py-1.5 rounded-full text-sm font-semibold ${
                    selectedReadingKind === metric ? 'on bg-[var(--leaf)] text-white' : 'bg-white text-[var(--ink2)] border border-[var(--line)]'
                  }`}
                  onClick={() => setSelectedReadingKind(metric)}
                >
                  {metric}
                </button>
              ))}
            </div>

            <div className="lg:grid lg:grid-cols-12 lg:gap-8">
              {/* Latest Focus Card */}
              <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-[var(--line)] shadow-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-[var(--ink3)] uppercase tracking-wider block">
                      {selectedReadingKind}
                    </span>
                    <b className="text-3xl font-extrabold text-[var(--ink)] block mt-1">
                      {filteredObservations[0]?.value_text || '—'}
                      <span className="text-base font-normal text-[var(--ink3)] ml-2">
                        {filteredObservations[0]?.unit || ''}
                      </span>
                    </b>
                    <span className="text-xs text-[var(--ink3)] block mt-1">
                      {filteredObservations[0]
                        ? `Recorded ${new Date(filteredObservations[0].measured_at).toLocaleDateString([], {
                            day: 'numeric',
                            month: 'short',
                          })} (${filteredObservations[0].source === 'clinic' ? t('doctorChart.hospital') : t('doctorChart.patientReported')})`
                        : 'No observations logged'}
                    </span>
                  </div>
                  {filteredObservations[0] && (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        filteredObservations[0].out_of_range
                          ? 'bg-[#FFF2EE] text-[var(--lat)]'
                          : 'bg-[var(--leaft)] text-[var(--leaf)]'
                      }`}
                    >
                      {filteredObservations[0].out_of_range
                        ? t('doctorChart.outsideTarget')
                        : t('doctorChart.inTarget')}
                    </span>
                  )}
                </div>

                {/* Target Guideline Notice */}
                <p className="text-xs text-[var(--ink3)] mt-4 pt-3 border-t border-[var(--line)]">
                  Clinical Target: {selectedReadingKind === 'Blood Pressure' ? '< 130/80 mmHg' : selectedReadingKind === 'HbA1c' ? '< 7.0 %' : 'In prescribed clinical band'}.
                </p>
              </div>

              {/* History List */}
              <div className="lg:col-span-5 mt-6 lg:mt-0">
                <h3 className="font-bold text-base text-[var(--ink)] mb-3">History</h3>
                {filteredObservations.length === 0 ? (
                  <p className="text-sm text-[var(--ink3)]">{t('doctorChart.noReadings')}</p>
                ) : (
                  <div className="bg-white rounded-2xl border border-[var(--line)] divide-y divide-[var(--line)] shadow-xs">
                    {filteredObservations.map((obs) => (
                      <div key={obs.id} className="p-3.5 flex items-center justify-between text-sm">
                        <div>
                          <b className="block text-[var(--ink)] font-bold">
                            {obs.value_text} {obs.unit}
                          </b>
                          <span className="text-xs text-[var(--ink3)]">
                            {new Date(obs.measured_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md font-semibold ${
                            obs.source === 'clinic'
                              ? 'bg-[var(--leaft)] text-[var(--leaf)]'
                              : 'bg-[var(--mist)] text-[var(--ink2)]'
                          }`}
                        >
                          {obs.source === 'clinic' ? t('doctorChart.hospital') : t('doctorChart.patientReported')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. REPORTS TAB */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[var(--ink)]">{t('doctorChart.tabs.reports')}</h2>

            {documents.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-[var(--line)] text-[var(--ink3)]">
                <FileText size={32} className="mx-auto text-[var(--ink3)] mb-2" />
                <p className="font-semibold text-base text-[var(--ink)]">{t('doctorChart.noReports')}</p>
                <p className="text-sm mt-1">Lab reports and uploads from patient appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map((doc) => {
                  const isPending = doc.review_status === 'pending';
                  return (
                    <div
                      key={doc.id}
                      className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            isPending ? 'bg-[#FFF6E5] text-[#A67814]' : 'bg-[var(--leaft)] text-[var(--leaf)]'
                          }`}>
                            {isPending ? t('doctorChart.waitingReview') : t('doctorChart.reviewed')}
                          </span>
                          <span className="text-xs text-[var(--ink3)]">{doc.report_date}</span>
                        </div>
                        <h3 className="text-base font-bold text-[var(--ink)]">{doc.title}</h3>
                        <p className="text-xs text-[var(--ink3)] mt-1">
                          Source: {doc.source} &bull; Type: {doc.type}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[var(--line)] flex items-center justify-end">
                        {isPending ? (
                          <button
                            type="button"
                            onClick={() => setReviewSheetDoc(doc)}
                            className="btn btn-sm btn-primary press inline-flex items-center gap-1.5 text-xs"
                          >
                            <FileText size={14} />
                            <span>{t('doctorChart.reviewNow')}</span>
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-[var(--leaf)] inline-flex items-center gap-1">
                            <BadgeCheck size={16} />
                            <span>{t('doctorChart.reviewed')}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 5. MEDICINES TAB */}
        {activeTab === 'meds' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--ink)]">{t('doctorChart.tabs.meds')}</h2>
              <span className="text-xs text-[var(--ink3)]">{t('doctorChart.changeStopPrescribe')}</span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-[var(--ink3)] uppercase tracking-wider mb-3">
                {t('doctorChart.activeMeds')} ({activeMedicationsList.length})
              </h3>
              {activeMedicationsList.length === 0 ? (
                <p className="text-sm text-[var(--ink3)]">{t('doctorChart.noMeds')}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeMedicationsList.map((med) => {
                    const morning = med.timing?.morning;
                    const afternoon = med.timing?.afternoon;
                    const night = med.timing?.night;

                    return (
                      <div
                        key={med.id}
                        className="bg-white p-4 rounded-2xl border border-[var(--line)] shadow-xs"
                      >
                        <b className="text-base font-bold text-[var(--ink)] block">{med.drug}</b>
                        <span className="text-sm font-semibold text-[var(--ink2)] block mt-0.5">
                          {med.dose}
                        </span>
                        <div className="flex items-center gap-2 mt-3">
                          <span className={`w-2.5 h-2.5 rounded-full ${morning ? 'bg-[var(--leaf)]' : 'bg-[var(--line)]'}`} title="Morning" />
                          <span className={`w-2.5 h-2.5 rounded-full ${afternoon ? 'bg-[var(--leaf)]' : 'bg-[var(--line)]'}`} title="Afternoon" />
                          <span className={`w-2.5 h-2.5 rounded-full ${night ? 'bg-[var(--leaf)]' : 'bg-[var(--line)]'}`} title="Night" />
                          <span className="text-xs text-[var(--ink2)] ml-2">{med.instructions}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {stoppedMedicationsList.length > 0 && (
              <div className="mt-8 pt-6 border-t border-[var(--line)]">
                <h3 className="text-sm font-bold text-[var(--ink3)] uppercase tracking-wider mb-3">
                  {t('doctorChart.stoppedMeds')} ({stoppedMedicationsList.length})
                </h3>
                <div className="space-y-2">
                  {stoppedMedicationsList.map((med) => (
                    <div key={med.id} className="p-3 rounded-xl bg-[var(--mist)] text-sm text-[var(--ink2)] flex items-center justify-between">
                      <span className="font-semibold">{med.drug} {med.dose}</span>
                      <span className="text-xs text-[var(--ink3)]">Stopped {med.stopped_at ? new Date(med.stopped_at).toLocaleDateString() : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. CARE PLAN TAB */}
        {activeTab === 'plan' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[var(--ink)]">{t('doctorChart.tabs.plan')}</h2>

            {!activeCarePlan ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-[var(--line)] text-[var(--ink3)]">
                <p className="font-semibold text-base text-[var(--ink)]">No active care plan</p>
                <p className="text-sm mt-1">A care plan can be generated during consultation note signing.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Diet Guidance Card */}
                {activeCarePlan.care_plan_items?.some((item) => item.kind === 'diet' && item.diet_guides) && (
                  <div className="bg-white rounded-2xl border-2 border-[var(--leaf)] p-5 shadow-xs">
                    {activeCarePlan.care_plan_items
                      .filter((item) => item.kind === 'diet' && item.diet_guides)
                      .map((dietItem) => {
                        const guide = dietItem.diet_guides!;
                        const isMl = i18n.language === 'ml';
                        const title = isMl ? guide.title_ml : guide.title_en;
                        const eatMore = isMl ? guide.eat_more_ml : guide.eat_more_en;
                        const eatLess = isMl ? guide.eat_less_ml : guide.eat_less_en;
                        const avoid = isMl ? guide.avoid_ml : guide.avoid_en;
                        const tips = isMl ? guide.tips_ml : guide.tips_en;

                        return (
                          <div key={dietItem.id} className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-[var(--leaf)] block">
                                  {t('doctorChart.dietAdvice')}
                                </span>
                                <h3 className="text-xl font-bold text-[var(--ink)] mt-0.5">{title}</h3>
                              </div>
                              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-[#FFF8EB] border border-[#F3D27A] text-[#8C6D1F]">
                                {t('doctorChart.dietDemoBadge')}
                              </span>
                            </div>

                            <p className="text-sm text-[var(--ink2)] italic">
                              "{t('doctorChart.dietAdviceSub')}"
                            </p>

                            {dietItem.doctor_note && (
                              <div className="p-3 rounded-xl bg-[var(--mist)] text-sm font-semibold text-[var(--ink)]">
                                Doctor's instruction: {dietItem.doctor_note}
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                              <div className="p-3.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0]">
                                <b className="text-[#166534] block mb-1">{t('doctorChart.eatMore')}</b>
                                <p className="text-[#14532D] text-xs leading-relaxed">{eatMore}</p>
                              </div>
                              <div className="p-3.5 rounded-xl bg-[#FEFCE8] border border-[#FEF08A]">
                                <b className="text-[#854D0E] block mb-1">{t('doctorChart.eatLess')}</b>
                                <p className="text-[#713F12] text-xs leading-relaxed">{eatLess}</p>
                              </div>
                              <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA]">
                                <b className="text-[#991B1B] block mb-1">{t('doctorChart.avoid')}</b>
                                <p className="text-[#7F1D1D] text-xs leading-relaxed">{avoid}</p>
                              </div>
                              <div className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE]">
                                <b className="text-[#1E40AF] block mb-1">{t('doctorChart.tips')}</b>
                                <p className="text-[#1E3A8A] text-xs leading-relaxed">{tips}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Other Care Plan Items */}
                <div className="bg-white rounded-2xl border border-[var(--line)] p-5 shadow-xs">
                  <h3 className="font-bold text-base text-[var(--ink)] mb-3">Tasks & Follow-up</h3>
                  <div className="space-y-3">
                    {activeCarePlan.care_plan_items
                      ?.filter((i) => i.kind !== 'diet')
                      .map((item) => (
                        <div key={item.id} className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-start gap-3">
                          <span className="p-1.5 rounded-lg bg-[var(--leaft)] text-[var(--leaf)] flex-none mt-0.5">
                            <Check size={16} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <b className="block text-sm text-[var(--ink)]">{item.detail}</b>
                            <span className="text-xs text-[var(--ink3)]">
                              Type: {item.kind} {item.due_date ? `• Due: ${item.due_date}` : ''}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: Note Composer */}
      {composerOpen && (
        <NoteComposer
          patientId={patient.id}
          patientName={patient.full_name}
          uhid={patient.uhid}
          allergies={allergies}
          activeMeds={activeMedicationsList.map((m) => ({
            id: m.id,
            drug: m.drug,
            dose: m.dose,
            instructions: m.instructions || '',
          }))}
          onClose={() => setComposerOpen(false)}
          onSigned={async () => {
            setComposerOpen(false);
            await refetchEncounters();
            await refetchMedications();
            await refetchCarePlans();
            await refetchWhatChanged();
            showToast('Consultation note signed successfully.');
          }}
        />
      )}

      {/* MODAL 2: Addendum Modal */}
      {selectedEncounterForAddendum && (
        <AddendumModal
          encounterId={selectedEncounterForAddendum.id}
          patientId={patient.id}
          encounterDate={new Date(selectedEncounterForAddendum.signed_at || selectedEncounterForAddendum.created_at).toLocaleDateString()}
          doctorName={selectedEncounterForAddendum.staff?.full_name || 'Dr. Rahul Menon'}
          onClose={() => setSelectedEncounterForAddendum(null)}
          onSaved={async () => {
            setSelectedEncounterForAddendum(null);
            await refetchEncounters();
            showToast(t('doctorChart.correctionSigned'));
          }}
        />
      )}

      {/* MODAL 3: Review Report Sheet */}
      {reviewSheetDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" role="dialog" aria-modal="true">
          <div className="staff-theme w-full max-w-lg rounded-[24px] bg-white p-6 shadow-2xl border border-[var(--line)]">
            <h2 className="text-xl font-bold text-[var(--ink)]">
              {t('doctorReview.reviewTitle', { title: reviewSheetDoc.title })}
            </h2>
            <p className="text-xs text-[var(--ink3)] mt-1">
              Patient: {patient.full_name} &bull; Uploaded {reviewSheetDoc.report_date}
            </p>

            <form onSubmit={handleReviewDocument} className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-[var(--ink)] mb-1">
                  {t('doctorReview.commentForPatient')}
                </label>
                <textarea
                  rows={3}
                  required
                  value={docReviewComment}
                  onChange={(e) => setDocReviewComment(e.target.value)}
                  placeholder={t('doctorReview.commentPh')}
                  className="w-full rounded-xl border border-[var(--line)] p-3 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--leaf)]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[var(--ink)] mb-1">
                  {t('doctorReview.nextStep')}
                </label>
                <select
                  value={docReviewNextStep}
                  onChange={(e) => setDocReviewNextStep(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] p-3 text-sm text-[var(--ink)] bg-white focus:outline-none focus:border-[var(--leaf)]"
                >
                  <option value="no_action">{t('doctorReview.noAction')}</option>
                  <option value="repeat_test">{t('doctorReview.repeatTest')}</option>
                  <option value="book_followup">{t('doctorReview.bookFollowup')}</option>
                  <option value="contact_hospital">{t('doctorReview.contactHospital')}</option>
                </select>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setReviewSheetDoc(null)}
                  className="btn btn-sec flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={docReviewSubmitting}
                  className="btn btn-primary flex-1 inline-flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  <span>{docReviewSubmitting ? 'Saving...' : t('doctorReview.markReviewed')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Mark Symptom Seen Sheet */}
      {symptomSheetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" role="dialog" aria-modal="true">
          <div className="staff-theme w-full max-w-lg rounded-[24px] bg-white p-6 shadow-2xl border border-[var(--line)]">
            <h2 className="text-xl font-bold text-[var(--ink)]">Mark symptom as seen</h2>
            <div className="p-3.5 rounded-xl bg-[var(--mist)] mt-3">
              <span className="text-xs font-semibold text-[var(--ink3)] block">Patient Reported:</span>
              <p className="text-sm font-medium text-[var(--ink)] mt-0.5">{symptomSheetItem.text}</p>
            </div>

            <form onSubmit={handleSymptomSeen} className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-[var(--ink)] mb-1">
                  {t('doctorReview.whatDidYouDo')}
                </label>
                <select
                  value={symptomAction}
                  onChange={(e) => setSymptomAction(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] p-3 text-sm text-[var(--ink)] bg-white focus:outline-none focus:border-[var(--leaf)]"
                >
                  <option value="Called the patient">Called the patient</option>
                  <option value="Asked the desk to book an earlier visit">Asked the desk to book an earlier visit</option>
                  <option value="Told the patient to come to casualty">Told the patient to come to casualty</option>
                  <option value="Will discuss at the next visit">Will discuss at the next visit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-[var(--ink)] mb-1">
                  {t('doctorReview.noteForChart')}
                </label>
                <input
                  type="text"
                  value={symptomNote}
                  onChange={(e) => setSymptomNote(e.target.value)}
                  placeholder="Staff only note..."
                  className="w-full rounded-xl border border-[var(--line)] p-3 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--leaf)]"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSymptomSheetItem(null)}
                  className="btn btn-sec flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={symptomSubmitting}
                  className="btn btn-primary flex-1 inline-flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  <span>{symptomSubmitting ? 'Saving...' : t('doctorReview.markSeen')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
