/**
 * Analytics Routes
 * Routes for analytics and forecasting endpoints
 */

const express = require('express');
const { AnalyticsController } = require('../controllers/analyticsController');
const { body, query, param } = require('express-validator');
const auth = require('../../../src/middleware/auth');

const router = express.Router();
const analyticsController = new AnalyticsController();

// Validation middleware
const validateDateRange = [
  query('dateRange').optional().isString().withMessage('Date range must be a string'),
  query('companyId').optional().isUUID().withMessage('Company ID must be a valid UUID')
];

const validateForecasting = [
  query('forecastPeriod').isInt({ min: 1, max: 24 }).withMessage('Forecast period must be between 1 and 24'),
  query('companyId').optional().isUUID().withMessage('Company ID must be a valid UUID'),
  query('method').optional().isIn(['linear_regression', 'moving_average', 'exponential_smoothing', 'seasonal_decomposition']).withMessage('Invalid forecasting method')
];

const validateTrendAnalysis = [
  query('metric').isString().withMessage('Metric is required'),
  query('dateRange').optional().isString().withMessage('Date range must be a string'),
  query('companyId').optional().isUUID().withMessage('Company ID must be a valid UUID'),
  query('granularity').optional().isIn(['daily', 'weekly', 'monthly', 'quarterly']).withMessage('Granularity must be daily, weekly, monthly, or quarterly')
];

const validateComparativeAnalysis = [
  body('metric').isString().withMessage('Metric is required'),
  body('periods').isArray().withMessage('Periods must be an array'),
  body('periods.*').isString().withMessage('Each period must be a string'),
  body('companyId').optional().isUUID().withMessage('Company ID must be a valid UUID'),
  body('groupBy').optional().isString().withMessage('Group by must be a string')
];

const validatePredictiveAnalytics = [
  body('model').isIn(['demand_forecasting', 'churn_prediction', 'price_optimization', 'inventory_optimization', 'risk_assessment']).withMessage('Invalid predictive model'),
  body('parameters').isObject().withMessage('Parameters must be an object'),
  body('companyId').optional().isUUID().withMessage('Company ID must be a valid UUID')
];

// Analytics routes
router.get('/sales', auth, validateDateRange, analyticsController.getSalesAnalytics.bind(analyticsController));
router.get('/sales/forecast', auth, validateForecasting, analyticsController.getSalesForecasting.bind(analyticsController));
router.get('/inventory', auth, validateDateRange, analyticsController.getInventoryAnalytics.bind(analyticsController));
router.get('/financial', auth, validateDateRange, analyticsController.getFinancialAnalytics.bind(analyticsController));
router.get('/customers', auth, validateDateRange, analyticsController.getCustomerAnalytics.bind(analyticsController));
router.get('/suppliers', auth, validateDateRange, analyticsController.getSupplierAnalytics.bind(analyticsController));
router.get('/production', auth, validateDateRange, analyticsController.getProductionAnalytics.bind(analyticsController));

// Trend analysis
router.get('/trends', auth, validateTrendAnalysis, analyticsController.getTrendAnalysis.bind(analyticsController));

// Comparative analysis
router.post('/comparative', auth, validateComparativeAnalysis, analyticsController.getComparativeAnalysis.bind(analyticsController));

// Predictive analytics
router.post('/predictive', auth, validatePredictiveAnalytics, analyticsController.getPredictiveAnalytics.bind(analyticsController));

module.exports = router;