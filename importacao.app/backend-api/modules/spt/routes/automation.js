const express = require('express');
const router = express.Router();
const AutomationController = require('../controllers/automationController');
const auth = require('../../../src/middleware/auth');
const permissions = require('../../../src/middleware/permissions');

const controller = new AutomationController();

// Middleware de autenticação para todas as rotas
router.use(auth);

/**
 * @route   GET /api/spt/automation
 * @desc    Listar regras de automação
 * @access  Private
 */
router.get('/', 
  permissions.check('automation', 'read'),
  controller.list.bind(controller)
);

/**
 * @route   GET /api/spt/automation/:id
 * @desc    Buscar regra por ID
 * @access  Private
 */
router.get('/:id', 
  permissions.check('automation', 'read'),
  controller.getById.bind(controller)
);

/**
 * @route   POST /api/spt/automation
 * @desc    Criar nova regra de automação
 * @access  Private
 */
router.post('/', 
  permissions.check('automation', 'create'),
  controller.create.bind(controller)
);

/**
 * @route   PUT /api/spt/automation/:id
 * @desc    Atualizar regra de automação
 * @access  Private
 */
router.put('/:id', 
  permissions.check('automation', 'update'),
  controller.update.bind(controller)
);

/**
 * @route   DELETE /api/spt/automation/:id
 * @desc    Excluir regra de automação
 * @access  Private
 */
router.delete('/:id', 
  permissions.check('automation', 'delete'),
  controller.delete.bind(controller)
);

/**
 * @route   POST /api/spt/automation/:id/activate
 * @desc    Ativar regra de automação
 * @access  Private
 */
router.post('/:id/activate', 
  permissions.check('automation', 'update'),
  controller.activateRule.bind(controller)
);

/**
 * @route   POST /api/spt/automation/:id/deactivate
 * @desc    Desativar regra de automação
 * @access  Private
 */
router.post('/:id/deactivate', 
  permissions.check('automation', 'update'),
  controller.deactivateRule.bind(controller)
);

/**
 * @route   POST /api/spt/automation/:id/test
 * @desc    Testar regra de automação
 * @access  Private
 */
router.post('/:id/test', 
  permissions.check('automation', 'read'),
  controller.testRule.bind(controller)
);

/**
 * @route   GET /api/spt/automation/:id/executions
 * @desc    Obter histórico de execuções da regra
 * @access  Private
 */
router.get('/:id/executions', 
  permissions.check('automation', 'read'),
  controller.getExecutionHistory.bind(controller)
);

/**
 * @route   GET /api/spt/automation/templates
 * @desc    Listar templates de automação
 * @access  Private
 */
router.get('/templates', 
  permissions.check('automation', 'read'),
  controller.getTemplates.bind(controller)
);

/**
 * @route   POST /api/spt/automation/templates/:templateId/create
 * @desc    Criar regra a partir de template
 * @access  Private
 */
router.post('/templates/:templateId/create', 
  permissions.check('automation', 'create'),
  controller.createFromTemplate.bind(controller)
);

/**
 * @route   GET /api/spt/automation/conditions
 * @desc    Listar condições disponíveis
 * @access  Private
 */
router.get('/conditions', 
  permissions.check('automation', 'read'),
  controller.getAvailableConditions.bind(controller)
);

/**
 * @route   GET /api/spt/automation/actions
 * @desc    Listar ações disponíveis
 * @access  Private
 */
router.get('/actions', 
  permissions.check('automation', 'read'),
  controller.getAvailableActions.bind(controller)
);

/**
 * @route   POST /api/spt/automation/execute
 * @desc    Executar automação manualmente
 * @access  Private
 */
router.post('/execute', 
  permissions.check('automation', 'update'),
  controller.executeManually.bind(controller)
);

module.exports = router;