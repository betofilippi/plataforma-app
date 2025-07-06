const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const rateLimit = require('express-rate-limit')
require('dotenv').config()

const authController = require('./auth/authController')
const dashboardRoutes = require('./routes/dashboard')

const app = express()
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

// API Routes
app.use('/auth', authController.router)
app.use('/dashboard', dashboardRoutes)

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
      dashboard: '/dashboard/*'
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
app.listen(PORT, () => {
  console.log(`🚀 Plataforma ERP Backend rodando na porta ${PORT}`)
  console.log(`📊 Dashboard API: http://localhost:${PORT}/dashboard`)
  console.log(`🔐 Auth API: http://localhost:${PORT}/auth`)
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
})

module.exports = app