const express = require('express');
const router = express.Router();
const WorkCentersController = require('../controllers/workCentersController');
const auth = require('../../../src/middleware/auth');
const permissions = require('../../../src/middleware/permissions');

const controller = new WorkCentersController();

// Middleware de autenticação para todas as rotas
router.use(auth);

/**
 * @route   GET /api/prd/work-centers
 * @desc    Listar centros de trabalho
 * @access  Private
 */
router.get('/', 
  permissions.check('work_centers', 'read'),
  controller.list.bind(controller)
);

/**
 * @route   GET /api/prd/work-centers/stats
 * @desc    Obter estatísticas dos centros
 * @access  Private
 */
router.get('/stats', 
  permissions.check('work_centers', 'read'),
  controller.getStats.bind(controller)
);

/**
 * @route   GET /api/prd/work-centers/:id
 * @desc    Buscar centro por ID
 * @access  Private
 */
router.get('/:id', 
  permissions.check('work_centers', 'read'),
  controller.getById.bind(controller)
);

/**
 * @route   POST /api/prd/work-centers
 * @desc    Criar novo centro de trabalho
 * @access  Private
 */
router.post('/', 
  permissions.check('work_centers', 'create'),
  controller.create.bind(controller)
);

/**
 * @route   PUT /api/prd/work-centers/:id
 * @desc    Atualizar centro de trabalho
 * @access  Private
 */
router.put('/:id', 
  permissions.check('work_centers', 'update'),
  controller.update.bind(controller)
);

/**
 * @route   DELETE /api/prd/work-centers/:id
 * @desc    Excluir centro de trabalho
 * @access  Private
 */
router.delete('/:id', 
  permissions.check('work_centers', 'delete'),
  controller.delete.bind(controller)
);

/**
 * @route   GET /api/prd/work-centers/:id/capacity
 * @desc    Obter capacidade do centro
 * @access  Private
 */
router.get('/:id/capacity', 
  permissions.check('work_centers', 'read'),
  controller.getCapacity.bind(controller)
);

/**
 * @route   GET /api/prd/work-centers/:id/schedule
 * @desc    Obter programação do centro
 * @access  Private
 */
router.get('/:id/schedule', 
  permissions.check('work_centers', 'read'),
  controller.getSchedule.bind(controller)
);

/**
 * @route   GET /api/prd/work-centers/:id/utilization
 * @desc    Obter utilização do centro
 * @access  Private
 */
router.get('/:id/utilization', 
  permissions.check('work_centers', 'read'),
  controller.getUtilization.bind(controller)
);

/**
 * @route   GET /api/prd/work-centers/:id/maintenance
 * @desc    Obter programação de manutenção
 * @access  Private
 */
router.get('/:id/maintenance', 
  permissions.check('work_centers', 'read'),
  controller.getMaintenanceSchedule.bind(controller)
);

/**
 * @route   POST /api/prd/work-centers/:id/maintenance
 * @desc    Agendar manutenção
 * @access  Private
 */
router.post('/:id/maintenance', 
  permissions.check('work_centers', 'create'),
  controller.scheduleMaintenance.bind(controller)
);

/**
 * @route   GET /api/prd/work-centers/:id/performance
 * @desc    Obter métricas de performance
 * @access  Private
 */
router.get('/:id/performance', 
  permissions.check('work_centers', 'read'),
  controller.getPerformanceMetrics.bind(controller)
);

/**
 * @route   GET /api/prd/work-centers/:id/available-slots
 * @desc    Obter horários disponíveis
 * @access  Private
 */
router.get('/:id/available-slots', 
  permissions.check('work_centers', 'read'),
  controller.getAvailableSlots.bind(controller)
);

module.exports = router;