import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

export function ConfigBanner(): React.JSX.Element | null {
  const { t } = useTranslation();

  if (isSupabaseConfigured) {
    return null;
  }

  return (
    <div
      role="alert"
      className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-amber-900"
    >
      <div className="mx-auto flex max-w-5xl items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="flex-1 text-sm">
          <p className="font-semibold">{t('config.noticeTitle')}</p>
          <p className="mt-0.5 text-amber-800">{t('config.noticeMessage')}</p>
          <p className="mt-1 text-xs text-amber-700">{t('config.noticeInstructions')}</p>
        </div>
      </div>
    </div>
  );
}
