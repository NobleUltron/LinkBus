import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { landingPathForRole, useAuth } from '../contexts/AuthContext';
import type { RoleSlug } from '../types/models';
import { BrandedLoader } from './ui/Brand';
interface ProtectedRouteProps {
  allowedRoles?: RoleSlug[];
  children: React.ReactNode;
}
export function ProtectedRoute({
  allowedRoles,
  children
}: ProtectedRouteProps) {
  const {
    isAuthenticated,
    booting,
    user
  } = useAuth();
  const location = useLocation();
  if (booting) return <BrandedLoader />;
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{
      from: location.pathname
    }} />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={landingPathForRole(user.role)} replace />;
  }
  return <>{children}</>;
}