import { useState, useEffect, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { getConfig, subscribeConfig } from '../lib/config';

type Props = {
  children: ReactNode;
};

export function ProtectedRoute({ children }: Props) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = subscribeConfig(() => setTick((n) => n + 1));
    return unsub;
  }, []);

  const config = getConfig();
  if (!config) {
    return <Navigate to="/settings" replace />;
  }

  return <>{children}</>;
}
