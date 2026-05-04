import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { getConfig } from '../lib/config';
import { useAuth } from '../hooks/useAuth';

type Props = {
  children: ReactNode;
};

export function ProtectedRoute({ children }: Props) {
  const config = getConfig();
  const { session, loading } = useAuth();

  if (!config) {
    return <Navigate to="/settings" replace />;
  }

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
