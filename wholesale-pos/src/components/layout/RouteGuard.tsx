import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

interface RouteGuardProps {
  children: React.ReactNode;
}

export default function RouteGuard({ children }: RouteGuardProps) {
  const { isAuthenticated, isLocked } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isLocked) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
