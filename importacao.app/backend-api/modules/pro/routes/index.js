const express = require('express');
const router = express.Router();

// Import route modules
const projectsRoutes = require('./projects');
const tasksRoutes = require('./tasks');
const resourcesRoutes = require('./resources');
const timesheetsRoutes = require('./timesheets');

// Mount routes
router.use('/projects', projectsRoutes);
router.use('/tasks', tasksRoutes);
router.use('/resources', resourcesRoutes);
router.use('/timesheets', timesheetsRoutes);

// Module info endpoint
router.get('/', (req, res) => {
  res.json({
    module: 'PRO - Projetos',
    version: '1.0.0',
    description: 'Módulo de gerenciamento de projetos com controle de recursos e tempo',
    endpoints: {
      projects: '/api/pro/projects',
      tasks: '/api/pro/tasks',
      resources: '/api/pro/resources',
      timesheets: '/api/pro/timesheets'
    }
  });
});

module.exports = router;