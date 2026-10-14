import React, { useState, useEffect, useMemo } from 'react';
import { QrCode, Copy, Check, Clock, ShieldAlert, X, AlertCircle } from 'lucide-react';
import { generateQrMatrix } from '../lib/qr';

interface SetupQrModalProps {
  patientId: string;
  patientName: string;
  uhid: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SetupQrModal({
  patientId,
  patientName,
  uhid,
  isOpen,
  onClose,
}: SetupQrModalProps): React.JSX.Element | null {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupUrl, setSetupUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(1800);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revokeSuccess, setRevokeSuccess] = useState(false);

  // Fetch setup link whenever modal opens
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;

    async function fetchSetupLink() {
      try {
        const res = await fetch(`/api/desk/patients/${patientId}/setup-link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        const data = (await res.json()) as {
          ok?: boolean;
          setup_url?: string;
          expires_at?: string;
          error?: string;
        };

        if (!res.ok || !data.ok || !data.setup_url) {
          throw new Error(data.error || 'Failed to generate setup QR link');
        }

        if (mounted) {
          const fullUrl = `${window.location.origin}${data.setup_url}`;
          setSetupUrl(fullUrl);
          const expTime = data.expires_at ? new Date(data.expires_at).getTime() : Date.now() + 30 * 60 * 1000;
          setExpiresAt(expTime);
          setSecondsRemaining(Math.max(0, Math.round((expTime - Date.now()) / 1000)));
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void fetchSetupLink();

    return () => {
      mounted = false;
    };
  }, [isOpen, patientId]);

  // Countdown timer effect
  useEffect(() => {
    if (!expiresAt || !isOpen) return;

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, isOpen]);

  // Generate QR Code matrix
  const matrix = useMemo(() => {
    if (!setupUrl) return null;
    try {
      return generateQrMatrix(setupUrl);
    } catch {
      return null;
    }
  }, [setupUrl]);

  const handleCopy = () => {
    if (!setupUrl) return;
    navigator.clipboard.writeText(setupUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRevokePasskeys = async () => {
    if (!confirm(`Revoke all existing passkeys for ${patientName}? They will need to scan this new QR code.`)) {
      return;
    }

    setRevoking(true);
    setError(null);
    try {
      const res = await fetch(`/api/desk/patients/${patientId}/revoke-passkeys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to revoke passkeys');
      }
      setRevokeSuccess(true);
      setTimeout(() => setRevokeSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRevoking(false);
    }
  };

  if (!isOpen) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-qr-modal-title"
    >
      <div className="staff-theme w-full max-w-md rounded-[28px] bg-white p-6 sm:p-7 shadow-2xl border border-[var(--line)] flex flex-col items-center text-center relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[var(--ink3)] hover:bg-[var(--mist)] hover:text-[var(--ink)] transition-colors"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-[var(--mist)] text-[var(--leaf)] flex items-center justify-center mb-3">
          <QrCode size={26} />
        </div>

        <h2 id="setup-qr-modal-title" className="text-xl font-bold text-[var(--ink)]">
          Set up Patient Care App
        </h2>
        <p className="text-sm font-semibold text-[var(--leaf)] mt-0.5">
          {patientName} &bull; <span className="font-mono text-xs">{uhid}</span>
        </p>

        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <span className="h-8 w-8 animate-spin rounded-full border-3 border-[var(--leaf)] border-t-transparent" />
            <span className="text-xs text-[var(--ink2)]">Generating secure passkey token...</span>
          </div>
        ) : error ? (
          <div className="my-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5 text-left w-full">
            <AlertCircle size={18} className="flex-none mt-0.5" />
            <span>{error}</span>
          </div>
        ) : (
          <>
            <p className="text-xs text-[var(--ink3)] mt-2 max-w-xs leading-relaxed">
              Ask the patient to scan this QR code with their phone camera to register their fingerprint or screen lock.
            </p>

            {/* QR Code SVG rendering */}
            <div className="mt-5 p-3 rounded-2xl bg-white border border-[var(--line)] shadow-xs">
              {matrix ? (
                <svg
                  viewBox={`0 0 ${matrix.length} ${matrix.length}`}
                  className="w-56 h-56 rounded-lg select-none"
                  aria-label={`Passkey setup QR code for ${patientName}`}
                >
                  <rect width={matrix.length} height={matrix.length} fill="#ffffff" />
                  {matrix.flatMap((row, r) =>
                    row.map((cell, c) =>
                      cell ? (
                        <rect
                          key={`${r}-${c}`}
                          x={c}
                          y={r}
                          width={1}
                          height={1}
                          fill="#173327"
                        />
                      ) : null
                    )
                  )}
                </svg>
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-xs text-[var(--ink3)]">
                  QR could not be rendered
                </div>
              )}
            </div>

            {/* 30-Minute Expiry Countdown */}
            <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              secondsRemaining < 300
                ? 'bg-rose-100 text-rose-800'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}>
              <Clock size={14} />
              <span>Link valid for {timeFormatted}</span>
            </div>

            {/* Actions: Copy Link & Revoke */}
            <div className="mt-5 w-full flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleCopy}
                className="btn btn-sec w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2 border-[var(--line)]"
              >
                {copied ? (
                  <>
                    <Check size={16} className="text-emerald-600" />
                    <span>Setup link copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span>Copy setup link to clipboard</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleRevokePasskeys}
                disabled={revoking}
                className="w-full py-2 text-xs font-semibold text-rose-700 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <ShieldAlert size={14} />
                <span>
                  {revoking
                    ? 'Revoking passkeys...'
                    : revokeSuccess
                    ? 'All passkeys revoked!'
                    : 'Lost phone? Revoke existing passkeys'}
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
