const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const rateLimit = require('express-rate-limit')
const http = require('http')
require('dotenv').config()

const authController = require('./auth/authController')
const dashboardRoutes = require('./routes/dashboard')
const cadRoutes = require('../modules/cad/routes')
const estRoutes = require('../modules/est/routes/estoqueRoutes')
const notificationModule = require('../modules/not')

const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT || 3001

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}))

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://plataforma.app',
    'https://www.plataforma.app',
    'https://importacao.app',
    'https://www.importacao.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Muitas requisições do mesmo IP, tente novamente em 15 minutos.'
  }
})
app.use(limiter)

// Body parsing middleware
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'plataforma-erp-backend',
    version: '1.0.0'
  })
})

// Initialize notification module
async function initializeModules() {
  try {
    await notificationModule.initialize(app, server)
    console.log('✅ Módulo de notificações inicializado')
  } catch (error) {
    console.error('❌ Erro ao inicializar módulo de notificações:', error)
  }
}

// API Routes
app.use('/auth', authController.router)
app.use('/dashboard', dashboardRoutes)
app.use('/api/cad', cadRoutes)
app.use('/api/est', estRoutes)
// Notification routes are automatically registered by the module

// Default route
app.get('/', (req, res) => {
  res.json({
    message: 'Plataforma ERP NXT - API Backend',
    status: 'operational',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      auth: '/auth/*',
      dashboard: '/dashboard/*',
      cad: '/api/cad/*',
      est: '/api/est/*',
      notifications: '/api/notifications/*'
    },
    modules: {
      cad: 'Cadastros',
      est: 'Estoque',
      not: 'Notificações'
    }
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint não encontrado',
    message: `A rota ${req.method} ${req.originalUrl} não existe`,
    timestamp: new Date().toISOString()
  })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error occurred:', err)
  
  res.status(err.status || 500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// Start server
server.listen(PORT, async () => {
  console.log(`🚀 Plataforma ERP Backend rodando na porta ${PORT}`)
  console.log(`📊 Dashboard API: http://localhost:${PORT}/dashboard`)
  console.log(`🔐 Auth API: http://localhost:${PORT}/auth`)
  console.log(`📋 CAD API: http://localhost:${PORT}/api/cad`)
  console.log(`📦 EST API: http://localhost:${PORT}/api/est`)
  console.log(`🔔 Notifications API: http://localhost:${PORT}/api/notifications`)
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
  
  // Initialize modules after server start
  await initializeModules()
})

module.exports = app