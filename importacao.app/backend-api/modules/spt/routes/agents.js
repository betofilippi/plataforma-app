const express = require('express');
const router = express.Router();
const AgentsController = require('../controllers/agentsController');
const auth = require('../../../src/middleware/auth');
const permissions = require('../../../src/middleware/permissions');

const controller = new AgentsController();

// Middleware de autenticação para todas as rotas
router.use(auth);

/**
 * @route   GET /api/spt/agents
 * @desc    Listar agentes de suporte
 * @access  Private
 */
router.get('/', 
  permissions.check('agents', 'read'),
  controller.list.bind(controller)
);

/**
 * @route   GET /api/spt/agents/:id
 * @desc    Buscar agente por ID
 * @access  Private
 */
router.get('/:id', 
  permissions.check('agents', 'read'),
  controller.getById.bind(controller)
);

/**
 * @route   POST /api/spt/agents
 * @desc    Criar novo agente
 * @access  Private
 */
router.post('/', 
  permissions.check('agents', 'create'),
  controller.create.bind(controller)
);

/**
 * @route   PUT /api/spt/agents/:id
 * @desc    Atualizar agente
 * @access  Private
 */
router.put('/:id', 
  permissions.check('agents', 'update'),
  controller.update.bind(controller)
);

/**
 * @route   DELETE /api/spt/agents/:id
 * @desc    Excluir agente
 * @access  Private
 */
router.delete('/:id', 
  permissions.check('agents', 'delete'),
  controller.delete.bind(controller)
);

/**
 * @route   GET /api/spt/agents/:id/performance
 * @desc    Obter performance do agente
 * @access  Private
 */
router.get('/:id/performance', 
  permissions.check('agents', 'read'),
  controller.getPerformance.bind(controller)
);

/**
 * @route   GET /api/spt/agents/:id/workload
 * @desc    Obter carga de trabalho do agente
 * @access  Private
 */
router.get('/:id/workload', 
  permissions.check('agents', 'read'),
  controller.getWorkload.bind(controller)
);

/**
 * @route   POST /api/spt/agents/:id/status
 * @desc    Atualizar status do agente (online/offline/busy)
 * @access  Private
 */
router.post('/:id/status', 
  permissions.check('agents', 'update'),
  controller.updateStatus.bind(controller)
);

/**
 * @route   GET /api/spt/agents/available
 * @desc    Listar agentes disponíveis
 * @access  Private
 */
router.get('/available', 
  permissions.check('agents', 'read'),
  controller.getAvailableAgents.bind(controller)
);

/**
 * @route   GET /api/spt/agents/:id/skills
 * @desc    Obter habilidades do agente
 * @access  Private
 */
router.get('/:id/skills', 
  permissions.check('agents', 'read'),
  controller.getSkills.bind(controller)
);

/**
 * @route   POST /api/spt/agents/:id/skills
 * @desc    Atualizar habilidades do agente
 * @access  Private
 */
router.post('/:id/skills', 
  permissions.check('agents', 'update'),
  controller.updateSkills.bind(controller)
);

/**
 * @route   GET /api/spt/agents/reports/productivity
 * @desc    Relatório de produtividade dos agentes
 * @access  Private
 */
router.get('/reports/productivity', 
  permissions.check('agents', 'read'),
  controller.getProductivityReport.bind(controller)
);

/**
 * @route   GET /api/spt/agents/:id/schedule
 * @desc    Obter agenda do agente
 * @access  Private
 */
router.get('/:id/schedule', 
  permissions.check('agents', 'read'),
  controller.getSchedule.bind(controller)
);

/**
 * @route   POST /api/spt/agents/:id/schedule
 * @desc    Definir agenda do agente
 * @access  Private
 */
router.post('/:id/schedule', 
  permissions.check('agents', 'update'),
  controller.setSchedule.bind(controller)
);

module.exports = router;