/**
 * Dashboard Routes
 * Routes for dashboard endpoints
 */

const express = require('express');
const { DashboardController } = require('../controllers/dashboardController');
const { body, query } = require('express-validator');
const auth = require('../../../src/middleware/auth');

const router = express.Router();
const dashboardController = new DashboardController();

// Validation middleware
const validateDateRange = [
  query('dateRange').optional().isString().withMessage('Date range must be a string'),
  query('companyId').optional().isUUID().withMessage('Company ID must be a valid UUID')
];

const validateDashboardConfig = [
  body('configuration').isObject().withMessage('Configuration must be an object'),
  body('configuration.widgets').isArray().withMessage('Widgets must be an array'),
  body('configuration.layout').isString().withMessage('Layout must be a string'),
  body('configuration.refreshInterval').optional().isInt({ min: 30000 }).withMessage('Refresh interval must be at least 30 seconds')
];

// Dashboard routes
router.get('/executive', auth, validateDateRange, dashboardController.getExecutiveDashboard.bind(dashboardController));
router.get('/sales', auth, validateDateRange, dashboardController.getSalesDashboard.bind(dashboardController));
router.get('/inventory', auth, validateDateRange, dashboardController.getInventoryDashboard.bind(dashboardController));
router.get('/financial', auth, validateDateRange, dashboardController.getFinancialDashboard.bind(dashboardController));
router.get('/production', auth, validateDateRange, dashboardController.getProductionDashboard.bind(dashboardController));

// Real-time updates
router.get('/real-time', auth, dashboardController.getRealTimeUpdates.bind(dashboardController));

// Dashboard configuration
router.get('/config/:dashboardType', auth, dashboardController.getDashboardConfig.bind(dashboardController));
router.put('/config/:dashboardType', auth, validateDashboardConfig, dashboardController.updateDashboardConfig.bind(dashboardController));

module.exports = router;