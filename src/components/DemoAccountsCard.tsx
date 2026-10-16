import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import { DemoAccount, DEMO_PASSWORD } from '../lib/demoAccounts';

export interface DemoAccountsCardProps {
  accounts: DemoAccount[];
  onFill: (username: string, password: string) => void;
  onFillAndSignIn: (username: string, password: string) => void;
  submitBtnRef?: React.RefObject<HTMLButtonElement | null>;
}

export function DemoAccountsCard({
  accounts,
  onFill,
  onFillAndSignIn,
  submitBtnRef,
}: DemoAccountsCardProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/config', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('config fetch failed');
        return res.json();
      })
      .then((data: unknown) => {
        if (
          active &&
          typeof data === 'object' &&
          data !== null &&
          (data as { demoMode?: boolean }).demoMode === true
        ) {
          setDemoMode(true);
        }
      })
      .catch(() => {
        // Safe default: leave false
      });
    return () => {
      active = false;
    };
  }, []);

  if (!demoMode) {
    return null;
  }

  return (
    <div className="mt-6 pt-5 border-t border-[rgba(11,21,51,0.08)]">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-left">
        <div className="flex items-start gap-2 mb-3">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              {t('demo.cardTitle')}
            </h2>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              {t('demo.cardWarning')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
          {accounts.map((acc) => (
            <div
              key={acc.username}
              className="p-3 rounded-xl border border-amber-200/90 bg-white shadow-2xs flex flex-col justify-between gap-2"
            >
              <button
                type="button"
                onClick={() => {
                  onFill(acc.username, DEMO_PASSWORD);
                  submitBtnRef?.current?.focus();
                }}
                className="text-left w-full hover:opacity-80 transition cursor-pointer"
              >
                <div className="font-bold text-slate-800 text-xs sm:text-sm">
                  {acc.label}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {t(acc.descriptionKey)}
                </div>
              </button>

              <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">
                  {acc.username}
                </span>
                <button
                  type="button"
                  onClick={() => onFillAndSignIn(acc.username, DEMO_PASSWORD)}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                >
                  {t('demo.fillAndSignIn')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
