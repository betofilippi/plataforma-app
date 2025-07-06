const express = require('express');
const router = express.Router();
const TasksController = require('../controllers/tasksController');
const auth = require('../../../src/middleware/auth');
const permissions = require('../../../src/middleware/permissions');

const controller = new TasksController();

// Middleware de autenticação para todas as rotas
router.use(auth);

/**
 * @route   GET /api/pro/tasks
 * @desc    Listar tarefas
 * @access  Private
 */
router.get('/', 
  permissions.check('tasks', 'read'),
  controller.list.bind(controller)
);

/**
 * @route   GET /api/pro/tasks/:id
 * @desc    Buscar tarefa por ID
 * @access  Private
 */
router.get('/:id', 
  permissions.check('tasks', 'read'),
  controller.getById.bind(controller)
);

/**
 * @route   POST /api/pro/tasks
 * @desc    Criar nova tarefa
 * @access  Private
 */
router.post('/', 
  permissions.check('tasks', 'create'),
  controller.create.bind(controller)
);

/**
 * @route   PUT /api/pro/tasks/:id
 * @desc    Atualizar tarefa
 * @access  Private
 */
router.put('/:id', 
  permissions.check('tasks', 'update'),
  controller.update.bind(controller)
);

/**
 * @route   DELETE /api/pro/tasks/:id
 * @desc    Excluir tarefa
 * @access  Private
 */
router.delete('/:id', 
  permissions.check('tasks', 'delete'),
  controller.delete.bind(controller)
);

/**
 * @route   POST /api/pro/tasks/:id/assign
 * @desc    Atribuir tarefa a um usuário
 * @access  Private
 */
router.post('/:id/assign', 
  permissions.check('tasks', 'update'),
  controller.assignTask.bind(controller)
);

/**
 * @route   POST /api/pro/tasks/:id/start
 * @desc    Iniciar tarefa
 * @access  Private
 */
router.post('/:id/start', 
  permissions.check('tasks', 'update'),
  controller.startTask.bind(controller)
);

/**
 * @route   POST /api/pro/tasks/:id/complete
 * @desc    Completar tarefa
 * @access  Private
 */
router.post('/:id/complete', 
  permissions.check('tasks', 'update'),
  controller.completeTask.bind(controller)
);

/**
 * @route   GET /api/pro/tasks/:id/dependencies
 * @desc    Listar dependências da tarefa
 * @access  Private
 */
router.get('/:id/dependencies', 
  permissions.check('tasks', 'read'),
  controller.getDependencies.bind(controller)
);

/**
 * @route   POST /api/pro/tasks/:id/dependencies
 * @desc    Adicionar dependência à tarefa
 * @access  Private
 */
router.post('/:id/dependencies', 
  permissions.check('tasks', 'update'),
  controller.addDependency.bind(controller)
);

/**
 * @route   GET /api/pro/tasks/project/:projectId
 * @desc    Listar tarefas por projeto
 * @access  Private
 */
router.get('/project/:projectId', 
  permissions.check('tasks', 'read'),
  controller.getByProject.bind(controller)
);

module.exports = router;