const express = require('express');
const router = express.Router();
const importacaoController = require('../controllers/importacaoController');
const { validateRequest } = require('../../../src/middleware/validation');

/**
 * Routes for importation CRUD operations
 * Unified routes for all 18 importation tables
 */

// Global routes
router.get('/tables', importacaoController.getAllTables);
router.get('/dashboard', importacaoController.getDashboardData);
router.post('/search', importacaoController.globalSearch);

// Table-specific routes
router.get('/tables/:tableKey/config', importacaoController.getTableConfig);

// CRUD routes for each table
router.get('/:tableKey', importacaoController.getAllRecords);
router.get('/:tableKey/stats', importacaoController.getTableStats);
router.get('/:tableKey/export', importacaoController.exportRecords);
router.get('/:tableKey/:id', importacaoController.getRecordById);
router.post('/:tableKey', importacaoController.createRecord);
router.put('/:tableKey/:id', importacaoController.updateRecord);
router.delete('/:tableKey/:id', importacaoController.deleteRecord);

// Bulk operations
router.post('/:tableKey/bulk', importacaoController.bulkOperation);

module.exports = router;