const express = require('express');
const router = express.Router();
const rentalContractsController = require('../controllers/rentalContractsController');
const { validate, validateQuery, validateId, rentalContractSchema, rentalContractUpdateSchema } = require('../services/validationService');

// GET /api/loc/rental-contracts - Get all rental contracts
router.get('/', validateQuery, rentalContractsController.getAllRentalContracts);

// GET /api/loc/rental-contracts/stats - Get rental contract statistics
router.get('/stats', rentalContractsController.getRentalContractStats);

// GET /api/loc/rental-contracts/expiring - Get contracts expiring soon
router.get('/expiring', rentalContractsController.getExpiringContracts);

// GET /api/loc/rental-contracts/:id - Get rental contract by ID
router.get('/:id', validateId, rentalContractsController.getRentalContractById);

// POST /api/loc/rental-contracts - Create new rental contract
router.post('/', validate(rentalContractSchema), rentalContractsController.createRentalContract);

// PUT /api/loc/rental-contracts/:id - Update rental contract
router.put('/:id', validateId, validate(rentalContractUpdateSchema), rentalContractsController.updateRentalContract);

// DELETE /api/loc/rental-contracts/:id - Delete rental contract
router.delete('/:id', validateId, rentalContractsController.deleteRentalContract);

// POST /api/loc/rental-contracts/:id/renew - Renew rental contract
router.post('/:id/renew', validateId, rentalContractsController.renewRentalContract);

// GET /api/loc/rental-contracts/:id/billing - Calculate rental billing
router.get('/:id/billing', validateId, rentalContractsController.calculateRentalBilling);

module.exports = router;
