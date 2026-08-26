import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { INTENTIONAL_LOGOUT_KEY, landingPathForRole, useAuth } from '../contexts/AuthContext';
import type { RoleSlug } from '../types/models';
import { BrandedLoader } from './ui/Brand';

interface ProtectedRouteProps {
  allowedRoles?: RoleSlug[];
  children: React.ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { isAuthenticated, booting, user } = useAuth();
  const location = useLocation();

  if (booting) return <BrandedLoader />;

  if (!isAuthenticated || !user) {
    // Intentional logout: the user clicked Sign Out.
    // Do NOT save `from` — the next login should land on the role's home page.
    const wasIntentionalLogout = sessionStorage.getItem(INTENTIONAL_LOGOUT_KEY);
    if (wasIntentionalLogout) {
      sessionStorage.removeItem(INTENTIONAL_LOGOUT_KEY);
      return <Navigate to="/login" replace />;
    }

    // Session expiry / 401: preserve `from` so the user returns to where they were.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={landingPathForRole(user.role)} replace />;
  }

  return <>{children}</>;
}