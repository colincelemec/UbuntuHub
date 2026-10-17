// ============================================
// Zustand Auth Store
// Global state management for authentication
// ============================================

import { create } from 'zustand';
import authService from '../services/authService';

const useAuthStore = create((set) => ({
  // State
  user: authService.getCurrentUser(),
  isAuthenticated: authService.isAuthenticated(),
  isLoading: false,
  error: null,

  // Actions
  /**
   * Set loading state
   */
  setLoading: (isLoading) => set({ isLoading }),

  /**
   * Set error
   */
  setError: (error) => set({ error }),

  /**
   * Clear error
   */
  clearError: () => set({ error: null }),

  /**
   * Login user
   */
  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.login(credentials);
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      return response;
    } catch (error) {
      set({
        error: error.message,
        isLoading: false
      });
      throw error;
    }
  },

  /**
   * Login with Google
   */
  googleLogin: async (idToken) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.googleLogin(idToken);
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      return response;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  /**
   * Register new user
   */
  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.register(userData);
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      return response;
    } catch (error) {
      set({
        error: error.message,
        isLoading: false
      });
      throw error;
    }
  },

  /**
   * Logout user
   */
  logout: () => {
    authService.logout();
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
  },

  /**
   * Update user profile
   */
  updateProfile: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.updateProfile(userData);
      set({
        user: response.user,
        isLoading: false,
        error: null
      });
      return response;
    } catch (error) {
      set({
        error: error.message,
        isLoading: false
      });
      throw error;
    }
  },

  /**
   * Refresh user profile
   */
  refreshProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.getProfile();
      set({
        user: response.user,
        isLoading: false,
        error: null
      });
      return response;
    } catch (error) {
      set({
        error: error.message,
        isLoading: false
      });
      throw error;
    }
  },

  /**
   * Check auth status on app load
   */
  checkAuth: () => {
    const user = authService.getCurrentUser();
    const isAuthenticated = authService.isAuthenticated();
    set({ user, isAuthenticated });
  }
}));

export default useAuthStore;
