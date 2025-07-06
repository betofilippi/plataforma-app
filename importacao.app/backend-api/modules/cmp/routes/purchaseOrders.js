const express = require('express');
const router = express.Router();
const purchaseOrdersController = require('../controllers/purchaseOrdersController');

// Purchase Orders Routes

// GET /api/cmp/purchase-orders - List all purchase orders with filtering
router.get('/', purchaseOrdersController.getAll);

// GET /api/cmp/purchase-orders/stats - Get purchase order statistics
router.get('/stats', purchaseOrdersController.getStats);

// GET /api/cmp/purchase-orders/:id - Get purchase order by ID
router.get('/:id', purchaseOrdersController.getById);

// POST /api/cmp/purchase-orders - Create new purchase order
router.post('/', purchaseOrdersController.create);

// PUT /api/cmp/purchase-orders/:id - Update purchase order
router.put('/:id', purchaseOrdersController.update);

// PATCH /api/cmp/purchase-orders/:id/approve - Approve/reject purchase order
router.patch('/:id/approve', purchaseOrdersController.approve);

// PATCH /api/cmp/purchase-orders/:id/cancel - Cancel purchase order
router.patch('/:id/cancel', purchaseOrdersController.cancel);

module.exports = router;