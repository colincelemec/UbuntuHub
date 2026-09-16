// ============================================
// Admin Route Component
// Access restricted to users holding the ADMIN role
// ============================================

import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';

const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();

  // Not signed in → login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Signed in but not an admin → dashboard
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default AdminRoute;
