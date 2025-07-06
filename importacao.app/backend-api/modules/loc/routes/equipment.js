const express = require('express');
const router = express.Router();
const equipmentController = require('../controllers/equipmentController');
const { validate, validateQuery, validateId, equipmentSchema, equipmentUpdateSchema } = require('../services/validationService');

// GET /api/loc/equipment - Get all equipment
router.get('/', validateQuery, equipmentController.getAllEquipment);

// GET /api/loc/equipment/stats - Get equipment statistics
router.get('/stats', equipmentController.getEquipmentStats);

// GET /api/loc/equipment/available - Get available equipment
router.get('/available', equipmentController.getAvailableEquipment);

// GET /api/loc/equipment/:id - Get equipment by ID
router.get('/:id', validateId, equipmentController.getEquipmentById);

// POST /api/loc/equipment - Create new equipment
router.post('/', validate(equipmentSchema), equipmentController.createEquipment);

// PUT /api/loc/equipment/:id - Update equipment
router.put('/:id', validateId, validate(equipmentUpdateSchema), equipmentController.updateEquipment);

// DELETE /api/loc/equipment/:id - Delete equipment
router.delete('/:id', validateId, equipmentController.deleteEquipment);

// PATCH /api/loc/equipment/:id/status - Update equipment status
router.patch('/:id/status', validateId, equipmentController.updateEquipmentStatus);

// GET /api/loc/equipment/:id/maintenance - Get equipment maintenance history
router.get('/:id/maintenance', validateId, equipmentController.getEquipmentMaintenance);

module.exports = router;
