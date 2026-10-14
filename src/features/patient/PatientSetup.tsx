import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { Fingerprint, ShieldCheck, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { usePatient } from './PatientContext';

export function PatientSetup(): React.JSX.Element {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { lang, setLang, go } = usePatient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async () => {
    if (!token) {
      setError(
        lang === 'ml'
          ? 'സജ്ജീകരണ ലിങ്ക് അസാധുവാണ്. ഫ്രണ്ട് ഡെസ്കിൽ നിന്ന് പുതിയ QR കോഡ് നേടുക.'
          : 'Setup link is missing or invalid. Please ask the front desk for a new QR code.'
      );
      return;
    }

    if (!browserSupportsWebAuthn()) {
      setError(
        lang === 'ml'
          ? 'നിങ്ങളുടെ ബ്രൗസർ പാസ്‌കീ പിന്തുണയ്ക്കുന്നില്ല. ദയവായി Android 9+ ലെ Chrome അല്ലെങ്കിൽ iOS 16+ ലെ Safari ഉപയോഗിക്കുക.'
          : 'Your browser does not support passkeys. Please use Chrome on Android 9+ or Safari on iOS 16+.'
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch WebAuthn registration options
      const optRes = await fetch('/api/auth/passkey/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const optData = (await optRes.json()) as { options?: unknown; error?: string };
      if (!optRes.ok || !optData.options) {
        throw new Error(
          optData.error ||
            (lang === 'ml'
              ? 'ലിങ്ക് കാലഹരണപ്പെട്ടു. ദയവായി ഫ്രണ്ട് ഡെസ്കിൽ നിന്ന് പുതിയ QR കോഡ് നേടുക.'
              : 'Link expired or already used. Please request a new setup QR code at the desk.')
        );
      }

      // 2. Browser platform biometric prompt (Fingerprint / Face ID / Windows Hello)
      const regResponse = await startRegistration(optData.options as Parameters<typeof startRegistration>[0]);

      // 3. Verify attestation on Worker backend
      const verifyRes = await fetch('/api/auth/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          response: regResponse,
          device_label: navigator.userAgent.includes('Mobile') ? 'Mobile Phone' : 'Desktop Browser',
        }),
      });

      const verifyData = (await verifyRes.json()) as { ok?: boolean; error?: string };
      if (!verifyRes.ok || !verifyData.ok) {
        throw new Error(verifyData.error || 'Failed to register biometric passkey');
      }

      setSuccess(true);
      setTimeout(() => {
        go('consent');
        navigate('/patient');
      }, 1200);
    } catch (err: unknown) {
      console.error('Passkey setup error:', err);
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('NotAllowedError') || message.includes('cancelled')) {
        setError(
          lang === 'ml'
            ? 'ബയോമെട്രിക് രജിസ്ട്രേഷൻ റദ്ദാക്കി. വീണ്ടും ശ്രമിക്കുക.'
            : 'Biometric registration was cancelled. Please try again.'
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--paper)] text-[var(--ink)]">
      <div className="zari-band" />
      <header className="flex items-center justify-between gap-4 px-5 lg:px-12 pt-5">
        <div className="flex items-center gap-3">
          <span className="logo" aria-hidden="true">
            ABC
          </span>
          <span className="leading-tight">
            <b className="block text-base font-bold text-[var(--ink)]">ABC Hospital</b>
            <span className="block text-xs text-[var(--ink3)]">
              {lang === 'ml' ? 'കെയർ ആപ്പ്' : 'Care app'}
            </span>
          </span>
        </div>
        <div className="seg seg-sm w-[170px]" role="radiogroup">
          <button
            type="button"
            className={lang === 'en' ? 'on' : ''}
            onClick={() => setLang('en')}
          >
            English
          </button>
          <button
            type="button"
            className={lang === 'ml' ? 'on' : ''}
            onClick={() => setLang('ml')}
          >
            മലയാളം
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto px-5 py-8 lg:py-14 flex flex-col justify-center">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[var(--line)]">
          <div className="w-16 h-16 rounded-2xl bg-[var(--mist)] text-[var(--leaf)] flex items-center justify-center mb-6 mx-auto">
            {success ? <CheckCircle2 size={36} className="leaf" /> : <Fingerprint size={36} />}
          </div>

          <h1 className="disp text-2xl sm:text-3xl font-bold text-center text-[var(--ink)]">
            {lang === 'ml'
              ? 'ബയോമെട്രിക് പ്രവേശനം ക്രമീകരിക്കുക'
              : 'Set up Biometric Access'}
          </h1>

          <p className="text-[var(--ink2)] text-sm sm:text-base text-center mt-3 leading-relaxed">
            {lang === 'ml'
              ? 'നിങ്ങളുടെ മെഡിക്കൽ രേഖകൾ സുരക്ഷിതമായി കാണാൻ ഫോണിന്റെ ഫിംഗർപ്രിന്റ് അല്ലെങ്കിൽ ഫെയ്സ് ലോക്ക് ഉപയോഗിക്കുക. പാസ്‌വേഡോ എസ്എംഎസ് കോഡോ ആവശ്യമില്ല.'
              : 'Unlock your medical records instantly using your fingerprint, face unlock, or screen lock. No passwords or SMS codes needed.'}
          </p>

          <div className="mt-6 p-4 rounded-2xl bg-[var(--mist)] flex items-start gap-3">
            <ShieldCheck size={22} className="leaf flex-none mt-0.5" />
            <div className="text-xs sm:text-sm text-[var(--ink2)] leading-snug">
              <b className="block text-[var(--ink)] font-semibold mb-0.5">
                {lang === 'ml' ? 'ഇന്ത്യ ഡിപിഡിപി ആക്ട് സംരക്ഷിതം' : 'India DPDP Act Compliant'}
              </b>
              {lang === 'ml'
                ? 'നിങ്ങളുടെ ബയോമെട്രിക് വിവരങ്ങൾ നിങ്ങളുടെ സ്വന്തം ഉപകരണത്തിൽ മാത്രമേ സൂക്ഷിക്കൂ; ഹോസ്പിറ്റൽ സെർവറുകളിലേക്ക് അയക്കില്ല.'
                : 'Your biometrics never leave your physical device; only a cryptographic passkey is registered.'}
            </div>
          </div>

          {error && (
            <div className="mt-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5">
              <AlertCircle size={18} className="flex-none mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              className="btn-p btn-pri press w-full shadow-md flex items-center justify-center gap-2"
              disabled={loading || success}
              onClick={handleRegister}
            >
              {loading ? (
                <>
                  <span className="spin" />
                  <span>{lang === 'ml' ? 'സജ്ജീകരിക്കുന്നു...' : 'Setting up...'}</span>
                </>
              ) : success ? (
                <>
                  <CheckCircle2 size={18} />
                  <span>{lang === 'ml' ? 'വിജയം!' : 'Success!'}</span>
                </>
              ) : (
                <>
                  <Fingerprint size={20} />
                  <span>
                    {lang === 'ml'
                      ? 'എന്റെ പാസ്‌കീ സൃഷ്ടിക്കുക'
                      : 'Create my passkey'}
                  </span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
