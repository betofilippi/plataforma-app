/**
 * API Client Real - Sistema ERP NXT
 * Cliente API para conexões reais com backend
 * SEM DADOS MOCK - APENAS CONEXÕES REAIS
 */

class ERPApiClient {
    constructor() {
        this.baseURL = this.detectEnvironment();
        this.token = localStorage.getItem('auth_token');
        this.refreshToken = localStorage.getItem('refresh_token');
        this.isRefreshing = false;
        this.failedQueue = [];
        
        console.log('🔗 API Client inicializado:', this.baseURL);
    }

    detectEnvironment() {
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3001';
        } else {
            return 'https://erp-api-clean-r88y1fdz9-nxt-9032fd74.vercel.app';
        }
    }

    setAuthToken(token, refreshToken = null) {
        this.token = token;
        this.refreshToken = refreshToken;
        localStorage.setItem('auth_token', token);
        if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken);
        }
    }

    clearAuth() {
        this.token = null;
        this.refreshToken = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
    }

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    async makeRequest(url, options = {}) {
        const config = {
            method: 'GET',
            headers: this.getHeaders(),
            ...options
        };

        try {
            console.log(`🌐 API Request: ${config.method} ${this.baseURL}${url}`);
            
            const response = await fetch(`${this.baseURL}${url}`, config);
            
            // Se token expirado, tentar refresh
            if (response.status === 401 && this.refreshToken && !this.isRefreshing) {
                return await this.handleTokenRefresh(url, options);
            }

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            console.log(`✅ API Response: ${response.status}`, data);
            return data;

        } catch (error) {
            console.error(`❌ API Error:`, error);
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Erro de conexão. Verifique sua internet e tente novamente.');
            }
            
            throw error;
        }
    }

    async handleTokenRefresh(originalUrl, originalOptions) {
        if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
                this.failedQueue.push({ resolve, reject, url: originalUrl, options: originalOptions });
            });
        }

        this.isRefreshing = true;

        try {
            const response = await fetch(`${this.baseURL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: this.refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                this.setAuthToken(data.access_token, data.refresh_token);
                
                this.processQueue(null);
                return await this.makeRequest(originalUrl, originalOptions);
            } else {
                this.processQueue(new Error('Refresh token inválido'));
                this.clearAuth();
                window.location.href = './login-direto.html';
            }
        } catch (error) {
            this.processQueue(error);
            this.clearAuth();
            window.location.href = './login-direto.html';
        } finally {
            this.isRefreshing = false;
        }
    }

    processQueue(error) {
        this.failedQueue.forEach(({ resolve, reject, url, options }) => {
            if (error) {
                reject(error);
            } else {
                resolve(this.makeRequest(url, options));
            }
        });
        
        this.failedQueue = [];
    }

    // ===== MÉTODOS DE AUTENTICAÇÃO =====
    async login(email, password) {
        const data = await this.makeRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (data.success) {
            this.setAuthToken(data.data.access_token, data.data.refresh_token);
            localStorage.setItem('user_data', JSON.stringify(data.data.user));
        }

        return data;
    }

    async logout() {
        try {
            await this.makeRequest('/auth/logout', { method: 'POST' });
        } catch (error) {
            console.log('Erro no logout:', error);
        } finally {
            this.clearAuth();
        }
    }

    async getProfile() {
        return await this.makeRequest('/auth/profile');
    }

    // ===== MÉTODOS DO DASHBOARD =====
    async getDashboardStats() {
        return await this.makeRequest('/dashboard/stats');
    }

    async getDashboardActivities() {
        return await this.makeRequest('/dashboard/activities');
    }

    async getDashboardCharts() {
        return await this.makeRequest('/dashboard/charts');
    }

    // ===== MÉTODOS DO MÓDULO CAD =====
    async getClients(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.makeRequest(`/api/cad/clients${queryString ? `?${queryString}` : ''}`);
    }

    async getClient(id) {
        return await this.makeRequest(`/api/cad/clients/${id}`);
    }

    async createClient(clientData) {
        return await this.makeRequest('/api/cad/clients', {
            method: 'POST',
            body: JSON.stringify(clientData)
        });
    }

    async updateClient(id, clientData) {
        return await this.makeRequest(`/api/cad/clients/${id}`, {
            method: 'PUT',
            body: JSON.stringify(clientData)
        });
    }

    async deleteClient(id) {
        return await this.makeRequest(`/api/cad/clients/${id}`, {
            method: 'DELETE'
        });
    }

    async getProducts(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.makeRequest(`/api/cad/products${queryString ? `?${queryString}` : ''}`);
    }

    async getProduct(id) {
        return await this.makeRequest(`/api/cad/products/${id}`);
    }

    async createProduct(productData) {
        return await this.makeRequest('/api/cad/products', {
            method: 'POST',
            body: JSON.stringify(productData)
        });
    }

    async updateProduct(id, productData) {
        return await this.makeRequest(`/api/cad/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(productData)
        });
    }

    async deleteProduct(id) {
        return await this.makeRequest(`/api/cad/products/${id}`, {
            method: 'DELETE'
        });
    }

    async getSuppliers(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.makeRequest(`/api/cad/suppliers${queryString ? `?${queryString}` : ''}`);
    }

    async getSupplier(id) {
        return await this.makeRequest(`/api/cad/suppliers/${id}`);
    }

    async createSupplier(supplierData) {
        return await this.makeRequest('/api/cad/suppliers', {
            method: 'POST',
            body: JSON.stringify(supplierData)
        });
    }

    async updateSupplier(id, supplierData) {
        return await this.makeRequest(`/api/cad/suppliers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(supplierData)
        });
    }

    async deleteSupplier(id) {
        return await this.makeRequest(`/api/cad/suppliers/${id}`, {
            method: 'DELETE'
        });
    }

    // ===== MÉTODOS DO MÓDULO VND =====
    async getSalesOrders(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.makeRequest(`/api/vnd/sales-orders${queryString ? `?${queryString}` : ''}`);
    }

    async getSalesOrder(id) {
        return await this.makeRequest(`/api/vnd/sales-orders/${id}`);
    }

    async createSalesOrder(orderData) {
        return await this.makeRequest('/api/vnd/sales-orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
    }

    async getSalesPipeline() {
        return await this.makeRequest('/api/vnd/pipeline');
    }

    async getSalesStats() {
        return await this.makeRequest('/api/vnd/stats');
    }

    // ===== MÉTODOS DO MÓDULO EST =====
    async getInventory(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.makeRequest(`/api/est/inventory${queryString ? `?${queryString}` : ''}`);
    }

    async getStockLevels() {
        return await this.makeRequest('/api/est/levels');
    }

    async getStockMovements(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.makeRequest(`/api/est/movements${queryString ? `?${queryString}` : ''}`);
    }

    async createStockMovement(movementData) {
        return await this.makeRequest('/api/est/movements', {
            method: 'POST',
            body: JSON.stringify(movementData)
        });
    }

    // ===== MÉTODOS DO MÓDULO IMP =====
    async getImportProcesses(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.makeRequest(`/api/imp/processes${queryString ? `?${queryString}` : ''}`);
    }

    async getImportProcess(id) {
        return await this.makeRequest(`/api/imp/processes/${id}`);
    }

    async getImportStats() {
        return await this.makeRequest('/api/imp/stats');
    }

    async createImportProcess(processData) {
        return await this.makeRequest('/api/imp/processes', {
            method: 'POST',
            body: JSON.stringify(processData)
        });
    }

    // ===== MÉTODOS UTILITÁRIOS =====
    async healthCheck() {
        return await this.makeRequest('/health');
    }

    async searchGlobal(query, modules = []) {
        return await this.makeRequest('/search', {
            method: 'POST',
            body: JSON.stringify({ query, modules })
        });
    }

    // ===== MÉTODOS DE RELATÓRIOS =====
    async generateReport(reportType, params = {}) {
        return await this.makeRequest('/reports/generate', {
            method: 'POST',
            body: JSON.stringify({ type: reportType, params })
        });
    }

    async exportData(module, format = 'xlsx', params = {}) {
        const response = await fetch(`${this.baseURL}/export/${module}?format=${format}&${new URLSearchParams(params)}`, {
            headers: this.getHeaders()
        });

        if (!response.ok) {
            throw new Error('Erro na exportação');
        }

        return response.blob();
    }
}

// Instância global do cliente API
window.erpApi = new ERPApiClient();

console.log('🚀 API Client Real carregado - SEM DADOS MOCK');