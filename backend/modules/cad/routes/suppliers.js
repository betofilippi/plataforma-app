const express = require('express');
const suppliersController = require('../controllers/suppliersController');
const { validate, validateQuery, validateId, supplierSchema, supplierUpdateSchema } = require('../services/validationService');

/**
 * Routes for suppliers CRUD operations
 * All routes require JWT authentication
 */

const router = express.Router();

// GET /api/cad/suppliers/stats - Get supplier statistics (before /:id routes)
router.get('/stats', suppliersController.getSupplierStats);

// GET /api/cad/suppliers/select - Get suppliers for dropdown
router.get('/select', suppliersController.getSuppliersForSelect);

// GET /api/cad/suppliers/types - Get supplier types for filters
router.get('/types', suppliersController.getSupplierTypes);

// GET /api/cad/suppliers/export - Export suppliers to CSV
router.get('/export', suppliersController.exportSuppliers);

// POST /api/cad/suppliers/search - Advanced search
router.post('/search', suppliersController.searchSuppliers);

// GET /api/cad/suppliers - Get all suppliers with pagination and filters
router.get('/', validateQuery, suppliersController.getAllSuppliers);

// GET /api/cad/suppliers/:id - Get supplier by ID
router.get('/:id', validateId, suppliersController.getSupplierById);

// GET /api/cad/suppliers/:id/performance - Get supplier performance metrics
router.get('/:id/performance', validateId, suppliersController.getSupplierPerformance);

// POST /api/cad/suppliers - Create new supplier
router.post('/', validate(supplierSchema), suppliersController.createSupplier);

// PUT /api/cad/suppliers/:id - Update supplier
router.put('/:id', validateId, validate(supplierUpdateSchema), suppliersController.updateSupplier);

// DELETE /api/cad/suppliers/:id - Delete supplier
router.delete('/:id', validateId, suppliersController.deleteSupplier);

// PATCH /api/cad/suppliers/:id/toggle-status - Toggle supplier active status
router.patch('/:id/toggle-status', validateId, suppliersController.toggleSupplierStatus);

module.exports = router;