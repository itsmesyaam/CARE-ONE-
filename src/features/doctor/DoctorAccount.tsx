import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck,
  Timer,
  LogOut,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { apiFetch } from '../../lib/api-client';

interface EmergencyAccessRow {
  id: string;
  reason: string;
  expires_at: string;
  created_at: string;
  patients: {
    full_name: string;
    uhid: string;
  } | null;
}

export function DoctorAccount(): React.JSX.Element {
  const { t } = useTranslation();

  const [signOutModalOpen, setSignOutModalOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // 1. Fetch Care Team Count
  const { data: careTeamCount = 0 } = useQuery<number>({
    queryKey: ['doctor', 'care_team_count'],
    queryFn: async () => {
      try {
        const res = await apiFetch<{ careTeam: Array<{ patient_id: string }> }>('/api/doctor/care-team');
        return res.careTeam ? res.careTeam.length : 0;
      } catch {
        return 0;
      }
    },
  });

  // 2. Fetch Emergency Access Logs
  const { data: emergencyLogs = [] } = useQuery<EmergencyAccessRow[]>({
    queryKey: ['doctor', 'emergency_logs'],
    queryFn: async () => {
      try {
        const res = await apiFetch<{ emergencyAccess: EmergencyAccessRow[] }>('/api/doctor/emergency-access');
        return res.emergencyAccess || [];
      } catch {
        return [];
      }
    },
  });

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await apiFetch('/api/auth/signout', { method: 'POST' });
    } catch {
      // ignore
    }
    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.href = '/staff/signin';
  };

  return (
    <div className="staff-theme w-full max-w-5xl">
      <div className="pt-2 pb-6 lg:pt-0">
        <h1 className="disp h1 text-2xl lg:text-3xl font-bold text-[var(--ink)]">
          {t('doctorAccount.title')}
        </h1>
      </div>

      <div className="lg:grid lg:grid-cols-12 lg:gap-8">
        {/* Left Column: Doctor Profile & Security */}
        <div className="lg:col-span-6 space-y-6">
          {/* Profile Card */}
          <section className="bg-white p-6 rounded-2xl border border-[var(--line)] shadow-xs">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-full bg-[var(--leaft)] text-[var(--leafd)] flex items-center justify-center font-bold text-2xl select-none"
                aria-hidden="true"
              >
                RM
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--ink)]">Dr. Rahul Menon</h2>
                <p className="text-sm text-[var(--ink2)]">General Medicine</p>
              </div>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 text-sm">
              <div>
                <dt className="text-xs text-[var(--ink3)]">{t('doctorAccount.councilReg')}</dt>
                <dd className="font-semibold text-[var(--ink)] mt-0.5">KMC 48291</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--ink3)]">{t('doctorAccount.email')}</dt>
                <dd className="font-semibold text-[var(--ink)] mt-0.5 break-all">dr.rahul@example.com</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--ink3)]">{t('doctorAccount.opRoom')}</dt>
                <dd className="font-semibold text-[var(--ink)] mt-0.5">Room 4</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--ink3)]">{t('doctorAccount.careTeamCount')}</dt>
                <dd className="font-semibold text-[var(--ink)] mt-0.5">{careTeamCount}</dd>
              </div>
            </dl>

            <p className="text-xs text-[var(--ink3)] mt-6 pt-4 border-t border-[var(--line)]">
              {t('doctorAccount.adminContact')}
            </p>
          </section>

          {/* Sign-in and Security */}
          <section className="bg-white p-6 rounded-2xl border border-[var(--line)] shadow-xs">
            <h3 className="font-bold text-base text-[var(--ink)] mb-4">
              {t('doctorAccount.signInSecurity')}
            </h3>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-lg bg-[var(--leaft)] text-[var(--leaf)] flex-none">
                    <ShieldCheck size={18} />
                  </span>
                  <div>
                    <b className="block text-sm text-[var(--ink)]">{t('doctorAccount.twoFa')}</b>
                    <span className="text-xs text-[var(--ink3)]">{t('doctorAccount.twoFaApp')}</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md bg-[var(--leaft)] text-[var(--leaf)]">
                  <Check size={14} />
                  <span>{t('doctorAccount.twoFaOn')}</span>
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-lg bg-[var(--mist)] text-[var(--ink3)] flex-none">
                    <Timer size={18} />
                  </span>
                  <div>
                    <b className="block text-sm text-[var(--ink)]">{t('doctorAccount.screenLock')}</b>
                    <span className="text-xs text-[var(--ink3)]">{t('doctorAccount.screenLockSub')}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Email Alerts & Emergency Access Log */}
        <div className="lg:col-span-6 space-y-6 mt-6 lg:mt-0">
          {/* Emergency Access Log */}
          <section className="bg-white p-6 rounded-2xl border border-[var(--line)] shadow-xs">
            <h3 className="font-bold text-base text-[var(--ink)] mb-1">
              {t('doctorAccount.emergencyAccessLog')}
            </h3>
            <p className="text-xs text-[var(--ink3)] mb-4">
              Audit log of break-glass emergency sessions.
            </p>

            {emergencyLogs.length === 0 ? (
              <p className="text-xs text-[var(--ink3)] p-4 rounded-xl bg-[var(--paper)]">
                {t('doctorAccount.noEmergencyAccess')}
              </p>
            ) : (
              <div className="space-y-3">
                {emergencyLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-[#FFF9F5] border border-[#F5D5C6] flex items-start gap-3"
                  >
                    <ShieldAlert size={20} className="text-[var(--lat)] flex-none mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <b className="block text-sm text-[var(--ink)]">
                        {log.patients?.full_name || 'Patient'} ({log.patients?.uhid})
                      </b>
                      <span className="block text-xs text-[var(--ink2)] mt-0.5">
                        Reason: {log.reason}
                      </span>
                      <span className="block text-xs text-[var(--ink3)] mt-1">
                        Active until {new Date(log.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Sign Out Card */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setSignOutModalOpen(true)}
              className="btn btn-sec w-full py-3 inline-flex items-center justify-center gap-2 font-bold text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <LogOut size={18} />
              <span>{t('doctorAccount.signOut')}</span>
            </button>
            <p className="text-xs text-[var(--ink3)] text-center mt-3">
              {t('doctorAccount.appVersion')}
            </p>
          </div>
        </div>
      </div>

      {/* SIGN OUT CONFIRMATION MODAL */}
      {signOutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" role="dialog" aria-modal="true">
          <div className="staff-theme w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl border border-[var(--line)]">
            <h2 className="text-lg font-bold text-[var(--ink)]">
              {t('doctorAccount.signOutConfirm')}
            </h2>
            <p className="text-xs text-[var(--ink3)] mt-1.5 leading-relaxed">
              Patient details will be cleared from this computer session.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                type="button"
                onClick={() => setSignOutModalOpen(false)}
                className="btn btn-sec text-sm"
              >
                {t('doctorAccount.cancel')}
              </button>
              <button
                type="button"
                disabled={signingOut}
                onClick={handleSignOut}
                className="btn btn-primary text-sm inline-flex items-center justify-center gap-1.5"
              >
                <LogOut size={16} />
                <span>{signingOut ? 'Signing out...' : t('doctorAccount.signOut')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
