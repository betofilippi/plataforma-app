const express = require('express');
const router = express.Router();
const quotationsController = require('../controllers/quotationsController');

// Sales Quotations Routes

// GET /api/vnd/quotations - List all quotations with filtering
router.get('/', quotationsController.getAll);

// GET /api/vnd/quotations/stats - Get quotation statistics
router.get('/stats', quotationsController.getStats);

// GET /api/vnd/quotations/:id - Get quotation by ID
router.get('/:id', quotationsController.getById);

// POST /api/vnd/quotations - Create new quotation
router.post('/', quotationsController.create);

// PATCH /api/vnd/quotations/:id/status - Update quotation status
router.patch('/:id/status', quotationsController.updateStatus);

// POST /api/vnd/quotations/:id/convert-to-order - Convert quotation to sales order
router.post('/:id/convert-to-order', quotationsController.convertToSalesOrder);

module.exports = router;