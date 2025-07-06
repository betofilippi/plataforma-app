const express = require('express');
const clientsController = require('../controllers/clientsController');
const { validate, validateQuery, validateId, clientSchema, clientUpdateSchema } = require('../services/validationService');

/**
 * Routes for clients CRUD operations
 * All routes require JWT authentication
 */

const router = express.Router();

// GET /api/cad/clients/stats - Get client statistics (before /:id routes)
router.get('/stats', clientsController.getClientStats);

// GET /api/cad/clients/select - Get clients for dropdown
router.get('/select', clientsController.getClientsForSelect);

// POST /api/cad/clients/search - Advanced search
router.post('/search', clientsController.searchClients);

// GET /api/cad/clients - Get all clients with pagination and filters
router.get('/', validateQuery, clientsController.getAllClients);

// GET /api/cad/clients/:id - Get client by ID
router.get('/:id', validateId, clientsController.getClientById);

// POST /api/cad/clients - Create new client
router.post('/', validate(clientSchema), clientsController.createClient);

// PUT /api/cad/clients/:id - Update client
router.put('/:id', validateId, validate(clientUpdateSchema), clientsController.updateClient);

// DELETE /api/cad/clients/:id - Delete client
router.delete('/:id', validateId, clientsController.deleteClient);

// PATCH /api/cad/clients/:id/toggle-status - Toggle client active status
router.patch('/:id/toggle-status', validateId, clientsController.toggleClientStatus);

// POST /api/cad/clients/:id/purchase-history - Update purchase history
router.post('/:id/purchase-history', validateId, clientsController.updatePurchaseHistory);

module.exports = router;