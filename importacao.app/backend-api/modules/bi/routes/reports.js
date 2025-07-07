/**
 * Reports Routes
 * Routes for report generation and management
 */

const express = require('express');
const { ReportsController } = require('../controllers/reportsController');
const { body, query, param } = require('express-validator');
const auth = require('../../../src/middleware/auth');

const router = express.Router();
const reportsController = new ReportsController();

// Validation middleware
const validateReportGeneration = [
  body('reportType').isString().withMessage('Report type is required'),
  body('dateRange').optional().isString().withMessage('Date range must be a string'),
  body('filters').optional().isObject().withMessage('Filters must be an object'),
  body('groupBy').optional().isString().withMessage('Group by must be a string'),
  body('sortBy').optional().isString().withMessage('Sort by must be a string'),
  body('format').optional().isIn(['json', 'pdf', 'excel']).withMessage('Format must be json, pdf, or excel'),
  body('companyId').optional().isUUID().withMessage('Company ID must be a valid UUID')
];

const validateReportExport = [
  body('reportId').isUUID().withMessage('Report ID must be a valid UUID'),
  body('format').isIn(['pdf', 'excel']).withMessage('Format must be pdf or excel'),
  body('includeCharts').optional().isBoolean().withMessage('Include charts must be a boolean'),
  body('customization').optional().isObject().withMessage('Customization must be an object')
];

const validateReportScheduling = [
  body('reportType').isString().withMessage('Report type is required'),
  body('schedule').isObject().withMessage('Schedule is required'),
  body('schedule.frequency').isIn(['daily', 'weekly', 'monthly']).withMessage('Frequency must be daily, weekly, or monthly'),
  body('schedule.time').isObject().withMessage('Time is required'),
  body('schedule.time.hour').isInt({ min: 0, max: 23 }).withMessage('Hour must be between 0 and 23'),
  body('schedule.time.minute').isInt({ min: 0, max: 59 }).withMessage('Minute must be between 0 and 59'),
  body('recipients').isArray().withMessage('Recipients must be an array'),
  body('recipients.*').isEmail().withMessage('Each recipient must be a valid email'),
  body('format').isIn(['pdf', 'excel']).withMessage('Format must be pdf or excel'),
  body('companyId').optional().isUUID().withMessage('Company ID must be a valid UUID')
];

const validateReportTemplate = [
  body('name').isString().withMessage('Name is required'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('category').isString().withMessage('Category is required'),
  body('configuration').isObject().withMessage('Configuration is required'),
  body('isPublic').optional().isBoolean().withMessage('Is public must be a boolean')
];

// Report routes
router.get('/', auth, reportsController.getAvailableReports.bind(reportsController));
router.post('/generate', auth, validateReportGeneration, reportsController.generateReport.bind(reportsController));
router.get('/:id', auth, reportsController.getReport.bind(reportsController));
router.post('/export', auth, validateReportExport, reportsController.exportReport.bind(reportsController));
router.post('/schedule', auth, validateReportScheduling, reportsController.scheduleReport.bind(reportsController));

// Financial reports
router.get('/financial/income-statement', auth, reportsController.getFinancialReports.bind(reportsController));
router.get('/financial/balance-sheet', auth, reportsController.getFinancialReports.bind(reportsController));
router.get('/financial/cash-flow', auth, reportsController.getFinancialReports.bind(reportsController));
router.get('/financial/accounts-receivable', auth, reportsController.getFinancialReports.bind(reportsController));
router.get('/financial/accounts-payable', auth, reportsController.getFinancialReports.bind(reportsController));

// Operational reports
router.get('/operational/sales', auth, reportsController.getOperationalReports.bind(reportsController));
router.get('/operational/inventory', auth, reportsController.getOperationalReports.bind(reportsController));
router.get('/operational/production', auth, reportsController.getOperationalReports.bind(reportsController));
router.get('/operational/purchasing', auth, reportsController.getOperationalReports.bind(reportsController));

// Compliance reports
router.get('/compliance/tax', auth, reportsController.getComplianceReports.bind(reportsController));
router.get('/compliance/audit', auth, reportsController.getComplianceReports.bind(reportsController));
router.get('/compliance/regulatory', auth, reportsController.getComplianceReports.bind(reportsController));

// Report templates
router.get('/templates/list', auth, reportsController.getReportTemplates.bind(reportsController));
router.post('/templates/create', auth, validateReportTemplate, reportsController.createReportTemplate.bind(reportsController));

module.exports = router;