import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Fingerprint,
  ShieldCheck,
  AlertCircle,
  QrCode,
  Languages,
  CheckCircle2,
} from 'lucide-react';
import { startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { usePatient } from './PatientContext';
import { BuildStamp } from '../../components/BuildStamp';

export function PatientSignIn(): React.JSX.Element {
  const { lang, setLang, go } = usePatient();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // WebAuthn Passkey sign-in handler
  const handlePasskeySignIn = async () => {
    setError(null);

    // 1. Check browser capabilities
    if (!browserSupportsWebAuthn()) {
      setError(
        lang === 'ml'
          ? 'നിങ്ങളുടെ ബ്രൗസർ പാസ്‌കീ പിന്തുണയ്ക്കുന്നില്ല. ദയവായി Android 9+ ലെ Chrome അല്ലെങ്കിൽ iOS 16+ ലെ Safari ഉപയോഗിക്കുക.'
          : 'Your browser does not support passkeys. Please use Chrome on Android 9+ or Safari on iOS 16+.'
      );
      return;
    }

    setLoading(true);

    try {
      // 2. Fetch authentication options from Worker
      const optRes = await fetch('/api/auth/passkey/login/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const optData = (await optRes.json()) as { options?: unknown; error?: string };
      if (!optRes.ok || !optData.options) {
        throw new Error(optData.error || 'Failed to start passkey sign-in');
      }

      // 3. Prompt user for biometric unlock (Fingerprint / Face ID / Windows Hello)
      const authResponse = await startAuthentication(optData.options as Parameters<typeof startAuthentication>[0]);

      // 4. Verify assertion on Worker backend
      const verifyRes = await fetch('/api/auth/passkey/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: authResponse }),
      });

      const verifyData = (await verifyRes.json()) as { ok?: boolean; error?: string };
      if (!verifyRes.ok || !verifyData.ok) {
        throw new Error(verifyData.error || 'Passkey verification failed');
      }

      setSuccess(true);
      setTimeout(() => {
        go('consent');
        navigate('/patient');
      }, 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('NotAllowedError') || message.toLowerCase().includes('cancel')) {
        setError(
          lang === 'ml'
            ? 'സൈൻ ഇൻ റദ്ദാക്കി. വീണ്ടും ശ്രമിക്കുക.'
            : 'Sign-in was cancelled. Please try again.'
        );
      } else if (message.toLowerCase().includes('not found') || message.toLowerCase().includes('revoked')) {
        setError(
          lang === 'ml'
            ? 'ഈ ഉപകരണത്തിൽ പാസ്‌കീ കണ്ടെത്തിയില്ല അല്ലെങ്കിൽ റദ്ദാക്കി. ഫ്രണ്ട് ഡെസ്കിൽ നിന്ന് പുതിയ QR കോഡ് നേടുക.'
            : 'No passkey found on this device or it has been revoked. Ask the front desk for a new setup QR code.'
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Local demo sign-in handler (available only in local development)
  const handleDemoSignIn = async (role: 'patient' | 'guardian') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/demo-signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          id: role === 'guardian' ? 'e0000000-0000-0000-0000-000000000002' : 'e0000000-0000-0000-0000-000000000001',
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Demo sign-in failed');
      }
      setSuccess(true);
      setTimeout(() => {
        go('app');
        navigate('/patient');
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const isLocal = import.meta.env.DEV;

  return (
    <div className={`patient-theme ${lang === 'ml' ? 'ml' : ''} min-h-screen bg-[var(--paper)] flex flex-col justify-between overflow-x-hidden w-full text-[var(--ink)]`}>
      <div className="zari-band" />

      {/* Header with Hospital Brand and Language Switcher */}
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

        <button
          type="button"
          onClick={() => setLang(lang === 'ml' ? 'en' : 'ml')}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-3.5 py-1.5 text-xs font-semibold text-[var(--ink2)] shadow-2xs hover:bg-[var(--leaft)] transition-colors"
          aria-label="Toggle language"
        >
          <Languages size={15} />
          <span>{lang === 'ml' ? 'English' : 'മലയാളം'}</span>
        </button>
      </header>

      {/* Main Passkey Sign-In Container */}
      <main className="flex-1 w-full max-w-lg mx-auto px-5 py-10 lg:py-16 flex flex-col justify-center">
        <div className="bg-white rounded-3xl p-7 sm:p-9 shadow-xl border border-[var(--line)]">
          <div className="w-16 h-16 rounded-2xl bg-[var(--mist)] text-[var(--leaf)] flex items-center justify-center mb-6 mx-auto">
            {success ? <CheckCircle2 size={36} className="leaf" /> : <Fingerprint size={36} />}
          </div>

          <h1 className="disp text-2xl sm:text-3xl font-bold text-center text-[var(--ink)]">
            {lang === 'ml' ? 'സുരക്ഷിത പ്രവേശനം' : 'Secure Sign-In'}
          </h1>

          <p className="text-[var(--ink2)] text-sm sm:text-base text-center mt-3 leading-relaxed">
            {lang === 'ml'
              ? 'നിങ്ങളുടെ മെഡിക്കൽ രേഖകൾ കാണാൻ ഫോണിന്റെ ഫിംഗർപ്രിന്റ് അല്ലെങ്കിൽ ഫെയ്സ് ലോക്ക് ഉപയോഗിക്കുക.'
              : 'Unlock your health records using your phone’s fingerprint or face lock. No SMS codes or passwords needed.'}
          </p>

          {/* Error Alert Box */}
          {error && (
            <div className="mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5">
              <AlertCircle size={18} className="flex-none mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Biometric Passkey Action Button */}
          <div className="mt-8 flex flex-col gap-4">
            <button
              type="button"
              className="btn-p btn-pri press w-full shadow-md py-4 text-base font-semibold flex items-center justify-center gap-2.5"
              disabled={loading || success}
              onClick={handlePasskeySignIn}
            >
              {loading ? (
                <>
                  <span className="spin" />
                  <span>{lang === 'ml' ? 'പരിശോധിക്കുന്നു...' : 'Checking biometric...'}</span>
                </>
              ) : success ? (
                <>
                  <CheckCircle2 size={20} />
                  <span>{lang === 'ml' ? 'വിജയം!' : 'Success!'}</span>
                </>
              ) : (
                <>
                  <Fingerprint size={22} />
                  <span>
                    {lang === 'ml'
                      ? 'വിരലടയാളം അല്ലെങ്കിൽ ഫെയ്സ് ലോക്ക് ഉപയോഗിച്ച് പ്രവേശിക്കുക'
                      : 'Sign in with fingerprint or face lock'}
                  </span>
                </>
              )}
            </button>

            {/* Helper notice for first-time visitors */}
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-[var(--ink3)] mt-2 text-center">
              <QrCode size={16} className="flex-none text-[var(--leaf)]" />
              <span>
                {lang === 'ml'
                  ? 'ആദ്യമായാണോ? ഫ്രണ്ട് ഡെസ്കിൽ നിന്ന് നിങ്ങളുടെ സെറ്റപ്പ് QR കോഡ് നേടുക.'
                  : 'First time? Ask the front desk for your setup QR code.'}
              </span>
            </div>
          </div>

          {/* Privacy & DPDP Notice */}
          <div className="mt-8 pt-6 border-t border-[var(--line)] flex items-start gap-2.5 text-xs text-[var(--ink3)]">
            <ShieldCheck size={18} className="leaf flex-none mt-0.5" />
            <span>
              {lang === 'ml'
                ? 'ഇന്ത്യ ഡിപിഡിപി ആക്ട് 2023 പ്രകാരം സംരക്ഷിതം. നിങ്ങളുടെ ബയോമെട്രിക് വിവരങ്ങൾ നിങ്ങളുടെ ഫോണിൽ മാത്രമാണ് സൂക്ഷിക്കുന്നത്.'
                : 'India DPDP Act 2023 compliant. Your biometric credentials remain securely on your personal device.'}
            </span>
          </div>

          {/* Local-only Demo Sign-in buttons (STRIPPED IN PRODUCTION BUILDS) */}
          {isLocal && (
            <div className="mt-8 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-left">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-amber-800 mb-2">
                Local Development Only (Demo Sign-In)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDemoSignIn('patient')}
                  disabled={loading || success}
                  className="px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 transition shadow-xs text-center"
                >
                  Arun Kumar (Patient)
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoSignIn('guardian')}
                  disabled={loading || success}
                  className="px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 transition shadow-xs text-center"
                >
                  Sujatha (Guardian)
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <BuildStamp />
    </div>
  );
}
