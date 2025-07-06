const express = require('express');
const router = express.Router();
const KnowledgeBaseController = require('../controllers/knowledgeBaseController');
const auth = require('../../../src/middleware/auth');
const permissions = require('../../../src/middleware/permissions');

const controller = new KnowledgeBaseController();

// Middleware de autenticação para todas as rotas
router.use(auth);

/**
 * @route   GET /api/spt/knowledge-base
 * @desc    Listar artigos da base de conhecimento
 * @access  Private
 */
router.get('/', 
  permissions.check('knowledge_base', 'read'),
  controller.list.bind(controller)
);

/**
 * @route   GET /api/spt/knowledge-base/:id
 * @desc    Buscar artigo por ID
 * @access  Private
 */
router.get('/:id', 
  permissions.check('knowledge_base', 'read'),
  controller.getById.bind(controller)
);

/**
 * @route   POST /api/spt/knowledge-base
 * @desc    Criar novo artigo
 * @access  Private
 */
router.post('/', 
  permissions.check('knowledge_base', 'create'),
  controller.create.bind(controller)
);

/**
 * @route   PUT /api/spt/knowledge-base/:id
 * @desc    Atualizar artigo
 * @access  Private
 */
router.put('/:id', 
  permissions.check('knowledge_base', 'update'),
  controller.update.bind(controller)
);

/**
 * @route   DELETE /api/spt/knowledge-base/:id
 * @desc    Excluir artigo
 * @access  Private
 */
router.delete('/:id', 
  permissions.check('knowledge_base', 'delete'),
  controller.delete.bind(controller)
);

/**
 * @route   GET /api/spt/knowledge-base/search
 * @desc    Buscar artigos
 * @access  Private
 */
router.get('/search', 
  permissions.check('knowledge_base', 'read'),
  controller.search.bind(controller)
);

/**
 * @route   GET /api/spt/knowledge-base/categories
 * @desc    Listar categorias
 * @access  Private
 */
router.get('/categories', 
  permissions.check('knowledge_base', 'read'),
  controller.getCategories.bind(controller)
);

/**
 * @route   POST /api/spt/knowledge-base/categories
 * @desc    Criar categoria
 * @access  Private
 */
router.post('/categories', 
  permissions.check('knowledge_base', 'create'),
  controller.createCategory.bind(controller)
);

/**
 * @route   GET /api/spt/knowledge-base/category/:categoryId
 * @desc    Listar artigos por categoria
 * @access  Private
 */
router.get('/category/:categoryId', 
  permissions.check('knowledge_base', 'read'),
  controller.getByCategory.bind(controller)
);

/**
 * @route   POST /api/spt/knowledge-base/:id/publish
 * @desc    Publicar artigo
 * @access  Private
 */
router.post('/:id/publish', 
  permissions.check('knowledge_base', 'update'),
  controller.publishArticle.bind(controller)
);

/**
 * @route   POST /api/spt/knowledge-base/:id/unpublish
 * @desc    Despublicar artigo
 * @access  Private
 */
router.post('/:id/unpublish', 
  permissions.check('knowledge_base', 'update'),
  controller.unpublishArticle.bind(controller)
);

/**
 * @route   GET /api/spt/knowledge-base/:id/views
 * @desc    Obter estatísticas de visualizações
 * @access  Private
 */
router.get('/:id/views', 
  permissions.check('knowledge_base', 'read'),
  controller.getViewStats.bind(controller)
);

/**
 * @route   POST /api/spt/knowledge-base/:id/rating
 * @desc    Avaliar artigo
 * @access  Private
 */
router.post('/:id/rating', 
  permissions.check('knowledge_base', 'read'),
  controller.rateArticle.bind(controller)
);

module.exports = router;