/**
 * Simplified API Client - Sistema ERP NXT
 * NO complex fallbacks, NO token refresh loops, NO infinite loading
 * Simple, reliable, fast
 */

class SimpleERPApi {
    constructor() {
        this.baseURL = this.detectEnvironment();
        this.timeout = 5000; // 5 second timeout
        this.retryAttempts = 2; // Maximum retry attempts
        
        console.log('🚀 Simple API Client initialized:', this.baseURL);
    }

    detectEnvironment() {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3001';
        } else {
            return 'https://erp-api-clean-r88y1fdz9-nxt-9032fd74.vercel.app';
        }
    }

    async makeRequest(url, options = {}, attempt = 1) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            signal: controller.signal,
            ...options
        };

        try {
            console.log(`📡 API Request (attempt ${attempt}): ${config.method} ${this.baseURL}${url}`);
            
            const response = await fetch(`${this.baseURL}${url}`, config);
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`✅ API Success: ${response.status}`);
            return data;

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                console.error(`⏱️ Request timeout (${this.timeout}ms)`);
                
                // Retry on timeout
                if (attempt < this.retryAttempts) {
                    console.log(`🔄 Retrying request (${attempt + 1}/${this.retryAttempts})...`);
                    await this.delay(1000 * attempt); // Progressive delay
                    return this.makeRequest(url, options, attempt + 1);
                }
                
                throw new Error('Request timeout - server not responding');
            }
            
            if (error.message.includes('fetch')) {
                throw new Error('Connection failed - check internet connection');
            }
            
            throw error;
        }
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Authentication - SIMPLE
    async login(email, password) {
        try {
            const data = await this.makeRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            if (data.success) {
                localStorage.setItem('auth_token', data.data.access_token);
                localStorage.setItem('user_data', JSON.stringify(data.data.user));
            }

            return data;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }

    // Dashboard - SIMPLE
    async getDashboardStats() {
        try {
            return await this.makeRequest('/dashboard/stats');
        } catch (error) {
            console.warn('Dashboard stats failed:', error.message);
            
            // Simple fallback - no complex logic
            return {
                success: true,
                data: {
                    totalClientes: 125,
                    totalVendas: 1850,
                    faturamentoMes: 125440.50,
                    detalhes: {
                        clientes: 125,
                        produtos: 342,
                        vendas: 1850
                    }
                },
                message: 'Dados de fallback (API indisponível)'
            };
        }
    }

    async getDashboardActivities() {
        try {
            return await this.makeRequest('/dashboard/activities');
        } catch (error) {
            console.warn('Dashboard activities failed:', error.message);
            
            // Simple fallback
            return {
                success: true,
                data: [
                    {
                        title: 'Sistema funcionando em modo offline',
                        description: 'Conectividade limitada - dados de exemplo',
                        timestamp: new Date().toISOString()
                    }
                ]
            };
        }
    }

    // CAD Module - SIMPLE
    async getClients() {
        try {
            return await this.makeRequest('/api/cad/clients');
        } catch (error) {
            console.warn('Get clients failed:', error.message);
            
            return {
                success: true,
                data: [
                    { id: 1, name: 'Cliente Exemplo 1', email: 'cliente1@exemplo.com', status: 'active' },
                    { id: 2, name: 'Cliente Exemplo 2', email: 'cliente2@exemplo.com', status: 'active' }
                ],
                message: 'Dados de exemplo (API indisponível)'
            };
        }
    }

    async getProducts() {
        try {
            return await this.makeRequest('/api/cad/products');
        } catch (error) {
            console.warn('Get products failed:', error.message);
            
            return {
                success: true,
                data: [
                    { id: 1, codigo: 'PROD001', descricao: 'Produto Exemplo 1', preco: 99.99, estoque: 10 },
                    { id: 2, codigo: 'PROD002', descricao: 'Produto Exemplo 2', preco: 199.99, estoque: 5 }
                ],
                message: 'Dados de exemplo (API indisponível)'
            };
        }
    }

    async getSuppliers() {
        try {
            return await this.makeRequest('/api/cad/suppliers');
        } catch (error) {
            console.warn('Get suppliers failed:', error.message);
            
            return {
                success: true,
                data: [
                    { id: 1, name: 'Fornecedor Exemplo 1', cnpj: '12.345.678/0001-90', status: 'active' }
                ],
                message: 'Dados de exemplo (API indisponível)'
            };
        }
    }

    // Health check - SIMPLE
    async healthCheck() {
        try {
            return await this.makeRequest('/health');
        } catch (error) {
            return {
                success: false,
                message: 'API indisponível: ' + error.message
            };
        }
    }
}

// Global instance - SIMPLE
window.simpleErpApi = new SimpleERPApi();

console.log('✅ Simple API Client loaded - NO complex fallbacks, NO infinite loops');