const express = require('express');
const router = express.Router();
const quotationsController = require('../controllers/quotationsController');

// Quotations Routes

// GET /api/cmp/quotations - List all quotations with filtering
router.get('/', quotationsController.getAll);

// GET /api/cmp/quotations/stats - Get quotation statistics
router.get('/stats', quotationsController.getStats);

// GET /api/cmp/quotations/:id - Get quotation by ID
router.get('/:id', quotationsController.getById);

// POST /api/cmp/quotations - Create new quotation
router.post('/', quotationsController.create);

// PATCH /api/cmp/quotations/:id/status - Update quotation status
router.patch('/:id/status', quotationsController.updateStatus);

// POST /api/cmp/quotations/:id/convert-to-order - Convert quotation to purchase order
router.post('/:id/convert-to-order', quotationsController.convertToPurchaseOrder);

module.exports = router;