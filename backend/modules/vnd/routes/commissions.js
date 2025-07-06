const express = require('express');
const router = express.Router();
const commissionsController = require('../controllers/commissionsController');

// Commissions and Sales Targets Routes

// GET /api/vnd/commissions - List all commissions with filtering
router.get('/', commissionsController.getAll);

// GET /api/vnd/commissions/stats - Get commission statistics
router.get('/stats', commissionsController.getStats);

// GET /api/vnd/commissions/:id - Get commission by ID
router.get('/:id', commissionsController.getById);

// POST /api/vnd/commissions - Create new commission
router.post('/', commissionsController.create);

// PATCH /api/vnd/commissions/:id/pay - Mark commission as paid
router.patch('/:id/pay', commissionsController.markAsPaid);

// POST /api/vnd/commissions/calculate-from-orders - Calculate commissions from sales orders
router.post('/calculate-from-orders', commissionsController.calculateFromOrders);

// Sales Targets Management
// POST /api/vnd/commissions/targets - Create sales target
router.post('/targets', commissionsController.createTarget);

// GET /api/vnd/commissions/targets/performance - Get targets performance
router.get('/targets/performance', commissionsController.getTargetsPerformance);

module.exports = router;