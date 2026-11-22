import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/context/useAuth.js';
import { roleLandingPath } from '../utils/roleLanding.js';
import FullPageLoader from '../components/common/FullPageLoader.jsx';

export function PublicRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <FullPageLoader />;
  if (!isAuthenticated) return <Outlet />;
  return <Navigate to={roleLandingPath(user.role)} replace />;
}

export function ProtectedRoute({ roles }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageLoader />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/access-denied" replace />;
  }
  return <Outlet />;
}

