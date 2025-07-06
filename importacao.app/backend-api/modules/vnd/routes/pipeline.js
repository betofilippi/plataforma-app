const express = require('express');
const router = express.Router();
const pipelineController = require('../controllers/pipelineController');

// Sales Pipeline Routes

// GET /api/vnd/pipeline - List all pipeline opportunities with filtering
router.get('/', pipelineController.getAll);

// GET /api/vnd/pipeline/stats - Get pipeline statistics
router.get('/stats', pipelineController.getStats);

// GET /api/vnd/pipeline/:id - Get opportunity by ID
router.get('/:id', pipelineController.getById);

// POST /api/vnd/pipeline - Create new opportunity
router.post('/', pipelineController.create);

// PUT /api/vnd/pipeline/:id - Update opportunity
router.put('/:id', pipelineController.update);

// PATCH /api/vnd/pipeline/:id/move-stage - Move opportunity to different stage
router.patch('/:id/move-stage', pipelineController.moveStage);

// POST /api/vnd/pipeline/:id/activities - Add activity to opportunity
router.post('/:id/activities', pipelineController.addActivity);

module.exports = router;