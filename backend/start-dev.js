#!/usr/bin/env node

// Development server for local backend testing
const express = require('express')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3002

// Enable CORS for all origins in development
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'https://plataforma-app-nxt.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2))
  }
  next()
})

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'plataforma-erp-backend-dev',
    version: '1.0.0',
    environment: 'development'
  })
})

// Authentication endpoints
app.post('/auth/login', (req, res) => {
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

app.get('/auth/profile', (req, res) => {
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

// Dashboard endpoints
app.get('/dashboard/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      total_users: 125,
      total_orders: 1850,
      total_products: 342,
      total_revenue: 125000.50,
      growth_percentage: 15.8,
      recent_activities: [
        { id: 1, type: 'sale', description: 'Nova venda realizada', timestamp: new Date().toISOString() },
        { id: 2, type: 'product', description: 'Produto adicionado ao estoque', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { id: 3, type: 'user', description: 'Novo usuário cadastrado', timestamp: new Date(Date.now() - 7200000).toISOString() }
      ]
    }
  })
})

app.get('/dashboard/activities', (req, res) => {
  const limit = parseInt(req.query.limit) || 10
  
  const activities = Array.from({ length: limit }, (_, i) => ({
    id: i + 1,
    type: ['sale', 'product', 'user', 'order'][i % 4],
    description: [
      'Nova venda realizada',
      'Produto adicionado ao estoque', 
      'Usuário cadastrado',
      'Pedido processado'
    ][i % 4],
    timestamp: new Date(Date.now() - (i * 3600000)).toISOString()
  }))
  
  res.json({
    success: true,
    data: activities
  })
})

// EST (Estoque) Module endpoints
app.get('/api/est/metrics', (req, res) => {
  const period = req.query.period || '30'
  
  res.json({
    success: true,
    data: {
      total_products: 342,
      low_stock_items: 15,
      out_of_stock_items: 3,
      total_value: 250000.75,
      movements_today: 23,
      movements_period: 156,
      top_products: [
        { id: 1, name: 'Produto A', quantity: 150, value: 15000 },
        { id: 2, name: 'Produto B', quantity: 89, value: 8900 },
        { id: 3, name: 'Produto C', quantity: 67, value: 13400 }
      ],
      alerts: [
        { type: 'low_stock', product: 'Produto X', current_stock: 5, min_stock: 10 },
        { type: 'expiring', product: 'Produto Y', expiry_date: '2025-07-10', days_to_expiry: 4 }
      ]
    }
  })
})

app.get('/api/est/movements', (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 25
  
  const movements = Array.from({ length: limit }, (_, i) => ({
    id: i + 1,
    type: ['IN', 'OUT'][i % 2],
    product_name: `Produto ${String.fromCharCode(65 + (i % 26))}`,
    quantity: Math.floor(Math.random() * 100) + 1,
    value: (Math.random() * 1000).toFixed(2),
    timestamp: new Date(Date.now() - (i * 3600000)).toISOString(),
    user: 'Admin Plataforma'
  }))
  
  res.json({
    success: true,
    data: movements,
    pagination: {
      page,
      limit,
      total: 500,
      totalPages: Math.ceil(500 / limit)
    }
  })
})

// CAD (Cadastros) Module endpoints
app.get('/api/cad/empresas', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        nome_fantasia: 'Empresa Exemplo Ltda',
        razao_social: 'Empresa Exemplo Limitada',
        cnpj: '12.345.678/0001-99',
        status: 'active',
        created_at: '2024-01-15T10:00:00Z'
      }
    ],
    message: 'Módulo CAD (Cadastros) - Dados simulados'
  })
})

// Generic ERP module endpoints
const modules = ['cmp', 'fis', 'imp', 'loc', 'log', 'prd', 'pro', 'spt', 'vnd', 'whk']

modules.forEach(module => {
  app.get(`/api/${module}/*`, (req, res) => {
    res.json({
      success: true,
      data: [],
      message: `Módulo ${module.toUpperCase()} - Endpoint em desenvolvimento`,
      module: module.toUpperCase()
    })
  })
})

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working perfectly!',
    timestamp: new Date().toISOString(),
    environment: 'development',
    modules: ['CAD', 'CMP', 'EST', 'FIS', 'IMP', 'LOC', 'LOG', 'PRD', 'PRO', 'SPT', 'VND', 'WHK'],
    endpoints: {
      auth: ['/auth/login', '/auth/profile'],
      dashboard: ['/dashboard/stats', '/dashboard/activities'],
      estoque: ['/api/est/metrics', '/api/est/movements'],
      cadastros: ['/api/cad/empresas']
    }
  })
})

// Default route
app.get('/', (req, res) => {
  res.json({
    message: 'Plataforma ERP NXT - API Backend (Development)',
    status: 'operational',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: 'development',
    endpoints: {
      health: '/health',
      auth: '/auth/*',
      dashboard: '/dashboard/*',
      modules: '/api/{module}/*'
    }
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `A rota ${req.method} ${req.originalUrl} não existe`,
    timestamp: new Date().toISOString()
  })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error occurred:', err)
  
  res.status(err.status || 500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: 'Erro interno do servidor',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { 
      details: err.message,
      stack: err.stack 
    })
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ERP Backend Development Server running on port ${PORT}`)
  console.log(`📋 Health check: http://localhost:${PORT}/health`)
  console.log(`🔧 API Test: http://localhost:${PORT}/api/test`)
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard/stats`)
  console.log(`🔐 Auth: http://localhost:${PORT}/auth/profile`)
  console.log('')
  console.log('Available modules:')
  console.log('  📁 CAD (Cadastros): /api/cad/*')
  console.log('  📦 EST (Estoque): /api/est/*')
  console.log('  🧾 FIS (Fiscal): /api/fis/*')
  console.log('  And 9 more modules...')
  console.log('')
  console.log('Ready for frontend connections! 🎉')
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...')
  process.exit(0)
})