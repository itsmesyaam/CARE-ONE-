import React, { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { client, isConfigured } from '../lib/client';

export function AdminRouteGuard({ children }: { children: ReactNode }): React.JSX.Element {
  const [checked, setChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    if (!isConfigured) return;
    client.auth
      .getSession()
      .then(({ data }) => {
        setHasSession(!!data?.session);
        setChecked(true);
      })
      .catch(() => {
        setHasSession(false);
        setChecked(true);
      });
  }, []);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
      </div>
    );
  }

  if (!hasSession) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
