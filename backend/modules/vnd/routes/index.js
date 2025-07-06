const express = require('express');
const router = express.Router();

// Import route modules
const salesOrdersRoutes = require('./salesOrders');
const quotationsRoutes = require('./quotations');
const pipelineRoutes = require('./pipeline');
const commissionsRoutes = require('./commissions');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    module: 'VND (Vendas)',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints: {
      salesOrders: '/api/vnd/sales-orders',
      quotations: '/api/vnd/quotations', 
      pipeline: '/api/vnd/pipeline',
      commissions: '/api/vnd/commissions'
    },
    features: [
      'Sales order management with full lifecycle tracking',
      'Customer quotation system with conversion to orders',
      'Sales pipeline management with opportunity tracking',
      'Commission calculation and payment tracking',
      'Sales analytics and performance metrics',
      'Customer relationship management integration'
    ]
  });
});

// Mount route modules
router.use('/sales-orders', salesOrdersRoutes);
router.use('/quotations', quotationsRoutes);
router.use('/pipeline', pipelineRoutes);
router.use('/commissions', commissionsRoutes);

module.exports = router;