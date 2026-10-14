import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Stethoscope } from 'lucide-react';
import { client } from '../../lib/client';
import { ChangePasswordCard } from '../../components/auth/ChangePasswordCard';
import { BuildStamp } from '../../components/BuildStamp';

export function ChangePasswordPage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [username, setUsername] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.auth
      .getSession()
      .then(({ data }) => {
        const user = data?.session?.user;
        if (!user) {
          navigate('/', { replace: true });
          return;
        }
        setUsername(user.username || user.email || '');
        setRole(user.role || '');
        setLoading(false);
      })
      .catch(() => {
        navigate('/', { replace: true });
      });
  }, [navigate]);

  const handleSuccess = () => {
    setTimeout(() => {
      if (role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (['patient', 'guardian'].includes(role)) {
        navigate('/patient', { replace: true });
      } else {
        navigate('/doctor', { replace: true });
      }
    }, 500);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FD] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 mb-3">
            <Stethoscope className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-[#0B1533]">CareOne</h1>
          <p className="text-xs text-[#6B7596] mt-1">{t('forcePasswordChange.title', 'Set New Password')}</p>
        </div>

        <ChangePasswordCard username={username} onSuccess={handleSuccess} />

        <div className="mt-6 text-center">
          <BuildStamp />
        </div>
      </div>
    </div>
  );
}
