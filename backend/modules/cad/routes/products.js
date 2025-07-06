const express = require('express');
const productsController = require('../controllers/productsController');
const { validate, validateQuery, validateId, productSchema, productUpdateSchema } = require('../services/validationService');

/**
 * Routes for products CRUD operations
 * All routes require JWT authentication
 */

const router = express.Router();

// GET /api/cad/products/stats - Get product statistics (before /:id routes)
router.get('/stats', productsController.getProductStats);

// GET /api/cad/products/select - Get products for dropdown
router.get('/select', productsController.getProductsForSelect);

// GET /api/cad/products/categories - Get product categories
router.get('/categories', productsController.getCategories);

// GET /api/cad/products/categories/:category/subcategories - Get subcategories
router.get('/categories/:category/subcategories', productsController.getSubcategories);

// GET /api/cad/products/types - Get product types for filters
router.get('/types', productsController.getProductTypes);

// GET /api/cad/products/export - Export products to CSV
router.get('/export', productsController.exportProducts);

// POST /api/cad/products/search - Advanced search
router.post('/search', productsController.searchProducts);

// PUT /api/cad/products/bulk-update-prices - Bulk update prices
router.put('/bulk-update-prices', productsController.bulkUpdatePrices);

// GET /api/cad/products - Get all products with pagination and filters
router.get('/', validateQuery, productsController.getAllProducts);

// GET /api/cad/products/:id - Get product by ID
router.get('/:id', validateId, productsController.getProductById);

// POST /api/cad/products/:id/duplicate - Duplicate product
router.post('/:id/duplicate', validateId, productsController.duplicateProduct);

// POST /api/cad/products - Create new product
router.post('/', validate(productSchema), productsController.createProduct);

// PUT /api/cad/products/:id - Update product
router.put('/:id', validateId, validate(productUpdateSchema), productsController.updateProduct);

// DELETE /api/cad/products/:id - Delete product
router.delete('/:id', validateId, productsController.deleteProduct);

// PATCH /api/cad/products/:id/toggle-status - Toggle product active status
router.patch('/:id/toggle-status', validateId, productsController.toggleProductStatus);

module.exports = router;