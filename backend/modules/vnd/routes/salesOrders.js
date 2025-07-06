const express = require('express');
const router = express.Router();
const salesOrdersController = require('../controllers/salesOrdersController');

// Sales Orders Routes

// GET /api/vnd/sales-orders - List all sales orders with filtering
router.get('/', salesOrdersController.getAll);

// GET /api/vnd/sales-orders/stats - Get sales order statistics
router.get('/stats', salesOrdersController.getStats);

// GET /api/vnd/sales-orders/:id - Get sales order by ID
router.get('/:id', salesOrdersController.getById);

// POST /api/vnd/sales-orders - Create new sales order
router.post('/', salesOrdersController.create);

// PATCH /api/vnd/sales-orders/:id/status - Update sales order status
router.patch('/:id/status', salesOrdersController.updateStatus);

// PATCH /api/vnd/sales-orders/:id/cancel - Cancel sales order
router.patch('/:id/cancel', salesOrdersController.cancel);

module.exports = router;