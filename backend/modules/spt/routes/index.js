const express = require('express');
const router = express.Router();

// Import route modules
const ticketsRoutes = require('./tickets');
const knowledgeBaseRoutes = require('./knowledgeBase');
const agentsRoutes = require('./agents');
const automationRoutes = require('./automation');
const slaRoutes = require('./sla');

// Mount routes
router.use('/tickets', ticketsRoutes);
router.use('/knowledge-base', knowledgeBaseRoutes);
router.use('/agents', agentsRoutes);
router.use('/automation', automationRoutes);
router.use('/sla', slaRoutes);

// Module info endpoint
router.get('/', (req, res) => {
  res.json({
    module: 'SPT - Suporte',
    version: '1.0.0',
    description: 'Módulo de gerenciamento de suporte ao cliente com sistema de tickets',
    endpoints: {
      tickets: '/api/spt/tickets',
      knowledge_base: '/api/spt/knowledge-base',
      agents: '/api/spt/agents',
      automation: '/api/spt/automation',
      sla: '/api/spt/sla'
    }
  });
});

module.exports = router;