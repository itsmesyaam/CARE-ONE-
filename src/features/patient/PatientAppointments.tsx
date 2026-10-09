import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CalendarDays, Phone } from 'lucide-react';
import { usePatient } from './PatientContext';
import { Ticket } from './PatientHome';

export function PatientAppointments(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { d } = usePatient();

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
        {t('patientAppts.title')}
      </h1>

      <div className="lg:grid lg:grid-cols-2 lg:gap-10">
        {/* Upcoming Visit Section */}
        <section aria-labelledby="upcoming-h">
          <h2 id="upcoming-h" className="h2 text-lg lg:text-xl font-bold text-[var(--ink)] mb-3">
            {t('patientAppts.upcoming')}
          </h2>
          <Ticket />
        </section>

        {/* Past Visits Section */}
        <section aria-labelledby="past-h" className="mt-8 lg:mt-0">
          <h2 id="past-h" className="h2 text-lg lg:text-xl font-bold text-[var(--ink)] mb-3">
            {t('patientAppts.past')}
          </h2>
          <div className="grp">
            {d.appts.map((a) => (
              <div key={a.id} className="row items-center justify-between gap-3">
                <span className="ico ico-mist flex-none">
                  <CalendarDays size={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <b className="block text-sm font-bold text-[var(--ink)] truncate">{a.date}</b>
                  <span className="block text-xs text-[var(--ink2)] truncate">
                    {a.doc}, {a.dept}
                  </span>
                  <span className="block text-xs text-[var(--ink3)]">{a.time}</span>
                </div>
                <span
                  className={`tag ${a.st === 'done' ? 'tag-leaf' : 'tag-lat'} text-xs font-semibold flex-none`}
                >
                  {a.st === 'done' ? t('patientAppts.completed') : t('patientAppts.missed')}
                </span>
              </div>
            ))}
          </div>

          <div className="lock-note mt-5 flex items-start gap-2.5">
            <Phone size={18} className="flex-none mt-0.5 text-[var(--ink3)]" />
            <div className="text-xs text-[var(--ink2)] leading-relaxed">
              <span>{t('patientAppts.bookNote')} </span>
              <a href="tel:04840001234" className="font-bold underline text-[var(--leaf)]">
                {t('patientAppts.callDesk')}
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
