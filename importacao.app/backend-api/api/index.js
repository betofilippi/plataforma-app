const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const rateLimit = require('express-rate-limit')
require('dotenv').config()

// Import database config optimized for serverless
const databaseConfig = require('../src/config/database-serverless')

// Compatibility layer for simple authentication and data endpoints
const authSimple = {
  router: require('express').Router()
    .post('/login', (req, res) => {
      console.log('Login attempt:', req.body)
      
      const { email, password } = req.body
      
      // Simple mock authentication
      if (email === 'admin@plataforma.app' && password === 'admin123') {
        res.json({
          success: true,
          data: {
            user: { 
              id: 1, 
              email: 'admin@plataforma.app', 
              role: 'admin', 
              first_name: 'Admin', 
              last_name: 'Plataforma',
              status: 'active'
            },
            access_token: 'mock-jwt-token-for-development-12345',
            refresh_token: 'mock-refresh-token-67890',
            expires_in: '3600'
          },
          message: 'Login realizado com sucesso'
        })
      } else {
        res.status(401).json({
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Credenciais inválidas'
        })
      }
    })
    .get('/profile', (req, res) => {
      const authHeader = req.headers.authorization
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Token de acesso requerido'
        })
      }
      
      res.json({
        success: true,
        data: {
          id: 1,
          email: 'admin@plataforma.app',
          role: 'admin',
          first_name: 'Admin',
          last_name: 'Plataforma',
          status: 'active'
        }
      })
    })
}

// Simple dashboard routes
const dashboardSimple = require('express').Router()
  .get('/stats', (req, res) => {
    res.json({
      success: true,
      data: {
        totalImportacoes: 342,
        totalClientes: 125,
        totalVendas: 1850,
        faturamentoMes: 125440.50,
        crescimentoVendas: 15.8,
        pedidosPendentes: 8,
        tabelasAtivas: 18,
        ultimaSincronizacao: new Date().toISOString(),
        detalhes: {
          clientes: 125,
          fornecedores: 45,
          produtos: 342,
          categorias: 25,
          estoque: 1250,
          vendas: 1850,
          pedidos: 89,
          notasFiscais: 156,
          transporte: 78,
          relatorios: 234,
          configuracoes: 12,
          integracaoML: 345,
          integracaoInstagram: 234,
          integracaoBling: 456,
          integracaoSupabase: 123,
          integracaoZAPI: 567,
          integracaoMake: 78,
          usuarios: 23
        }
      }
    })
  })
  .get('/activities', (req, res) => {
    const limit = parseInt(req.query.limit) || 10
    
    const activities = Array.from({ length: limit }, (_, i) => ({
      id: `activity-${i + 1}`,
      type: ['sale', 'order', 'client', 'product'][i % 4],
      title: [
        'Nova venda para João Silva',
        'Pedido #101 processando',
        'Cliente Maria Santos cadastrado',
        'Produto Notebook Dell adicionado'
      ][i % 4],
      description: [
        'Valor: R$ 1.250,00',
        'Cliente: Pedro Costa',
        'Email: maria@email.com',
        'Categoria: Eletrônicos'
      ][i % 4],
      timestamp: new Date(Date.now() - (i * 3600000)).toISOString(),
      icon: ['shopping-cart', 'package', 'user', 'box'][i % 4],
      color: ['green', 'blue', 'purple', 'blue'][i % 4]
    }))
    
    res.json({
      success: true,
      data: activities
    })
  })

// Simple CAD routes
const cadSimple = require('express').Router()
  .get('/clients', (req, res) => {
    const clients = [
      {
        id: 1,
        name: 'João Silva',
        email: 'joao.silva@email.com',
        phone: '(11) 99999-1234',
        cpf_cnpj: '123.456.789-01',
        address: 'Rua das Flores, 123',
        status: 'active',
        ativo: true,
        created_at: '2024-01-15T10:00:00Z'
      },
      {
        id: 2,
        name: 'Maria Santos',
        email: 'maria.santos@email.com',
        phone: '(11) 88888-5678',
        cpf_cnpj: '987.654.321-09',
        address: 'Av. Paulista, 456',
        status: 'active',
        ativo: true,
        created_at: '2024-01-16T11:30:00Z'
      },
      {
        id: 3,
        name: 'TechCorp Ltda',
        email: 'contato@techcorp.com.br',
        phone: '(11) 3333-7777',
        cpf_cnpj: '12.345.678/0001-90',
        address: 'Rua da Tecnologia, 789',
        status: 'active',
        ativo: true,
        created_at: '2024-01-17T14:15:00Z'
      },
      {
        id: 4,
        name: 'Pedro Costa',
        email: 'pedro.costa@email.com',
        phone: '(11) 77777-4321',
        cpf_cnpj: '456.789.123-45',
        address: 'Alameda dos Anjos, 321',
        status: 'inactive',
        ativo: false,
        created_at: '2024-01-18T09:45:00Z'
      }
    ]
    
    res.json({
      success: true,
      data: clients,
      total: clients.length,
      message: 'Clientes carregados com sucesso'
    })
  })
  .get('/products', (req, res) => {
    const products = [
      {
        id: 1,
        code: 'PROD001',
        codigo: 'PROD001',
        description: 'Notebook Dell XPS 15',
        descricao: 'Notebook Dell XPS 15',
        category: 'Eletrônicos',
        categoria: 'Eletrônicos',
        price: 5999.99,
        preco: 5999.99,
        stock: 25,
        estoque: 25,
        status: 'active',
        created_at: '2024-01-15T10:00:00Z'
      },
      {
        id: 2,
        code: 'PROD002',
        codigo: 'PROD002',
        description: 'Mouse Logitech MX Master 3',
        descricao: 'Mouse Logitech MX Master 3',
        category: 'Periféricos',
        categoria: 'Periféricos',
        price: 299.99,
        preco: 299.99,
        stock: 150,
        estoque: 150,
        status: 'active',
        created_at: '2024-01-16T11:30:00Z'
      },
      {
        id: 3,
        code: 'PROD003',
        codigo: 'PROD003',
        description: 'Cadeira Gamer Pro',
        descricao: 'Cadeira Gamer Pro',
        category: 'Móveis',
        categoria: 'Móveis',
        price: 899.99,
        preco: 899.99,
        stock: 8,
        estoque: 8,
        status: 'active',
        created_at: '2024-01-17T14:15:00Z'
      },
      {
        id: 4,
        code: 'PROD004',
        codigo: 'PROD004',
        description: 'Smartphone Samsung Galaxy',
        descricao: 'Smartphone Samsung Galaxy',
        category: 'Eletrônicos',
        categoria: 'Eletrônicos',
        price: 1299.99,
        preco: 1299.99,
        stock: 45,
        estoque: 45,
        status: 'active',
        created_at: '2024-01-18T09:45:00Z'
      }
    ]
    
    res.json({
      success: true,
      data: products,
      total: products.length,
      message: 'Produtos carregados com sucesso'
    })
  })
  .get('/suppliers', (req, res) => {
    const suppliers = [
      {
        id: 1,
        name: 'Fornecedor ABC Ltda',
        cnpj: '12.345.678/0001-90',
        contact: 'João Fornecedor',
        email: 'contato@fornecedorabc.com.br',
        phone: '(11) 4444-1234',
        status: 'active',
        created_at: '2024-01-15T10:00:00Z'
      },
      {
        id: 2,
        name: 'Distribuidora XYZ',
        cnpj: '98.765.432/0001-10',
        contact: 'Maria Distribuidora',
        email: 'vendas@distribuidoraxyz.com.br',
        phone: '(11) 5555-5678',
        status: 'active',
        created_at: '2024-01-16T11:30:00Z'
      },
      {
        id: 3,
        name: 'Importadora Tech Solutions',
        cnpj: '11.222.333/0001-44',
        contact: 'Carlos Silva',
        email: 'importacao@techsolutions.com.br',
        phone: '(11) 6666-9999',
        status: 'inactive',
        created_at: '2024-01-17T14:15:00Z'
      }
    ]
    
    res.json({
      success: true,
      data: suppliers,
      total: suppliers.length,
      message: 'Fornecedores carregados com sucesso'
    })
  })

const app = express()

// Security middleware optimized for serverless
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:", "wss:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}))

// CORS configuration for production
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://plataforma.app',
    'https://www.plataforma.app',
    'https://importacao.app',
    'https://www.importacao.app',
    'https://app.plataforma.app',
    'https://importacao-app.vercel.app',
    'https://plataforma-app.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
}))

// Rate limiting optimized for serverless
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // More generous limit for production
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use memory store for serverless (will reset on each function invocation)
  store: new rateLimit.MemoryStore()
})
app.use(limiter)

// Body parsing middleware
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Simplified middleware - no database connection required for mock data
app.use((req, res, next) => {
  // Log requests for debugging
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  next()
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'plataforma-erp-backend',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    serverless: true
  })
})

// API Routes using simple implementations
app.use('/auth', authSimple.router)
app.use('/dashboard', dashboardSimple)
app.use('/api/cad', cadSimple)

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Plataforma ERP NXT - API Backend (Serverless)',
    status: 'operational',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    serverless: true,
    endpoints: {
      health: '/health',
      'health-db': '/health/db',
      auth: '/auth/*',
      dashboard: '/dashboard/*',
      notifications: '/api/notifications/*',
      cad: '/api/cad/*',
      est: '/api/est/*',
      imp: '/api/imp/*',
      bi: '/api/bi/*',
      vnd: '/api/vnd/*',
      cmp: '/api/cmp/*',
      loc: '/api/loc/*',
      log: '/api/log/*',
      prd: '/api/prd/*',
      pro: '/api/pro/*',
      spt: '/api/spt/*',
      whk: '/api/whk/*'
    },
    modules: {
      cad: 'Cadastros',
      est: 'Estoque',
      imp: 'Importação',
      bi: 'Business Intelligence',
      vnd: 'Vendas',
      cmp: 'Compras',
      loc: 'Locação',
      log: 'Logística',
      prd: 'Produção',
      pro: 'Projetos',
      spt: 'Suporte',
      whk: 'Webhooks'
    }
  })
})

// CORS preflight handler
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH')
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept,Origin')
  res.header('Access-Control-Allow-Credentials', 'true')
  res.status(200).end()
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The route ${req.method} ${req.originalUrl} does not exist`,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      '/health',
      '/health/db',
      '/auth/*',
      '/dashboard/*',
      '/api/notifications/*',
      '/api/cad/*',
      '/api/est/*',
      '/api/imp/*',
      '/api/bi/*',
      '/api/vnd/*',
      '/api/cmp/*',
      '/api/loc/*',
      '/api/log/*',
      '/api/prd/*',
      '/api/pro/*',
      '/api/spt/*',
      '/api/whk/*'
    ]
  })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error occurred:', err)
  
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString(),
    requestId: req.id || 'unknown',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// Export the Express API
module.exports = app