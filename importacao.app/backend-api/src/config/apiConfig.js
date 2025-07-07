/**
 * Centralized API Configuration
 * Manages environment detection and API client settings
 */

class ApiConfig {
  constructor() {
    this.environment = this.detectEnvironment();
    this.baseURL = this.getBaseURL();
    this.config = this.getConfiguration();
  }

  /**
   * Detect current environment
   */
  detectEnvironment() {
    // Check NODE_ENV first
    if (process.env.NODE_ENV) {
      return process.env.NODE_ENV;
    }

    // Check for localhost/development indicators
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost')) {
        return 'development';
      }
    }

    // Check for explicit API URL configuration
    if (process.env.API_BASE_URL) {
      if (process.env.API_BASE_URL.includes('localhost') || 
          process.env.API_BASE_URL.includes('127.0.0.1')) {
        return 'development';
      }
    }

    return 'production';
  }

  /**
   * Get base URL based on environment
   */
  getBaseURL() {
    // Explicit environment variable takes precedence
    if (process.env.API_BASE_URL) {
      return process.env.API_BASE_URL;
    }

    // Browser environment detection
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `http://${hostname}:${window.location.port || 3001}`;
      }
    }

    // Default production URL
    return 'https://erp-api-clean-r88y1fdz9-nxt-9032fd74.vercel.app';
  }

  /**
   * Get environment-specific configuration
   */
  getConfiguration() {
    const baseConfig = {
      baseURL: this.baseURL,
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      debug: false
    };

    switch (this.environment) {
      case 'development':
        return {
          ...baseConfig,
          timeout: 60000, // Longer timeout for development
          debug: true,
          retries: 2
        };

      case 'test':
        return {
          ...baseConfig,
          timeout: 5000,
          retries: 1,
          debug: false
        };

      case 'production':
      default:
        return {
          ...baseConfig,
          timeout: 30000,
          retries: 3,
          debug: false
        };
    }
  }

  /**
   * Get endpoints configuration
   */
  getEndpoints() {
    return {
      auth: {
        login: '/auth/login',
        logout: '/auth/logout',
        refresh: '/auth/refresh',
        profile: '/auth/profile'
      },
      dashboard: {
        stats: '/dashboard/stats',
        activities: '/dashboard/activities',
        integrations: '/dashboard/integrations'
      },
      cad: {
        clients: '/api/cad/clients',
        products: '/api/cad/products',
        suppliers: '/api/cad/suppliers',
        categories: '/api/cad/categories',
        companies: '/api/cad/companies',
        users: '/api/cad/users',
        units: '/api/cad/units',
        priceLists: '/api/cad/price-lists'
      },
      cmp: {
        purchaseOrders: '/api/cmp/purchase-orders',
        quotations: '/api/cmp/quotations',
        requisitions: '/api/cmp/requisitions',
        analytics: '/api/cmp/analytics',
        approvals: '/api/cmp/approvals',
        budgetComparison: '/api/cmp/budget-comparison'
      },
      est: {
        estoque: '/api/est/estoque',
        movimentacoes: '/api/est/movimentacoes',
        alertas: '/api/est/alertas',
        lotes: '/api/est/lotes',
        inventario: '/api/est/inventario'
      },
      vnd: {
        salesOrders: '/api/vnd/sales-orders',
        quotations: '/api/vnd/quotations',
        commissions: '/api/vnd/commissions',
        pipeline: '/api/vnd/pipeline',
        customers: '/api/vnd/customers'
      },
      fis: {
        nfe: '/api/fis/nfe',
        nfse: '/api/fis/nfse',
        taxEngine: '/api/fis/tax-engine',
        fiscalDocuments: '/api/fis/fiscal-documents',
        taxCompliance: '/api/fis/tax-compliance'
      },
      prd: {
        productionOrders: '/api/prd/production-orders',
        bom: '/api/prd/bom',
        workCenters: '/api/prd/work-centers',
        qualityControl: '/api/prd/quality-control',
        scheduling: '/api/prd/scheduling'
      },
      health: '/health'
    };
  }

  /**
   * Get full URL for an endpoint
   */
  getFullURL(endpoint) {
    return `${this.baseURL}${endpoint}`;
  }

  /**
   * Check if current environment is development
   */
  isDevelopment() {
    return this.environment === 'development';
  }

  /**
   * Check if current environment is production
   */
  isProduction() {
    return this.environment === 'production';
  }

  /**
   * Get request headers with common configuration
   */
  getDefaultHeaders() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Client-Version': '1.0.0',
      'X-Environment': this.environment
    };
  }

  /**
   * Get axios configuration
   */
  getAxiosConfig() {
    return {
      baseURL: this.baseURL,
      timeout: this.config.timeout,
      headers: this.getDefaultHeaders(),
      validateStatus: (status) => status < 500 // Don't throw on 4xx errors
    };
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Log configuration (safe for production)
   */
  logConfig() {
    const safeConfig = {
      environment: this.environment,
      baseURL: this.baseURL,
      timeout: this.config.timeout,
      retries: this.config.retries,
      debug: this.config.debug
    };

    if (this.config.debug) {
      console.log('[API Config]', safeConfig);
    }

    return safeConfig;
  }
}

// Export singleton instance
const apiConfig = new ApiConfig();

// Browser compatibility
if (typeof window !== 'undefined') {
  window.ApiConfig = apiConfig;
}

module.exports = apiConfig;