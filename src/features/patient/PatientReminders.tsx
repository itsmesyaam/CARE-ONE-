import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Bell,
  Pill,
  HeartPulse,
  Droplet,
  FlaskConical,
  CalendarDays,
  Scale,
  Check,
  Info,
} from 'lucide-react';
import { usePatient } from './PatientContext';

export function PatientReminders(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { d, push, setPush, openSheet, toast } = usePatient();

  const IC: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    pill: Pill,
    heart: HeartPulse,
    drop: Droplet,
    flask: FlaskConical,
    cal: CalendarDays,
    scale: Scale,
  };

  const ACT: Record<string, [string, () => void]> = {
    nightMeds: [t('patientReminders.open'), () => navigate('/patient')],
    checkBp: [t('patientReminders.logNow'), () => openSheet({ type: 'reading', k: 'bp' })],
    fastingSugar: [t('patientReminders.logNow'), () => openSheet({ type: 'reading', k: 'sugar' })],
    logWeight: [t('patientReminders.logNow'), () => openSheet({ type: 'reading', k: 'weight' })],
    testsDue: [t('patientReminders.upload'), () => openSheet({ type: 'upload' })],
    visitSoon: [t('patientReminders.view'), () => navigate('/patient/appointments')],
  };

  const groups: Array<{ key: 'today' | 'next' | 'earlier'; label: string }> = [
    { key: 'today', label: t('patientReminders.today') },
    { key: 'next', label: t('patientReminders.comingUp') },
    { key: 'earlier', label: t('patientReminders.earlier') },
  ];

  const handlePushToggle = () => {
    const next = !push;
    setPush(next);
    toast(next ? t('patientReminders.pushEnabled') : t('patientReminders.pushDisabled'));
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center gap-2 pt-2 pb-6 lg:pt-0">
        <button
          type="button"
          onClick={() => navigate('/patient')}
          className="back press flex items-center gap-1 text-sm font-semibold text-[var(--ink2)] hover:text-[var(--ink)]"
          aria-label={t('common.back', 'Back')}
        >
          <ChevronLeft size={20} />
          <span>{t('patientProfile.title', 'Home')}</span>
        </button>
      </div>

      <h1 className="disp h1 text-2xl lg:text-3xl font-bold text-[var(--ink)] mb-6">
        {t('patientReminders.title')}
      </h1>

      <div className="lg:grid lg:grid-cols-5 lg:gap-10">
        {/* Reminders List Column */}
        <div className="lg:col-span-3 flex flex-col gap-8">
          {groups.map(({ key, label }) => {
            const items = d.rem.filter((r) => r.w === key);
            if (!items.length) return null;

            return (
              <section key={key} aria-label={label}>
                <h2 className="h3 text-base font-bold text-[var(--ink)] mb-3">{label}</h2>
                <div className="flex flex-col gap-2.5">
                  {items.map((r) => {
                    const Icon = IC[r.ic] || Bell;
                    const action = !r.done && ACT[r.k];
                    const reminderTitle = t(`patientReminders.${r.k}`, { defaultValue: r.k });

                    return (
                      <div key={r.id} className={`rem ${r.done ? 'is-done' : ''}`}>
                        <span className={`ico flex-none ${r.done ? 'ico-mist' : 'ico-leaf'}`}>
                          <Icon size={20} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <b className="block text-sm font-bold text-[var(--ink)]">
                            {reminderTitle}
                          </b>
                          {r.sub && (
                            <span className="block text-xs text-[var(--ink2)] truncate">
                              {r.sub}
                            </span>
                          )}
                          <span className="block text-xs text-[var(--ink3)] mt-0.5">
                            {r.done ? t('patientReminders.takenAt', { time: r.done }) : r.time}
                          </span>
                        </div>
                        {action && (
                          <button
                            type="button"
                            className="btn-p btn-tint btn-sm press flex-none text-xs"
                            onClick={action[1]}
                          >
                            {action[0]}
                          </button>
                        )}
                        {r.done && <Check size={20} className="text-[var(--leaf)] flex-none" />}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* Lock Screen Preview & Push Settings Column */}
        <div className="lg:col-span-2 mt-8 lg:mt-0 flex flex-col gap-4">
          <section className="lockscreen" aria-label={t('patientReminders.notifPreview')}>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80 mb-2">
              {t('patientReminders.notifPreview')}
            </p>
            <div className="notif">
              <span className="logo logo-sm flex-none text-xs" aria-hidden="true">
                ABC
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center gap-2 text-xs text-[var(--ink3)]">
                  <b>{t('patientReminders.hospitalName')}</b>
                  <span>{t('patientReminders.now')}</span>
                </div>
                <p className="text-xs text-[var(--ink)] font-medium mt-0.5">
                  {t('patientReminders.notifText')}
                </p>
              </div>
            </div>
            <p className="text-xs mt-3 text-white/85 leading-relaxed">
              {t('patientReminders.notifCaption')}
            </p>
          </section>

          {/* Push Notifications Switch Row */}
          <div className="grp">
            <div className="row justify-between items-center">
              <div>
                <b className="block text-sm font-bold text-[var(--ink)]">
                  {t('patientReminders.pushOn')}
                </b>
                <span className="block text-xs text-[var(--ink3)]">
                  {t('patientReminders.pushSub')}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={push}
                aria-label={t('patientReminders.pushOn')}
                className={`sw press ${push ? 'on' : ''}`}
                onClick={handlePushToggle}
              >
                <i />
              </button>
            </div>
          </div>

          {/* iPhone Note */}
          <p className="text-xs text-[var(--ink3)] flex gap-2 leading-relaxed">
            <Info size={16} className="flex-none mt-0.5" />
            <span>{t('patientReminders.iphoneNote')}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
