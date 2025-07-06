const express = require('express');
const router = express.Router();

// Import route modules
const webhooksRoutes = require('./webhooks');
const eventsRoutes = require('./events');
const deliveriesRoutes = require('./deliveries');
const monitoringRoutes = require('./monitoring');
const securityRoutes = require('./security');

// Mount routes
router.use('/webhooks', webhooksRoutes);
router.use('/events', eventsRoutes);
router.use('/deliveries', deliveriesRoutes);
router.use('/monitoring', monitoringRoutes);
router.use('/security', securityRoutes);

// Module info endpoint
router.get('/', (req, res) => {
  res.json({
    module: 'WHK - Webhooks',
    version: '1.0.0',
    description: 'Módulo de gerenciamento centralizado de webhooks com entrega garantida',
    endpoints: {
      webhooks: '/api/whk/webhooks',
      events: '/api/whk/events',
      deliveries: '/api/whk/deliveries',
      monitoring: '/api/whk/monitoring',
      security: '/api/whk/security'
    }
  });
});

module.exports = router;