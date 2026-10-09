import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, Users, Inbox, User, Lock, LogOut, Timer, Languages } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { MOCK_DOCTOR } from './mock';
import { StaffSignIn } from '../auth/StaffSignIn';
import { apiFetch } from '../../lib/api-client';

export function DoctorLayout(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const [isLocked, setIsLocked] = useState(false);
  const [idleSecondsRemaining, setIdleSecondsRemaining] = useState<number | null>(null);

  const handleDoctorSignOut = async () => {
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

  const lastActiveRef = useRef<number>(0);

  const { data: pendingDocsCount = 0 } = useQuery({
    queryKey: ['doctor', 'layout', 'pending_docs_count'],
    queryFn: async () => {
      try {
        const res = await apiFetch<{ reports: unknown[] }>('/api/documents/review-queue');
        return res.reports ? res.reports.length : 0;
      } catch {
        return 0;
      }
    },
  });

  const { data: pendingSymptomsCount = 0 } = useQuery({
    queryKey: ['doctor', 'layout', 'pending_symptoms_count'],
    queryFn: async () => {
      try {
        const res = await apiFetch<{ symptoms: unknown[] }>('/api/doctor/symptoms/review-queue');
        return res.symptoms ? res.symptoms.length : 0;
      } catch {
        return 0;
      }
    },
  });

  const reviewCount = pendingDocsCount + pendingSymptomsCount;

  const currentTab = location.pathname.includes('/patients')
    ? 'patients'
    : location.pathname.includes('/review')
      ? 'review'
      : location.pathname.includes('/account')
        ? 'account'
        : 'today';

  // 10-Minute Idle Timeout Tracker
  useEffect(() => {
    lastActiveRef.current = Date.now();

    const handleUserActivity = () => {
      lastActiveRef.current = Date.now();
      if (idleSecondsRemaining !== null) {
        setIdleSecondsRemaining(null);
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));

    const interval = setInterval(() => {
      if (isLocked) return;

      const idleMs = Date.now() - lastActiveRef.current;
      const totalTimeoutMs = 10 * 60 * 1000; // 10 minutes
      const warnThresholdMs = 9 * 60 * 1000; // 9 minutes (warning at 60s remaining)

      if (idleMs >= totalTimeoutMs) {
        setIsLocked(true);
        setIdleSecondsRemaining(null);
      } else if (idleMs >= warnThresholdMs) {
        const remainingSec = Math.max(1, Math.round((totalTimeoutMs - idleMs) / 1000));
        setIdleSecondsRemaining(remainingSec);
      } else {
        setIdleSecondsRemaining(null);
      }
    }, 1000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
      clearInterval(interval);
    };
  }, [isLocked, idleSecondsRemaining]);

  const toggleLanguage = () => {
    const next = i18n.language === 'ml' ? 'en' : 'ml';
    void i18n.changeLanguage(next);
  };

  const navItems = [
    { key: 'today', label: t('doctorToday.today'), icon: CalendarDays, path: '/doctor' },
    { key: 'patients', label: t('doctorToday.patients'), icon: Users, path: '/doctor/patients' },
    {
      key: 'review',
      label: t('doctorToday.review'),
      icon: Inbox,
      path: '/doctor/review',
      count: reviewCount,
    },
    { key: 'account', label: t('doctorToday.account'), icon: User, path: '/doctor/account' },
  ];

  if (isLocked) {
    return <StaffSignIn initialStep="lock" />;
  }

  return (
    <div className="staff-theme min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      {/* Floating Idle Warning */}
      {idleSecondsRemaining !== null && (
        <div
          role="alert"
          onClick={() => {
            lastActiveRef.current = Date.now();
            setIdleSecondsRemaining(null);
          }}
          className="idle cursor-pointer"
        >
          <Timer size={20} className="flex-none animate-pulse" />
          <span>{t('staffAuth.idleWarn', { seconds: idleSecondsRemaining })}</span>
        </div>
      )}

      <div className="lg:flex min-h-screen">
        {/* Desktop Fixed Sidebar */}
        <aside className="dside hidden lg:flex" aria-label="Main sidebar">
          <div className="zari-band" />
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <span className="logo dark" aria-hidden="true">
                ABC
              </span>
              <span className="font-extrabold tracking-tight text-white text-base">
                ABC Hospital
              </span>
            </div>
            <button
              type="button"
              onClick={toggleLanguage}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              aria-label="Toggle language"
            >
              <Languages size={16} />
            </button>
          </div>

          <nav className="flex flex-col gap-1.5" aria-label="Desktop Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`dn press ${isActive ? 'on' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                  {item.count && item.count > 0 ? <span className="dn-n">{item.count}</span> : null}
                </button>
              );
            })}
          </nav>

          {/* Doctor Account Info at Sidebar Bottom */}
          <div className="acct mt-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 text-white font-bold flex items-center justify-center flex-none">
                RN
              </div>
              <div className="min-w-0 leading-tight">
                <b className="block truncate text-white text-sm">{MOCK_DOCTOR.name}</b>
                <span className="block text-xs text-white/70">{MOCK_DOCTOR.dept}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-3.5">
              <button
                type="button"
                onClick={() => setIsLocked(true)}
                className="acct-btn press flex-1 justify-center"
              >
                <Lock size={15} />
                <span>{t('doctorToday.lock')}</span>
              </button>
              <button
                type="button"
                onClick={handleDoctorSignOut}
                className="acct-btn press flex-1 justify-center"
              >
                <LogOut size={15} />
                <span>{t('doctorToday.signOut')}</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Content Wrapper */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Mobile Top Header */}
          <header className="topbar lg:hidden">
            <div className="flex items-center gap-3">
              <span className="logo logo-sm" aria-hidden="true">
                ABC
              </span>
              <b className="text-base text-[var(--ink)]">
                {navItems.find((n) => n.key === currentTab)?.label || 'Today'}
              </b>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleLanguage}
                className="p-1.5 rounded-lg border border-[var(--line)] bg-white text-[var(--ink2)]"
                aria-label="Toggle language"
              >
                <Languages size={18} />
              </button>
              <button
                type="button"
                onClick={() => setIsLocked(true)}
                className="p-2 rounded-lg text-[var(--ink2)] hover:text-[var(--ink)]"
                aria-label="Lock screen"
              >
                <Lock size={20} />
              </button>
              <button
                type="button"
                onClick={handleDoctorSignOut}
                className="p-2 rounded-lg text-[var(--ink2)] hover:text-[var(--ink)]"
                aria-label={t('doctorToday.signOut')}
                title={t('doctorToday.signOut')}
              >
                <LogOut size={20} />
              </button>
            </div>
          </header>

          {/* Main Page Body */}
          <main className="fadein w-full max-w-6xl mx-auto px-5 lg:px-10 pb-32 lg:pb-16 lg:pt-10">
            <Outlet />
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="bnav lg:hidden" aria-label="Mobile Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  navigate(item.path);
                }}
                className={`bn ${isActive ? 'on' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="bi">
                  <Icon size={22} />
                  {item.count && item.count > 0 ? (
                    <span className="badge">{item.count}</span>
                  ) : null}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
