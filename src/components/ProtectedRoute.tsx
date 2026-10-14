import React, { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { client } from '../lib/client';

export interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps): React.JSX.Element {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;
    client.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        const user = data?.session?.user;
        if (!user) {
          setAuthorized(false);
        } else if (allowedRoles && allowedRoles.length > 0) {
          const userRole = user.role || '';
          setAuthorized(allowedRoles.includes(userRole));
        } else {
          setAuthorized(true);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setAuthorized(false);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [allowedRoles]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
      </div>
    );
  }

  if (!authorized) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
