import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, BadgeCheck, Check, Info, CheckCircle2, FlaskConical } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';

interface PendingReport {
  id: string;
  patient_id: string;
  title: string;
  type: string;
  report_date: string;
  source: string;
  review_status: string;
  reviewed_at: string | null;
  created_at: string;
  patients: {
    id: string;
    full_name: string;
    uhid: string;
    dob: string;
    gender: string;
    phone: string;
  } | null;
}

interface PendingSymptom {
  id: string;
  patient_id: string;
  description: string;
  severity: string;
  reported_at: string;
  reviewed_at: string | null;
  created_at: string;
  patients: {
    id: string;
    full_name: string;
    uhid: string;
    dob: string;
    gender: string;
    phone: string;
  } | null;
}

export function DoctorReview(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'reports' | 'symptoms'>('reports');
  const [selectedReport, setSelectedReport] = useState<PendingReport | null>(null);
  const [selectedSymptom, setSelectedSymptom] = useState<PendingSymptom | null>(null);

  // Report Review Form
  const [reportComment, setReportComment] = useState('');
  const [reportNextStep, setReportNextStep] = useState('no_action');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Symptom Review Form
  const [symptomAction, setSymptomAction] = useState('Called the patient');
  const [symptomNote, setSymptomNote] = useState('');
  const [symptomSubmitting, setSymptomSubmitting] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Fetch Reports
  const { data: allReports = [], refetch: refetchReports } = useQuery<PendingReport[]>({
    queryKey: ['doctor', 'review', 'reports'],
    queryFn: async () => {
      try {
        const res = await apiFetch<{ reports: PendingReport[] }>('/api/documents/review-queue');
        return res.reports || [];
      } catch {
        return [];
      }
    },
  });

  // 2. Fetch Symptoms
  const { data: allSymptoms = [], refetch: refetchSymptoms } = useQuery<PendingSymptom[]>({
    queryKey: ['doctor', 'review', 'symptoms'],
    queryFn: async () => {
      try {
        const res = await apiFetch<{ symptoms: PendingSymptom[] }>(
          '/api/doctor/symptoms/review-queue'
        );
        return res.symptoms || [];
      } catch {
        return [];
      }
    },
  });

  const waitingReports = allReports.filter((r) => r.review_status === 'pending');
  const todayDateStr = new Date().toISOString().split('T')[0] || '';
  const reviewedToday = allReports.filter(
    (r) =>
      r.review_status === 'reviewed' &&
      Boolean(r.reviewed_at && r.reviewed_at.startsWith(todayDateStr))
  );

  const waitingSymptoms = allSymptoms.filter((s) => !s.reviewed_at);
  const seenToday = allSymptoms.filter((s) =>
    Boolean(s.reviewed_at && s.reviewed_at.startsWith(todayDateStr))
  );

  const handleSaveReportReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;
    if (!reportComment.trim()) {
      showToast('Please provide a comment for the patient.');
      return;
    }

    setReviewSubmitting(true);
    try {
      await apiFetch(`/api/documents/${selectedReport.id}/review`, {
        method: 'POST',
      });

      showToast(t('doctorReview.reviewSaved'));
      setSelectedReport(null);
      setReportComment('');
      await refetchReports();
    } catch {
      showToast('Failed to save review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleSaveSymptomSeen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSymptom) return;

    setSymptomSubmitting(true);
    try {
      await apiFetch(`/api/doctor/symptoms/${selectedSymptom.id}/review`, {
        method: 'POST',
      });

      showToast(t('doctorReview.symptomSeenSaved'));
      setSelectedSymptom(null);
      setSymptomNote('');
      await refetchSymptoms();
    } catch {
      showToast('Failed to mark symptom seen.');
    } finally {
      setSymptomSubmitting(false);
    }
  };

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

      {/* Page Header */}
      <div className="pt-2 pb-6 lg:pt-0">
        <h1 className="disp h1 text-2xl lg:text-3xl font-bold text-[var(--ink)]">
          {t('doctorReview.title')}
        </h1>
        <p className="text-sm text-[var(--ink2)] mt-1 max-w-xl">{t('doctorReview.subtitle')}</p>

        {/* Tab Segments */}
        <div className="flex gap-2 mt-5">
          <button
            type="button"
            className={`pill press px-4 py-2 rounded-full font-semibold text-sm transition-colors flex items-center gap-1.5 ${
              activeTab === 'reports'
                ? 'bg-[var(--leaf)] text-white shadow-xs'
                : 'bg-white text-[var(--ink2)] border border-[var(--line)] hover:bg-[var(--mist)]'
            }`}
            onClick={() => setActiveTab('reports')}
          >
            <span>{t('doctorReview.reportsTab')}</span>
            <span
              className={`pill-n text-xs px-2 py-0.2 rounded-full font-bold ${
                activeTab === 'reports'
                  ? 'bg-white/30 text-white'
                  : 'bg-[var(--mist)] text-[var(--ink)]'
              }`}
            >
              {waitingReports.length}
            </span>
          </button>
          <button
            type="button"
            className={`pill press px-4 py-2 rounded-full font-semibold text-sm transition-colors flex items-center gap-1.5 ${
              activeTab === 'symptoms'
                ? 'bg-[var(--leaf)] text-white shadow-xs'
                : 'bg-white text-[var(--ink2)] border border-[var(--line)] hover:bg-[var(--mist)]'
            }`}
            onClick={() => setActiveTab('symptoms')}
          >
            <span>{t('doctorReview.symptomsTab')}</span>
            <span
              className={`pill-n text-xs px-2 py-0.2 rounded-full font-bold ${
                activeTab === 'symptoms'
                  ? 'bg-white/30 text-white'
                  : 'bg-[var(--mist)] text-[var(--ink)]'
              }`}
            >
              {waitingSymptoms.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: REPORTS QUEUE */}
      {activeTab === 'reports' && (
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          <section className="lg:col-span-7">
            {waitingReports.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-[var(--line)] text-[var(--ink3)]">
                <Check size={32} className="mx-auto text-[var(--leaf)] mb-2" />
                <p className="font-semibold text-base text-[var(--ink)]">
                  {t('doctorReview.allReportsReviewed')}
                </p>
                <p className="text-sm mt-1">New uploads from your patients appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {waitingReports.map((report) => (
                  <div
                    key={report.id}
                    className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-xs flex items-start justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <span className="p-2.5 rounded-xl bg-[var(--leaft)] text-[var(--leaf)] flex-none">
                        <FlaskConical size={20} />
                      </span>
                      <div>
                        <b className="block text-base font-bold text-[var(--ink)]">
                          {report.title}
                        </b>
                        <span className="block text-xs text-[var(--ink3)] mt-0.5">
                          {report.patients?.full_name || 'Patient'} &bull;{' '}
                          {report.patients?.uhid || ''}
                        </span>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#FFF6E5] text-[#A67814]">
                            Uploaded {report.report_date}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedReport(report)}
                      className="btn btn-sm btn-primary press inline-flex items-center gap-1.5 flex-none"
                    >
                      <FileText size={15} />
                      <span>Review</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Reviewed Today Sidebar */}
          <aside className="lg:col-span-5 mt-8 lg:mt-0">
            <h2 className="text-base font-bold text-[var(--ink)] mb-3">
              {t('doctorReview.reviewedToday')}
            </h2>
            {reviewedToday.length === 0 ? (
              <p className="text-xs text-[var(--ink3)] bg-white p-4 rounded-xl border border-[var(--line)]">
                Reports you mark reviewed show here. The patient sees "Reviewed by Dr. Rahul Menon"
                and any next steps.
              </p>
            ) : (
              <div className="space-y-2">
                {reviewedToday.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => navigate(`/doctor/chart/${r.patient_id}`)}
                    className="p-3.5 rounded-xl bg-white border border-[var(--line)] flex items-center justify-between cursor-pointer hover:border-[var(--leaf)] transition-colors"
                  >
                    <div>
                      <b className="block text-sm font-bold text-[var(--ink)]">{r.title}</b>
                      <span className="text-xs text-[var(--ink3)]">{r.patients?.full_name}</span>
                    </div>
                    <BadgeCheck size={18} className="text-[var(--leaf)]" />
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}

      {/* TAB 2: SYMPTOMS QUEUE */}
      {activeTab === 'symptoms' && (
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          <section className="lg:col-span-7">
            <div className="p-3.5 rounded-xl bg-[var(--mist)] text-xs text-[var(--ink2)] flex items-start gap-2 mb-4">
              <Info size={16} className="text-[var(--ink3)] flex-none mt-0.5" />
              <span>
                Patients are told this is not watched around the clock, and to call 112 or casualty
                in an emergency.
              </span>
            </div>

            {waitingSymptoms.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-[var(--line)] text-[var(--ink3)]">
                <Check size={32} className="mx-auto text-[var(--leaf)] mb-2" />
                <p className="font-semibold text-base text-[var(--ink)]">
                  {t('doctorReview.noSymptomsWaiting')}
                </p>
                <p className="text-sm mt-1">When a patient reports a symptom, it shows here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {waitingSymptoms.map((sym) => (
                  <div
                    key={sym.id}
                    className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <b className="text-sm font-bold text-[var(--ink)]">
                        {sym.patients?.full_name} ({sym.patients?.uhid})
                      </b>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md font-bold uppercase ${
                          sym.severity === 'severe'
                            ? 'bg-[#FFF2EE] text-[var(--lat)]'
                            : 'bg-[#FFF6E5] text-[#A67814]'
                        }`}
                      >
                        {sym.severity}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--ink2)] mt-2 font-medium bg-[var(--mist)] p-3 rounded-xl italic">
                      "{sym.description}"
                    </p>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--line)]">
                      <span className="text-xs text-[var(--ink3)]">
                        Reported{' '}
                        {new Date(sym.reported_at).toLocaleDateString([], {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedSymptom(sym)}
                          className="btn btn-sm btn-primary press inline-flex items-center gap-1 text-xs"
                        >
                          <Check size={14} />
                          <span>{t('doctorReview.markSeen')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/doctor/chart/${sym.patient_id}`)}
                          className="btn btn-sm btn-light press text-xs"
                        >
                          Open chart
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Seen Today Sidebar */}
          <aside className="lg:col-span-5 mt-8 lg:mt-0">
            <h2 className="text-base font-bold text-[var(--ink)] mb-3">
              {t('doctorReview.seenToday')}
            </h2>
            {seenToday.length === 0 ? (
              <p className="text-xs text-[var(--ink3)] bg-white p-4 rounded-xl border border-[var(--line)]">
                Symptoms you mark seen show here. The patient sees "Seen by Dr. Rahul Menon".
              </p>
            ) : (
              <div className="space-y-2">
                {seenToday.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => navigate(`/doctor/chart/${s.patient_id}`)}
                    className="p-3.5 rounded-xl bg-white border border-[var(--line)] flex items-center justify-between cursor-pointer hover:border-[var(--leaf)] transition-colors"
                  >
                    <div>
                      <b className="block text-sm font-bold text-[var(--ink)]">
                        {s.patients?.full_name}
                      </b>
                      <span className="text-xs text-[var(--ink3)] truncate block max-w-xs">
                        {s.description}
                      </span>
                    </div>
                    <Check size={18} className="text-[var(--leaf)]" />
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}

      {/* REPORT REVIEW MODAL */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="staff-theme w-full max-w-lg rounded-[24px] bg-white p-6 shadow-2xl border border-[var(--line)]">
            <h2 className="text-xl font-bold text-[var(--ink)]">
              {t('doctorReview.reviewTitle', { title: selectedReport.title })}
            </h2>
            <p className="text-xs text-[var(--ink3)] mt-1">
              Patient: {selectedReport.patients?.full_name} &bull; Uploaded{' '}
              {selectedReport.report_date}
            </p>

            <form onSubmit={handleSaveReportReview} className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-[var(--ink)] mb-1">
                  {t('doctorReview.commentForPatient')}
                </label>
                <textarea
                  rows={3}
                  required
                  value={reportComment}
                  onChange={(e) => setReportComment(e.target.value)}
                  placeholder={t('doctorReview.commentPh')}
                  className="w-full rounded-xl border border-[var(--line)] p-3 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--leaf)]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[var(--ink)] mb-1">
                  {t('doctorReview.nextStep')}
                </label>
                <select
                  value={reportNextStep}
                  onChange={(e) => setReportNextStep(e.target.value)}
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
                  onClick={() => setSelectedReport(null)}
                  className="btn btn-sec flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="btn btn-primary flex-1 inline-flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  <span>{reviewSubmitting ? 'Saving...' : t('doctorReview.markReviewed')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SYMPTOM SEEN MODAL */}
      {selectedSymptom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="staff-theme w-full max-w-lg rounded-[24px] bg-white p-6 shadow-2xl border border-[var(--line)]">
            <h2 className="text-xl font-bold text-[var(--ink)]">Mark symptom as seen</h2>
            <div className="p-3.5 rounded-xl bg-[var(--mist)] mt-3">
              <span className="text-xs font-semibold text-[var(--ink3)] block">
                {selectedSymptom.patients?.full_name} reported:
              </span>
              <p className="text-sm font-medium text-[var(--ink)] mt-0.5">
                {selectedSymptom.description}
              </p>
            </div>

            <form onSubmit={handleSaveSymptomSeen} className="mt-5 space-y-4">
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
                  <option value="Asked the desk to book an earlier visit">
                    Asked the desk to book an earlier visit
                  </option>
                  <option value="Told the patient to come to casualty">
                    Told the patient to come to casualty
                  </option>
                  <option value="Will discuss at the next visit">
                    Will discuss at the next visit
                  </option>
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
                  placeholder="Internal note for hospital records..."
                  className="w-full rounded-xl border border-[var(--line)] p-3 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--leaf)]"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedSymptom(null)}
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
