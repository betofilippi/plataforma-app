const express = require('express');
const { authMiddleware } = require('../../../src/middleware/auth');
const clientsRoutes = require('./clients');
const suppliersRoutes = require('./suppliers');
const productsRoutes = require('./products');

/**
 * Main CAD module router
 * Integrates all CAD routes with common middleware
 */
const router = express.Router();

// Apply JWT authentication middleware to all CAD routes
router.use(authMiddleware);

// Health check for CAD module
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'CAD module is running',
    timestamp: new Date().toISOString(),
    modules: ['clients', 'suppliers', 'products']
  });
});

// Module routes
router.use('/clients', clientsRoutes);
router.use('/suppliers', suppliersRoutes);
router.use('/products', productsRoutes);

module.exports = router;