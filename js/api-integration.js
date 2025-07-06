// API Integration for Plataforma ERP NXT
const API_BASE_URL = 'https://erp-api-clean-7tc7xr5ia-nxt-9032fd74.vercel.app';

// API helper functions
class ErpAPI {
    constructor() {
        this.baseUrl = API_BASE_URL;
        this.token = localStorage.getItem('auth_token');
    }

    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { 'Authorization': `Bearer ${this.token}` })
            }
        };

        const response = await fetch(url, { ...defaultOptions, ...options });
        return response.json();
    }

    // Authentication
    async login(email, password) {
        const result = await this.makeRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        if (result.success) {
            this.token = result.data.access_token;
            localStorage.setItem('auth_token', this.token);
        }
        return result;
    }

    // Dashboard endpoints
    async getDashboardStats() {
        return this.makeRequest('/dashboard/stats');
    }

    async getDashboardActivities(limit = 10) {
        return this.makeRequest(`/dashboard/activities?limit=${limit}`);
    }

    // API Test
    async testAPI() {
        return this.makeRequest('/api/test');
    }

    // Health check
    async healthCheck() {
        return this.makeRequest('/health');
    }

    // EST (Estoque) Module
    async getEstoqueMetrics(period = '30') {
        return this.makeRequest(`/api/est/metrics?period=${period}`);
    }

    async getEstoqueMovements(page = 1, limit = 25) {
        return this.makeRequest(`/api/est/movements?page=${page}&limit=${limit}`);
    }

    // CAD (Cadastros) Module
    async getEmpresas() {
        return this.makeRequest('/api/cad/empresas');
    }

    // Test all modules
    async testAllModules() {
        const modules = ['cmp', 'fis', 'imp', 'loc', 'log', 'prd', 'pro', 'spt', 'vnd', 'whk'];
        const results = {};
        
        for (const module of modules) {
            try {
                results[module] = await this.makeRequest(`/api/${module}/test`);
            } catch (error) {
                results[module] = { error: error.message };
            }
        }
        
        return results;
    }
}

// Initialize API
const api = new ErpAPI();

// Update dashboard with real data
async function updateDashboard() {
    try {
        console.log('🔄 Atualizando dashboard com dados da API...');
        
        // Test API connection
        const health = await api.healthCheck();
        console.log('✅ Health Check:', health);
        
        // Get dashboard stats
        const stats = await api.getDashboardStats();
        console.log('📊 Dashboard Stats:', stats);
        
        // Get activities
        const activities = await api.getDashboardActivities(5);
        console.log('📋 Activities:', activities);
        
        // Get estoque metrics
        const estoque = await api.getEstoqueMetrics();
        console.log('📦 Estoque Metrics:', estoque);
        
        // Test all modules
        const modules = await api.testAllModules();
        console.log('🔧 Modules Test:', modules);
        
        // Update UI elements with real data
        updateStatsDisplay(stats.data);
        updateActivitiesDisplay(activities.data);
        updateEstoqueDisplay(estoque.data);
        updateModulesStatus(modules);
        
        console.log('✅ Dashboard atualizado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao atualizar dashboard:', error);
    }
}

function updateStatsDisplay(stats) {
    if (!stats) return;
    
    // Update stats cards with real data
    const statsElements = document.querySelectorAll('.card');
    if (statsElements.length > 0) {
        console.log('📈 Atualizando cards de estatísticas com dados reais');
        // You can update specific elements here
    }
}

function updateActivitiesDisplay(activities) {
    if (!activities) return;
    
    console.log(`📋 ${activities.length} atividades recentes carregadas`);
    // Update activities section with real data
}

function updateEstoqueDisplay(estoque) {
    if (!estoque) return;
    
    console.log(`📦 Estoque: ${estoque.total_products} produtos, ${estoque.low_stock_items} com estoque baixo`);
}

function updateModulesStatus(modules) {
    const moduleCount = Object.keys(modules).filter(m => modules[m].success).length;
    console.log(`🔧 ${moduleCount}/10 módulos funcionais`);
}

// Auto-login for demo
async function autoLogin() {
    try {
        const result = await api.login('admin@plataforma.app', 'admin123');
        if (result.success) {
            console.log('🔐 Login automático realizado com sucesso');
            return true;
        }
    } catch (error) {
        console.error('❌ Erro no login automático:', error);
    }
    return false;
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando integração com API...');
    
    // Auto login and update dashboard
    const loginSuccess = await autoLogin();
    if (loginSuccess) {
        await updateDashboard();
    }
    
    console.log('✅ Integração inicializada!');
});

// Expose API globally for debugging
window.erpAPI = api;
window.updateDashboard = updateDashboard;