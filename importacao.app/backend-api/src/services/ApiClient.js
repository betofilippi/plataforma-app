const axios = require('axios');
const apiConfig = require('../config/apiConfig');

/**
 * Production-ready API client for ERP system
 * Handles real HTTP requests to backend APIs without mock data
 */
class ApiClient {
  constructor(customConfig = {}) {
    this.config = { ...apiConfig.config, ...customConfig };
    this.endpoints = apiConfig.getEndpoints();
    
    this.setupAxiosInstance();
    this.setupInterceptors();
  }

  /**
   * Setup axios instance with base configuration
   */
  setupAxiosInstance() {
    this.axios = axios.create(apiConfig.getAxiosConfig());
  }

  /**
   * Setup request and response interceptors
   */
  setupInterceptors() {
    // Request interceptor
    this.axios.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request ID for tracking
        config.headers['X-Request-ID'] = this.generateRequestId();

        // Log request in debug mode
        if (this.config.debug) {
          console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`, {
            headers: config.headers,
            data: config.data
          });
        }

        return config;
      },
      (error) => {
        console.error('[API Request Error]', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axios.interceptors.response.use(
      (response) => {
        // Log response in debug mode
        if (this.config.debug) {
          console.log(`[API Response] ${response.status} ${response.config.url}`, {
            data: response.data,
            headers: response.headers
          });
        }

        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle authentication errors
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            await this.refreshToken();
            // Retry original request with new token
            const token = this.getAuthToken();
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return this.axios(originalRequest);
          } catch (refreshError) {
            console.error('[Token Refresh Error]', refreshError);
            // Redirect to login or emit event
            this.handleAuthFailure();
            return Promise.reject(refreshError);
          }
        }

        // Handle network errors with retry logic
        if (this.shouldRetry(error) && !originalRequest._retryCount) {
          originalRequest._retryCount = 0;
        }

        if (this.shouldRetry(error) && originalRequest._retryCount < this.config.retries) {
          originalRequest._retryCount++;
          
          const delay = this.calculateRetryDelay(originalRequest._retryCount);
          console.log(`[API Retry] Attempt ${originalRequest._retryCount}/${this.config.retries} after ${delay}ms`);
          
          await this.delay(delay);
          return this.axios(originalRequest);
        }

        // Log error
        console.error('[API Response Error]', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          method: error.config?.method,
          data: error.response?.data
        });

        return Promise.reject(this.normalizeError(error));
      }
    );
  }

  /**
   * Authentication Methods
   */
  async login(credentials) {
    try {
      const response = await this.axios.post(this.endpoints.auth.login, credentials);
      
      if (response.data.success && response.data.data) {
        const { access_token, refresh_token, user } = response.data.data;
        
        // Store tokens
        this.setAuthToken(access_token);
        this.setRefreshToken(refresh_token);
        this.setUserData(user);
        
        return response.data;
      }
      
      throw new Error(response.data.message || 'Login failed');
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async logout() {
    try {
      await this.axios.post(this.endpoints.auth.logout);
    } catch (error) {
      console.warn('[Logout Error]', error);
    } finally {
      this.clearAuthData();
    }
  }

  async refreshToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await this.axios.post(this.endpoints.auth.refresh, {
        refresh_token: refreshToken
      });

      if (response.data.success && response.data.data) {
        const { access_token, refresh_token } = response.data.data;
        this.setAuthToken(access_token);
        this.setRefreshToken(refresh_token);
        return response.data;
      }

      throw new Error(response.data.message || 'Token refresh failed');
    } catch (error) {
      this.clearAuthData();
      throw this.normalizeError(error);
    }
  }

  /**
   * Dashboard API Methods
   */
  async getDashboardStats() {
    try {
      const response = await this.axios.get(this.endpoints.dashboard.stats);
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async getDashboardActivities(limit = 10) {
    try {
      const response = await this.axios.get(this.endpoints.dashboard.activities, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async getDashboardIntegrations() {
    try {
      const response = await this.axios.get(this.endpoints.dashboard.integrations);
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  /**
   * CAD (Cadastros) API Methods
   */
  async getClients(params = {}) {
    try {
      const response = await this.axios.get(this.endpoints.cad.clients, { params });
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async getClient(id) {
    try {
      const response = await this.axios.get(`${this.endpoints.cad.clients}/${id}`);
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async createClient(data) {
    try {
      const response = await this.axios.post(this.endpoints.cad.clients, data);
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async updateClient(id, data) {
    try {
      const response = await this.axios.put(`${this.endpoints.cad.clients}/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async deleteClient(id) {
    try {
      const response = await this.axios.delete(`${this.endpoints.cad.clients}/${id}`);
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async getProducts(params = {}) {
    try {
      const response = await this.axios.get(this.endpoints.cad.products, { params });
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async getProduct(id) {
    try {
      const response = await this.axios.get(`${this.endpoints.cad.products}/${id}`);
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async createProduct(data) {
    try {
      const response = await this.axios.post(this.endpoints.cad.products, data);
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async updateProduct(id, data) {
    try {
      const response = await this.axios.put(`${this.endpoints.cad.products}/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async deleteProduct(id) {
    try {
      const response = await this.axios.delete(`${this.endpoints.cad.products}/${id}`);
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async getSuppliers(params = {}) {
    try {
      const response = await this.axios.get(this.endpoints.cad.suppliers, { params });
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async getSupplier(id) {
    try {
      const response = await this.axios.get(`${this.endpoints.cad.suppliers}/${id}`);
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async createSupplier(data) {
    try {
      const response = await this.axios.post(this.endpoints.cad.suppliers, data);
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async updateSupplier(id, data) {
    try {
      const response = await this.axios.put(`${this.endpoints.cad.suppliers}/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async deleteSupplier(id) {
    try {
      const response = await this.axios.delete(`${this.endpoints.cad.suppliers}/${id}`);
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  /**
   * Generic HTTP Methods
   */
  async get(endpoint, params = {}) {
    try {
      const response = await this.axios.get(endpoint, { params });
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async post(endpoint, data = {}) {
    try {
      const response = await this.axios.post(endpoint, data);
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async put(endpoint, data = {}) {
    try {
      const response = await this.axios.put(endpoint, data);
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async patch(endpoint, data = {}) {
    try {
      const response = await this.axios.patch(endpoint, data);
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async delete(endpoint) {
    try {
      const response = await this.axios.delete(endpoint);
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  /**
   * Utility Methods
   */
  shouldRetry(error) {
    // Retry on network errors or 5xx server errors
    return !error.response || 
           error.code === 'ECONNABORTED' || 
           error.code === 'ENOTFOUND' || 
           error.code === 'ECONNREFUSED' ||
           (error.response && error.response.status >= 500);
  }

  calculateRetryDelay(retryCount) {
    // Exponential backoff with jitter
    const baseDelay = this.config.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, retryCount - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay;
    return exponentialDelay + jitter;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateRequestId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  normalizeError(error) {
    if (error.response) {
      // Server responded with error status
      return {
        message: error.response.data?.message || error.message,
        status: error.response.status,
        data: error.response.data,
        type: 'API_ERROR'
      };
    } else if (error.request) {
      // Network error
      return {
        message: 'Network error - please check your connection',
        type: 'NETWORK_ERROR'
      };
    } else {
      // Other error
      return {
        message: error.message || 'An unexpected error occurred',
        type: 'UNKNOWN_ERROR'
      };
    }
  }

  handleAuthFailure() {
    // Clear auth data
    this.clearAuthData();
    
    // Emit auth failure event or redirect to login
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:failure'));
    }
  }

  /**
   * Token Management
   */
  getAuthToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  setAuthToken(token) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  getRefreshToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refresh_token');
    }
    return null;
  }

  setRefreshToken(token) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('refresh_token', token);
    }
  }

  getUserData() {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem('user_data');
      return data ? JSON.parse(data) : null;
    }
    return null;
  }

  setUserData(userData) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_data', JSON.stringify(userData));
    }
  }

  clearAuthData() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_data');
    }
  }

  isAuthenticated() {
    return !!this.getAuthToken();
  }

  /**
   * Health Check
   */
  async healthCheck() {
    try {
      const response = await this.axios.get(this.endpoints.health, {
        timeout: 5000 // Shorter timeout for health check
      });
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
}

module.exports = ApiClient;