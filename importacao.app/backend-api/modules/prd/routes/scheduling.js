const express = require('express');
const router = express.Router();
const SchedulingController = require('../controllers/schedulingController');
const auth = require('../../../src/middleware/auth');
const permissions = require('../../../src/middleware/permissions');

const controller = new SchedulingController();

// Middleware de autenticação para todas as rotas
router.use(auth);

/**
 * @route   GET /api/prd/scheduling
 * @desc    Obter programação de produção
 * @access  Private
 */
router.get('/', 
  permissions.check('scheduling', 'read'),
  controller.getSchedule.bind(controller)
);

/**
 * @route   POST /api/prd/scheduling/optimize
 * @desc    Otimizar programação
 * @access  Private
 */
router.post('/optimize', 
  permissions.check('scheduling', 'create'),
  controller.optimizeSchedule.bind(controller)
);

/**
 * @route   POST /api/prd/scheduling/generate
 * @desc    Gerar nova programação
 * @access  Private
 */
router.post('/generate', 
  permissions.check('scheduling', 'create'),
  controller.generateSchedule.bind(controller)
);

/**
 * @route   PUT /api/prd/scheduling/orders/:id
 * @desc    Atualizar programação de ordem específica
 * @access  Private
 */
router.put('/orders/:id', 
  permissions.check('scheduling', 'update'),
  controller.updateSchedule.bind(controller)
);

/**
 * @route   GET /api/prd/scheduling/capacity-analysis
 * @desc    Análise de capacidade
 * @access  Private
 */
router.get('/capacity-analysis', 
  permissions.check('scheduling', 'read'),
  controller.getCapacityAnalysis.bind(controller)
);

/**
 * @route   GET /api/prd/scheduling/bottlenecks
 * @desc    Identificar gargalos
 * @access  Private
 */
router.get('/bottlenecks', 
  permissions.check('scheduling', 'read'),
  controller.getBottlenecks.bind(controller)
);

/**
 * @route   GET /api/prd/scheduling/gantt
 * @desc    Dados para gráfico de Gantt
 * @access  Private
 */
router.get('/gantt', 
  permissions.check('scheduling', 'read'),
  controller.getGanttData.bind(controller)
);

/**
 * @route   POST /api/prd/scheduling/simulate
 * @desc    Simular cenário de programação
 * @access  Private
 */
router.post('/simulate', 
  permissions.check('scheduling', 'read'),
  controller.simulateSchedule.bind(controller)
);

/**
 * @route   GET /api/prd/scheduling/rules
 * @desc    Obter regras de programação
 * @access  Private
 */
router.get('/rules', 
  permissions.check('scheduling', 'read'),
  controller.getSchedulingRules.bind(controller)
);

/**
 * @route   PUT /api/prd/scheduling/rules
 * @desc    Atualizar regras de programação
 * @access  Private
 */
router.put('/rules', 
  permissions.check('scheduling', 'update'),
  controller.updateSchedulingRules.bind(controller)
);

/**
 * @route   GET /api/prd/scheduling/metrics
 * @desc    Métricas de programação
 * @access  Private
 */
router.get('/metrics', 
  permissions.check('scheduling', 'read'),
  controller.getScheduleMetrics.bind(controller)
);

/**
 * @route   POST /api/prd/scheduling/validate
 * @desc    Validar programação
 * @access  Private
 */
router.post('/validate', 
  permissions.check('scheduling', 'read'),
  controller.validateSchedule.bind(controller)
);

/**
 * @route   GET /api/prd/scheduling/alternatives
 * @desc    Obter programações alternativas
 * @access  Private
 */
router.get('/alternatives', 
  permissions.check('scheduling', 'read'),
  controller.getAlternativeSchedules.bind(controller)
);

/**
 * @route   POST /api/prd/scheduling/:programacao_id/apply
 * @desc    Aplicar programação
 * @access  Private
 */
router.post('/:programacao_id/apply', 
  permissions.check('scheduling', 'update'),
  controller.applySchedule.bind(controller)
);

module.exports = router;