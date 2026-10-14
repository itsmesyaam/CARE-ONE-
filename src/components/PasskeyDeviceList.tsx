import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Fingerprint, Smartphone, Laptop, Trash2, Check, AlertCircle } from 'lucide-react';

interface PasskeyItem {
  id: string;
  credential_id: string;
  device_label: string | null;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

interface PasskeyDeviceListProps {
  userRole?: 'patient' | 'staff';
}

export function PasskeyDeviceList({ userRole = 'patient' }: PasskeyDeviceListProps): React.JSX.Element {
  const { i18n } = useTranslation();
  const isMl = i18n.language === 'ml';

  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchPasskeys = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/me/passkeys');
        if (!res.ok) {
          if (mounted) {
            setPasskeys([]);
          }
          return;
        }
        const data = (await res.json()) as { passkeys?: PasskeyItem[] };
        if (mounted) {
          setPasskeys(data.passkeys || []);
        }
      } catch {
        if (mounted) {
          setPasskeys([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void fetchPasskeys();
    return () => {
      mounted = false;
    };
  }, []);

  const handleRevoke = async (id: string, label: string) => {
    const confirmPrompt = isMl
      ? `ഈ ഉപകരണം (${label}) നീക്കം ചെയ്യണമെന്ന് ഉറപ്പാണോ?`
      : `Are you sure you want to remove this passkey device (${label})?`;

    if (!confirm(confirmPrompt)) return;

    setRevokingId(id);
    setError(null);

    try {
      const res = await fetch(`/api/me/passkeys/${id}`, {
        method: 'DELETE',
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to remove passkey');
      }

      setPasskeys((prev) => prev.filter((p) => p.id !== id));
      setSuccessMsg(isMl ? 'ഉപകരണം നീക്കം ചെയ്തു' : 'Device removed successfully');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRevokingId(null);
    }
  };

  const activePasskeys = passkeys.filter((p) => !p.revoked_at);

  return (
    <div className="space-y-4">
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <Check size={16} className="text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="flex-none" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-6 text-center text-xs text-[var(--ink3)]">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--leaf)] border-t-transparent inline-block mr-2" />
          {isMl ? 'ഉപകരണങ്ങൾ ലഭ്യമാക്കുന്നു...' : 'Loading registered devices...'}
        </div>
      ) : activePasskeys.length === 0 ? (
        <div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] text-center">
          <Fingerprint size={28} className="mx-auto text-[var(--ink3)] mb-2 opacity-50" />
          <p className="text-xs text-[var(--ink2)] font-medium">
            {isMl
              ? 'ഈ അക്കൗണ്ടിൽ സജീവമായ പാസ്‌കീ ഉപകരണങ്ങളൊന്നുമില്ല.'
              : 'No active passkeys registered on this account.'}
          </p>
          {userRole === 'patient' && (
            <p className="text-[11px] text-[var(--ink3)] mt-1">
              {isMl
                ? 'പുതിയ ഉപകരണം ബന്ധിപ്പിക്കാൻ ഫ്രണ്ട് ഡെസ്കുമായി ബന്ധപ്പെടുക.'
                : 'Visit the front desk to link a new biometric device.'}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {activePasskeys.map((p) => {
            const label = p.device_label || (isMl ? 'പാസ്‌കീ ഉപകരണം' : 'Passkey Device');
            const isMobile = label.toLowerCase().includes('phone') || label.toLowerCase().includes('mobile');
            const dateStr = new Date(p.created_at).toLocaleDateString([], {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
            const lastUsedStr = p.last_used_at
              ? new Date(p.last_used_at).toLocaleDateString([], {
                  day: 'numeric',
                  month: 'short',
                })
              : null;

            return (
              <div
                key={p.id}
                className="p-3.5 rounded-2xl bg-white border border-[var(--line)] flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[var(--mist)] text-[var(--leaf)] flex items-center justify-center flex-none">
                    {isMobile ? <Smartphone size={20} /> : <Laptop size={20} />}
                  </div>
                  <div className="min-w-0">
                    <b className="block text-sm font-bold text-[var(--ink)] truncate">{label}</b>
                    <span className="block text-xs text-[var(--ink3)]">
                      {isMl ? `ചേർത്തത്: ${dateStr}` : `Added: ${dateStr}`}
                      {lastUsedStr && ` • ${isMl ? 'അവസാനം ഉപയോഗിച്ചത്' : 'Last used'}: ${lastUsedStr}`}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRevoke(p.id, label)}
                  disabled={revokingId === p.id}
                  className="p-2 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors flex-none"
                  aria-label={isMl ? `${label} നീക്കം ചെയ്യുക` : `Remove ${label}`}
                  title={isMl ? 'ഉപകരണം നീക്കം ചെയ്യുക' : 'Remove device'}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
