const express = require('express');
const router = express.Router();

// Import route modules
const productionOrdersRoutes = require('./productionOrders');
const workCentersRoutes = require('./workCenters');
const bomRoutes = require('./bom');
const qualityControlRoutes = require('./qualityControl');
const schedulingRoutes = require('./scheduling');

// Mount routes
router.use('/production-orders', productionOrdersRoutes);
router.use('/work-centers', workCentersRoutes);
router.use('/bom', bomRoutes);
router.use('/quality-control', qualityControlRoutes);
router.use('/scheduling', schedulingRoutes);

// Module info endpoint
router.get('/', (req, res) => {
  res.json({
    module: 'PRD - Produção',
    version: '1.0.0',
    description: 'Módulo de gerenciamento de produção e manufatura',
    endpoints: {
      production_orders: '/api/prd/production-orders',
      work_centers: '/api/prd/work-centers',
      bom: '/api/prd/bom',
      quality_control: '/api/prd/quality-control',
      scheduling: '/api/prd/scheduling'
    }
  });
});

module.exports = router;