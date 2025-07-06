const express = require('express');
const router = express.Router();
const MonitoringController = require('../controllers/monitoringController');
const auth = require('../../../src/middleware/auth');
const permissions = require('../../../src/middleware/permissions');

const controller = new MonitoringController();

// Middleware de autenticação para todas as rotas
router.use(auth);

/**
 * @route   GET /api/whk/monitoring/dashboard
 * @desc    Obter dados do dashboard de monitoramento
 * @access  Private
 */
router.get('/dashboard', 
  permissions.check('monitoring', 'read'),
  controller.getDashboard.bind(controller)
);

/**
 * @route   GET /api/whk/monitoring/health
 * @desc    Verificar saúde do sistema de webhooks
 * @access  Private
 */
router.get('/health', 
  permissions.check('monitoring', 'read'),
  controller.getSystemHealth.bind(controller)
);

/**
 * @route   GET /api/whk/monitoring/metrics
 * @desc    Obter métricas detalhadas
 * @access  Private
 */
router.get('/metrics', 
  permissions.check('monitoring', 'read'),
  controller.getMetrics.bind(controller)
);

/**
 * @route   GET /api/whk/monitoring/alerts
 * @desc    Listar alertas ativos
 * @access  Private
 */
router.get('/alerts', 
  permissions.check('monitoring', 'read'),
  controller.getAlerts.bind(controller)
);

/**
 * @route   POST /api/whk/monitoring/alerts
 * @desc    Criar novo alerta
 * @access  Private
 */
router.post('/alerts', 
  permissions.check('monitoring', 'create'),
  controller.createAlert.bind(controller)
);

/**
 * @route   PUT /api/whk/monitoring/alerts/:id
 * @desc    Atualizar alerta
 * @access  Private
 */
router.put('/alerts/:id', 
  permissions.check('monitoring', 'update'),
  controller.updateAlert.bind(controller)
);

/**
 * @route   DELETE /api/whk/monitoring/alerts/:id
 * @desc    Excluir alerta
 * @access  Private
 */
router.delete('/alerts/:id', 
  permissions.check('monitoring', 'delete'),
  controller.deleteAlert.bind(controller)
);

/**
 * @route   POST /api/whk/monitoring/alerts/:id/acknowledge
 * @desc    Reconhecer alerta
 * @access  Private
 */
router.post('/alerts/:id/acknowledge', 
  permissions.check('monitoring', 'update'),
  controller.acknowledgeAlert.bind(controller)
);

/**
 * @route   GET /api/whk/monitoring/performance
 * @desc    Relatório de performance do sistema
 * @access  Private
 */
router.get('/performance', 
  permissions.check('monitoring', 'read'),
  controller.getPerformanceReport.bind(controller)
);

/**
 * @route   GET /api/whk/monitoring/uptime
 * @desc    Estatísticas de uptime
 * @access  Private
 */
router.get('/uptime', 
  permissions.check('monitoring', 'read'),
  controller.getUptimeStats.bind(controller)
);

/**
 * @route   GET /api/whk/monitoring/errors
 * @desc    Logs de erros recentes
 * @access  Private
 */
router.get('/errors', 
  permissions.check('monitoring', 'read'),
  controller.getErrorLogs.bind(controller)
);

/**
 * @route   GET /api/whk/monitoring/circuit-breakers
 * @desc    Status dos circuit breakers
 * @access  Private
 */
router.get('/circuit-breakers', 
  permissions.check('monitoring', 'read'),
  controller.getCircuitBreakerStatus.bind(controller)
);

/**
 * @route   POST /api/whk/monitoring/circuit-breakers/:id/reset
 * @desc    Resetar circuit breaker
 * @access  Private
 */
router.post('/circuit-breakers/:id/reset', 
  permissions.check('monitoring', 'update'),
  controller.resetCircuitBreaker.bind(controller)
);

/**
 * @route   GET /api/whk/monitoring/throughput
 * @desc    Métricas de throughput
 * @access  Private
 */
router.get('/throughput', 
  permissions.check('monitoring', 'read'),
  controller.getThroughputMetrics.bind(controller)
);

/**
 * @route   GET /api/whk/monitoring/latency
 * @desc    Métricas de latência
 * @access  Private
 */
router.get('/latency', 
  permissions.check('monitoring', 'read'),
  controller.getLatencyMetrics.bind(controller)
);

/**
 * @route   POST /api/whk/monitoring/test-alert
 * @desc    Testar sistema de alertas
 * @access  Private
 */
router.post('/test-alert', 
  permissions.check('monitoring', 'update'),
  controller.testAlert.bind(controller)
);

module.exports = router;