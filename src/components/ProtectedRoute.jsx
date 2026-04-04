import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { defaultRouteByRole, getSession, hasRequiredRole } from '../utils/auth';

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const user = getSession();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!hasRequiredRole(user, allowedRoles)) {
    const fallback = defaultRouteByRole(user.yetki);
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
