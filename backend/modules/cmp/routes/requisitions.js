const express = require('express');
const router = express.Router();
const requisitionsController = require('../controllers/requisitionsController');

// Purchase Requisitions Routes

// GET /api/cmp/requisitions - List all requisitions with filtering
router.get('/', requisitionsController.getAll);

// GET /api/cmp/requisitions/stats - Get requisition statistics
router.get('/stats', requisitionsController.getStats);

// GET /api/cmp/requisitions/:id - Get requisition by ID
router.get('/:id', requisitionsController.getById);

// POST /api/cmp/requisitions - Create new requisition
router.post('/', requisitionsController.create);

// PATCH /api/cmp/requisitions/:id/approve - Approve/reject requisition
router.patch('/:id/approve', requisitionsController.approve);

// POST /api/cmp/requisitions/:id/convert-to-quotation - Convert requisition to quotation request
router.post('/:id/convert-to-quotation', requisitionsController.convertToQuotation);

module.exports = router;