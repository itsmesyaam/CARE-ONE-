import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Phone,
  Mail,
  ShieldCheck,
  Bell,
  CalendarDays,
  LogOut,
  Check,
  ChevronRight,
} from 'lucide-react';
import { usePatient } from './PatientContext';
import { SAMPLE_PEOPLE, PatientPerson } from './mock';

function IdCard(): React.JSX.Element {
  const { t } = useTranslation();
  const { p } = usePatient();

  return (
    <section className="idcard shadow-sm" aria-label="Patient ID Card">
      <div className="flex items-center gap-4">
        <span
          className={`av ${p.kid ? 'kid' : ''}`}
          style={{ width: 60, height: 60, fontSize: 22 }}
          aria-hidden="true"
        >
          {p.ini}
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-[var(--ink)] truncate">{p.name}</h2>
          <p className="text-sm text-[var(--ink2)] mt-0.5">
            {t('patientProfile.dob')} {p.dob}
          </p>
        </div>
      </div>

      <p className="text-xs font-semibold text-[var(--ink3)] uppercase tracking-wider mt-5">
        {t('patientProfile.hospitalNo')}
      </p>
      <p className="mrn font-mono mt-0.5">{p.mrn}</p>
      <p className="text-xs text-[var(--ink3)] mt-1">{t('patientProfile.showDesk')}</p>

      {p.kid ? (
        <p className="text-sm mt-4 text-[var(--ink)]">
          <span className="text-[var(--ink3)]">{t('patientProfile.guardian')}: </span>
          <b className="font-semibold">Anjali Menon</b>
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5 text-sm">
          <div>
            <span className="block text-xs text-[var(--ink3)]">{t('patientProfile.phone')}</span>
            <b className="font-semibold text-[var(--ink)]">{p.phone}</b>
          </div>
          <div>
            <span className="block text-xs text-[var(--ink3)]">{t('patientProfile.email')}</span>
            <b className="font-semibold text-[var(--ink)] break-all">{p.email}</b>
          </div>
        </div>
      )}
    </section>
  );
}

export function PatientProfile(): React.JSX.Element {
  const { t } = useTranslation();
  const {
    lang,
    setLang,
    pid,
    setPid,
    size,
    setSize,
    push,
    setPush,
    mail,
    setMail,
    setTab,
    openSheet,
    toast,
  } = usePatient();

  const handleLanguageChange = (newLang: string) => {
    setLang(newLang);
    toast(newLang === 'ml' ? 'മലയാളത്തിലേക്ക് മാറ്റി' : 'Switched to English');
  };

  const handlePushToggle = () => {
    const next = !push;
    setPush(next);
    toast(next ? t('patientProfile.pushEnabled') : t('patientProfile.pushDisabled'));
  };

  const handleMailToggle = () => {
    setMail(!mail);
  };

  return (
    <div className="fadein space-y-6">
      {/* Page Header */}
      <div className="pt-3 pb-2 lg:pt-0">
        <h1 className="disp text-3xl font-bold text-[var(--ink)]">
          {t('patientProfile.title')}
        </h1>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-10">
        {/* Left Column: ID Card, Family, Help */}
        <div className="flex flex-col gap-6">
          <IdCard />

          {/* Family members on this login */}
          <section aria-labelledby="family-heading">
            <h2 id="family-heading" className="text-lg font-bold text-[var(--ink)] mb-3">
              {t('patientProfile.familyTitle')}
            </h2>
            <div className="grp">
              {SAMPLE_PEOPLE.map((x: PatientPerson) => {
                const isSelected = pid === x.id;
                return (
                  <button
                    key={x.id}
                    type="button"
                    className="row press text-left justify-between"
                    onClick={() => {
                      if (!isSelected) {
                        setPid(x.id);
                        toast(t('patientProfile.nowViewing', { name: x.first }));
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`av ${x.kid ? 'kid' : ''}`}
                        style={{ width: 42, height: 42, fontSize: 15 }}
                        aria-hidden="true"
                      >
                        {x.ini}
                      </span>
                      <div className="min-w-0">
                        <b className="block font-bold text-[var(--ink)]">{x.name}</b>
                        <span className="block text-xs text-[var(--ink3)]">
                          {x.rel === 'self'
                            ? lang === 'ml'
                              ? 'നിങ്ങൾ'
                              : 'You'
                            : lang === 'ml'
                            ? 'നിങ്ങളുടെ കുട്ടി, നിങ്ങൾ രക്ഷിതാവ്'
                            : "Your child, you're the guardian"}
                        </span>
                      </div>
                    </div>

                    {isSelected ? (
                      <span className="tag tag-leaf">
                        <Check size={14} />
                        <span>{t('patientProfile.viewing')}</span>
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--leaf)]">
                        {t('patientProfile.switchTo')}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[var(--ink3)] mt-2">
              {t('patientProfile.addFamily')}
            </p>
          </section>

          {/* Hospital Help & Contacts */}
          <section aria-labelledby="help-heading">
            <h2 id="help-heading" className="text-lg font-bold text-[var(--ink)] mb-3">
              {t('patientProfile.helpTitle')}
            </h2>
            <div className="grp">
              <a
                className="row press"
                href="tel:04840001234"
                aria-label={`${t('patientProfile.frontDesk')}: 0484 000 1234`}
              >
                <span className="ico ico-leaf">
                  <Phone size={18} />
                </span>
                <span className="flex-1 min-w-0">
                  <b className="block text-[var(--ink)] font-bold">
                    {t('patientProfile.frontDesk')}
                  </b>
                  <span className="block text-xs text-[var(--ink3)]">0484 000 1234</span>
                </span>
                <ChevronRight size={20} className="text-[var(--ink3)]" />
              </a>

              <a
                className="row press"
                href="tel:04840000112"
                aria-label={`${t('patientProfile.casualty')}: 0484 000 0112, open 24 hours`}
              >
                <span className="ico ico-lat">
                  <Phone size={18} />
                </span>
                <span className="flex-1 min-w-0">
                  <b className="block text-[var(--ink)] font-bold">
                    {t('patientProfile.casualty')}
                  </b>
                  <span className="block text-xs text-[var(--ink3)]">
                    0484 000 0112, {t('patientProfile.open247')}
                  </span>
                </span>
                <ChevronRight size={20} className="text-[var(--ink3)]" />
              </a>

              <a
                className="row press"
                href="mailto:grievance@abchospital.example"
                aria-label={`${t('patientProfile.grievance')}: grievance@abchospital.example`}
              >
                <span className="ico ico-mist">
                  <Mail size={18} />
                </span>
                <span className="flex-1 min-w-0">
                  <b className="block text-[var(--ink)] font-bold">
                    {t('patientProfile.grievance')}
                  </b>
                  <span className="block text-xs text-[var(--ink3)] truncate">
                    grievance@abchospital.example
                  </span>
                </span>
                <ChevronRight size={20} className="text-[var(--ink3)]" />
              </a>
            </div>
          </section>
        </div>

        {/* Right Column: Settings, Quick Nav, Sign out */}
        <div className="flex flex-col gap-6 mt-8 lg:mt-0">
          <section aria-labelledby="settings-heading">
            <h2 id="settings-heading" className="text-lg font-bold text-[var(--ink)] mb-3">
              {t('patientProfile.settingsTitle')}
            </h2>
            <div className="grp">
              {/* Language Switch */}
              <div className="row flex-wrap justify-between gap-3">
                <span className="font-semibold text-[var(--ink)]">
                  {t('patientProfile.language')}
                </span>
                <div className="w-full sm:w-56">
                  <div className="seg seg-sm" role="group" aria-label={t('patientProfile.language')}>
                    <button
                      type="button"
                      className={`press ${lang === 'en' ? 'on' : ''}`}
                      onClick={() => handleLanguageChange('en')}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      className={`press ${lang === 'ml' ? 'on' : ''}`}
                      onClick={() => handleLanguageChange('ml')}
                    >
                      മലയാളം
                    </button>
                  </div>
                </div>
              </div>

              {/* Text Size */}
              <div className="row flex-wrap justify-between gap-3">
                <span className="font-semibold text-[var(--ink)]">
                  {t('patientProfile.textSize')}
                </span>
                <div className="w-full sm:w-56">
                  <div className="seg seg-sm" role="group" aria-label={t('patientProfile.textSize')}>
                    <button
                      type="button"
                      className={`press ${size === 0 ? 'on' : ''}`}
                      onClick={() => setSize(0)}
                      title={t('patientProfile.sizeDefault')}
                    >
                      <span className="text-xs">A</span>
                    </button>
                    <button
                      type="button"
                      className={`press ${size === 1 ? 'on' : ''}`}
                      onClick={() => setSize(1)}
                      title={t('patientProfile.sizeLarge')}
                    >
                      <span className="text-base font-bold">A</span>
                    </button>
                    <button
                      type="button"
                      className={`press ${size === 2 ? 'on' : ''}`}
                      onClick={() => setSize(2)}
                      title={t('patientProfile.sizeLarger')}
                    >
                      <span className="text-lg font-extrabold">A</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Push Notifications Switch */}
              <div className="row justify-between">
                <div>
                  <b className="block text-[var(--ink)] font-bold">
                    {t('patientProfile.pushOn')}
                  </b>
                  <span className="block text-xs text-[var(--ink3)]">
                    {t('patientProfile.pushSub')}
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={push}
                  aria-label={t('patientProfile.pushOn')}
                  className={`sw press ${push ? 'on' : ''}`}
                  onClick={handlePushToggle}
                >
                  <i />
                </button>
              </div>

              {/* Email Notifications Switch */}
              <div className="row justify-between">
                <div>
                  <b className="block text-[var(--ink)] font-bold">
                    {t('patientProfile.emailOn')}
                  </b>
                  <span className="block text-xs text-[var(--ink3)]">
                    {t('patientProfile.emailSub')}
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={mail}
                  aria-label={t('patientProfile.emailOn')}
                  className={`sw press ${mail ? 'on' : ''}`}
                  onClick={handleMailToggle}
                >
                  <i />
                </button>
              </div>
            </div>
          </section>

          {/* Quick links */}
          <section className="grp" aria-label="Portal Shortcuts">
            <button
              type="button"
              className="row press text-left"
              onClick={() => openSheet({ type: 'notice' })}
            >
              <span className="ico ico-mist">
                <ShieldCheck size={18} />
              </span>
              <span className="flex-1 min-w-0">
                <b className="block text-[var(--ink)] font-bold">
                  {t('patientProfile.privacyData')}
                </b>
                <span className="block text-xs text-[var(--ink3)]">
                  {t('patientProfile.privacySub')}
                </span>
              </span>
              <ChevronRight size={20} className="text-[var(--ink3)] flex-none" />
            </button>

            <button
              type="button"
              className="row press text-left"
              onClick={() => setTab('reminders')}
            >
              <span className="ico ico-mist">
                <Bell size={18} />
              </span>
              <span className="flex-1 min-w-0">
                <b className="block text-[var(--ink)] font-bold">
                  {t('patientProfile.reminders')}
                </b>
              </span>
              <ChevronRight size={20} className="text-[var(--ink3)] flex-none" />
            </button>

            <button
              type="button"
              className="row press text-left"
              onClick={() => setTab('appts')}
            >
              <span className="ico ico-mist">
                <CalendarDays size={18} />
              </span>
              <span className="flex-1 min-w-0">
                <b className="block text-[var(--ink)] font-bold">
                  {t('patientProfile.appts')}
                </b>
              </span>
              <ChevronRight size={20} className="text-[var(--ink3)] flex-none" />
            </button>
          </section>

          {/* Sign Out Button & Version */}
          <div className="pt-2">
            <button
              type="button"
              className="btn-p btn-sec press w-full shadow-sm text-[var(--ink)]"
              onClick={() => openSheet({ type: 'confirm', k: 'signout' })}
            >
              <LogOut size={20} className="text-[var(--ink2)]" />
              <span>{t('patientProfile.signOut')}</span>
            </button>
            <p className="text-xs text-[var(--ink3)] text-center mt-4">
              {t('patientProfile.version')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
