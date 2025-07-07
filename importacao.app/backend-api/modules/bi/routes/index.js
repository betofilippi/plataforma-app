/**
 * BI Module Routes
 * Main router for Business Intelligence endpoints
 */

const express = require('express');
const dashboardRoutes = require('./dashboard');
const reportsRoutes = require('./reports');
const analyticsRoutes = require('./analytics');

const router = express.Router();

// Mount sub-routes
router.use('/dashboards', dashboardRoutes);
router.use('/reports', reportsRoutes);
router.use('/analytics', analyticsRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'BI module is healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;