import React, { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { client, isConfigured } from '../lib/client';
import { getRoleHome } from '../lib/role-routing';

export function AdminRouteGuard({ children }: { children: ReactNode }): React.JSX.Element {
  const [checked, setChecked] = useState(false);
  const [user, setUser] = useState<{ id: string; role?: string; must_change_password?: boolean } | null>(null);

  useEffect(() => {
    if (!isConfigured) return;
    let active = true;
    client.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setUser(data?.session?.user ?? null);
        setChecked(true);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setChecked(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.must_change_password) {
    return <Navigate to="/change-password" replace />;
  }

  if (user.role !== 'admin') {
    return <Navigate to={getRoleHome(user.role)} replace />;
  }

  return <>{children}</>;
}
