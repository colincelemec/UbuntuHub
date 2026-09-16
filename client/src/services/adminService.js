// ============================================
// Admin service — API calls used by the administration panel
// Every route requires an ADMIN user.
// ============================================

import api from './api';

const adminService = {
  // ── Overall statistics ──
  getStats: () => api.get('/admin/stats'),

  // ── Businesses ──
  getBusinesses: (params = {}) => api.get('/admin/businesses', params),
  getPendingBusinesses: () => api.get('/admin/businesses/pending'),

  /**
   * Approve a business → status VERIFIED
   */
  verifyBusiness: (id) => api.patch(`/businesses/${id}/verify`),

  /**
   * Change a business status
   * status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED'
   */
  updateBusinessStatus: (id, status) =>
    api.patch(`/businesses/${id}/status`, { status }),

  // ── Users ──
  getUsers: (params = {}) => api.get('/admin/users', params)
};

export default adminService;
