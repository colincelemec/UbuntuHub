// ============================================
// Service: businesses
// AJAX calls to the REST API
// ============================================

import api from './api';

const businessService = {
  /**
   * List every business (paginated and filtered)
   * @param {Object} params - { page, limit, city, category }
   */
  getAllBusinesses: async (params = {}) => {
    try {
      const response = await api.get('/businesses', params);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Search for businesses
   * @param {Object} params - { q, city, category, lat, lng, radius }
   */
  searchBusinesses: async (params) => {
    try {
      const response = await api.get('/businesses/search', params);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Fetch one business by its slug
   * @param {string} slug
   */
  getBusinessBySlug: async (slug) => {
    try {
      const response = await api.get(`/businesses/${slug}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Fetch the reviews of a business
   * @param {string} id
   * @param {Object} params - { page, limit }
   */
  getBusinessReviews: async (id, params = {}) => {
    try {
      const response = await api.get(`/businesses/${id}/reviews`, params);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create a new business
   * @param {Object} businessData
   */
  createBusiness: async (businessData) => {
    try {
      const response = await api.post('/businesses', businessData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update a business
   * @param {string} id
   * @param {Object} updateData
   */
  updateBusiness: async (id, updateData) => {
    try {
      const response = await api.put(`/businesses/${id}`, updateData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete a business
   * @param {string} id
   */
  deleteBusiness: async (id) => {
    try {
      const response = await api.delete(`/businesses/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Add to or remove from favourites
   * @param {string} id
   */
  toggleFavorite: async (id) => {
    try {
      const response = await api.post(`/businesses/${id}/favorite`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Fetch the list of cities (form reference data)
   */
  getCities: async () => {
    try {
      const response = await api.get('/meta/cities');
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Fetch the list of categories (form reference data)
   */
  getCategories: async () => {
    try {
      const response = await api.get('/meta/categories');
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Fetch my own businesses
   */
  getMyBusinesses: async () => {
    try {
      const response = await api.get('/businesses/my/list');
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Grant the verified badge (ADMIN)
   * @param {string} id
   */
  verifyBusiness: async (id) => {
    try {
      const response = await api.patch(`/businesses/${id}/verify`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Change a business status (ADMIN)
   * @param {string} id
   * @param {string} status
   */
  updateBusinessStatus: async (id, status) => {
    try {
      const response = await api.patch(`/businesses/${id}/status`, { status });
      return response;
    } catch (error) {
      throw error;
    }
  },

};

export default businessService;
