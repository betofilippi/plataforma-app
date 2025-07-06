const express = require('express');
const router = express.Router();
const ProjectsController = require('../controllers/projectsController');
const auth = require('../../../src/middleware/auth');
const permissions = require('../../../src/middleware/permissions');

const controller = new ProjectsController();

// Middleware de autenticação para todas as rotas
router.use(auth);

/**
 * @route   GET /api/pro/projects
 * @desc    Listar projetos
 * @access  Private
 */
router.get('/', 
  permissions.check('projects', 'read'),
  controller.list.bind(controller)
);

/**
 * @route   GET /api/pro/projects/:id
 * @desc    Buscar projeto por ID
 * @access  Private
 */
router.get('/:id', 
  permissions.check('projects', 'read'),
  controller.getById.bind(controller)
);

/**
 * @route   POST /api/pro/projects
 * @desc    Criar novo projeto
 * @access  Private
 */
router.post('/', 
  permissions.check('projects', 'create'),
  controller.create.bind(controller)
);

/**
 * @route   PUT /api/pro/projects/:id
 * @desc    Atualizar projeto
 * @access  Private
 */
router.put('/:id', 
  permissions.check('projects', 'update'),
  controller.update.bind(controller)
);

/**
 * @route   DELETE /api/pro/projects/:id
 * @desc    Excluir projeto
 * @access  Private
 */
router.delete('/:id', 
  permissions.check('projects', 'delete'),
  controller.delete.bind(controller)
);

/**
 * @route   GET /api/pro/projects/:id/metrics
 * @desc    Obter métricas do projeto
 * @access  Private
 */
router.get('/:id/metrics', 
  permissions.check('projects', 'read'),
  controller.getProjectMetrics.bind(controller)
);

/**
 * @route   POST /api/pro/projects/:id/status
 * @desc    Atualizar status do projeto
 * @access  Private
 */
router.post('/:id/status', 
  permissions.check('projects', 'update'),
  controller.updateStatus.bind(controller)
);

/**
 * @route   GET /api/pro/projects/:id/timeline
 * @desc    Obter cronograma do projeto
 * @access  Private
 */
router.get('/:id/timeline', 
  permissions.check('projects', 'read'),
  controller.getTimeline.bind(controller)
);

/**
 * @route   GET /api/pro/projects/:id/budget
 * @desc    Obter orçamento do projeto
 * @access  Private
 */
router.get('/:id/budget', 
  permissions.check('projects', 'read'),
  controller.getBudget.bind(controller)
);

/**
 * @route   POST /api/pro/projects/:id/close
 * @desc    Encerrar projeto
 * @access  Private
 */
router.post('/:id/close', 
  permissions.check('projects', 'update'),
  controller.closeProject.bind(controller)
);

module.exports = router;