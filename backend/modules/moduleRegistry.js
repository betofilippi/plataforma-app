/**
 * Module Registry - Centralized module configuration
 * Registers all ERP modules with the main application
 */

const express = require('express');

// Import module routes
const cadRoutes = require('./cad/routes');
const cmpRoutes = require('./cmp/routes');
const estRoutes = require('./est/routes/estoqueRoutes');
const fisRoutes = require('./fis/routes');
const impRoutes = require('./imp/routes');
const locRoutes = require('./loc/routes');
const logRoutes = require('./log/routes');
const prdRoutes = require('./prd/routes');
const proRoutes = require('./pro/routes');
const sptRoutes = require('./spt/routes');
const vndRoutes = require('./vnd/routes');
const whkRoutes = require('./whk/routes');

/**
 * Module Configuration
 * Each module has:
 * - name: Display name
 * - code: Module code (3 letters)
 * - version: Current version
 * - description: Module description
 * - routes: Express router for the module
 * - dependencies: Other modules this depends on
 * - status: active, inactive, maintenance
 */
const modules = {
  cad: {
    name: 'Cadastros',
    code: 'CAD',
    version: '1.0.0',
    description: 'Módulo de cadastros básicos - clientes, produtos, fornecedores',
    routes: cadRoutes,
    dependencies: [],
    status: 'active',
    endpoints: [
      '/api/cad/clients',
      '/api/cad/products', 
      '/api/cad/suppliers',
      '/api/cad/categories',
      '/api/cad/users',
      '/api/cad/companies'
    ]
  },

  cmp: {
    name: 'Compras',
    code: 'CMP',
    version: '1.0.0',
    description: 'Módulo de gestão de compras e fornecedores',
    routes: cmpRoutes,
    dependencies: ['cad'],
    status: 'active',
    endpoints: [
      '/api/cmp/purchase-orders',
      '/api/cmp/quotations',
      '/api/cmp/requisitions'
    ]
  },

  est: {
    name: 'Estoque',
    code: 'EST',
    version: '1.0.0',
    description: 'Módulo de controle de estoque e inventário',
    routes: estRoutes,
    dependencies: ['cad'],
    status: 'active',
    endpoints: [
      '/api/est/estoque',
      '/api/est/movimentacoes',
      '/api/est/inventarios',
      '/api/est/lotes'
    ]
  },

  fis: {
    name: 'Fiscal',
    code: 'FIS',
    version: '1.0.0',
    description: 'Módulo fiscal e tributário',
    routes: fisRoutes,
    dependencies: ['cad', 'vnd', 'cmp'],
    status: 'active',
    endpoints: [
      '/api/fis/nfe',
      '/api/fis/nfse',
      '/api/fis/tax-engine',
      '/api/fis/compliance'
    ]
  },

  imp: {
    name: 'Importação',
    code: 'IMP',
    version: '1.0.0',
    description: 'Módulo de importação e integração de dados',
    routes: impRoutes,
    dependencies: ['cad'],
    status: 'active',
    endpoints: [
      '/api/imp/batch-import',
      '/api/imp/data-transformation',
      '/api/imp/validation',
      '/api/imp/history'
    ]
  },

  loc: {
    name: 'Locação',
    code: 'LOC',
    version: '1.0.0',
    description: 'Módulo de gestão de locação e rental',
    routes: locRoutes,
    dependencies: ['cad', 'fis'],
    status: 'active',
    endpoints: [
      '/api/loc/rental-contracts',
      '/api/loc/equipment'
    ]
  },

  log: {
    name: 'Logística',
    code: 'LOG',
    version: '1.0.0',
    description: 'Módulo de logística e transportes',
    routes: logRoutes,
    dependencies: ['cad', 'vnd'],
    status: 'active',
    endpoints: [
      '/api/log/transportation',
      '/api/log/carriers',
      '/api/log/route-optimization'
    ]
  },

  prd: {
    name: 'Produção',
    code: 'PRD',
    version: '1.0.0',
    description: 'Módulo de gestão de produção e manufatura',
    routes: prdRoutes,
    dependencies: ['cad', 'est', 'cmp'],
    status: 'active',
    endpoints: [
      '/api/prd/production-orders',
      '/api/prd/work-centers',
      '/api/prd/bom',
      '/api/prd/quality-control'
    ]
  },

  pro: {
    name: 'Projetos',
    code: 'PRO',
    version: '1.0.0',
    description: 'Módulo de gestão de projetos e tarefas',
    routes: proRoutes,
    dependencies: ['cad'],
    status: 'active',
    endpoints: [
      '/api/pro/projects',
      '/api/pro/tasks',
      '/api/pro/resources',
      '/api/pro/timesheets'
    ]
  },

  spt: {
    name: 'Suporte',
    code: 'SPT',
    version: '1.0.0',
    description: 'Módulo de suporte ao cliente e helpdesk',
    routes: sptRoutes,
    dependencies: ['cad'],
    status: 'active',
    endpoints: [
      '/api/spt/tickets',
      '/api/spt/knowledge-base',
      '/api/spt/agents',
      '/api/spt/automation'
    ]
  },

  vnd: {
    name: 'Vendas',
    code: 'VND',
    version: '1.0.0',
    description: 'Módulo de gestão de vendas e CRM',
    routes: vndRoutes,
    dependencies: ['cad'],
    status: 'active',
    endpoints: [
      '/api/vnd/sales-orders',
      '/api/vnd/quotations',
      '/api/vnd/pipeline',
      '/api/vnd/commissions'
    ]
  },

  whk: {
    name: 'Webhooks',
    code: 'WHK',
    version: '1.0.0',
    description: 'Módulo de gestão centralizada de webhooks',
    routes: whkRoutes,
    dependencies: [],
    status: 'active',
    endpoints: [
      '/api/whk/webhooks',
      '/api/whk/events',
      '/api/whk/deliveries',
      '/api/whk/monitoring'
    ]
  }
};

/**
 * Register all modules with Express app
 * @param {Express} app - Express application instance
 */
function registerModules(app) {
  // Register each module route
  Object.entries(modules).forEach(([moduleCode, moduleConfig]) => {
    if (moduleConfig.status === 'active' && moduleConfig.routes) {
      app.use(`/api/${moduleCode}`, moduleConfig.routes);
      console.log(`✅ Module ${moduleConfig.code} (${moduleConfig.name}) registered at /api/${moduleCode}`);
    } else {
      console.log(`⚠️  Module ${moduleConfig.code} skipped (status: ${moduleConfig.status})`);
    }
  });

  // Create module registry endpoint
  app.get('/api/modules', (req, res) => {
    const moduleList = Object.entries(modules).map(([code, config]) => ({
      code: config.code,
      name: config.name,
      version: config.version,
      description: config.description,
      status: config.status,
      endpoints: config.endpoints,
      dependencies: config.dependencies
    }));

    res.json({
      success: true,
      data: {
        modules: moduleList,
        total_modules: moduleList.length,
        active_modules: moduleList.filter(m => m.status === 'active').length,
        system_info: {
          name: 'ERP NXT - Sistema Integrado de Gestão',
          version: '1.0.0',
          description: 'Sistema ERP completo com módulos integrados',
          architecture: 'Microservices-ready modular architecture'
        }
      }
    });
  });

  // Create module health check endpoint
  app.get('/api/modules/health', (req, res) => {
    const healthChecks = Object.entries(modules).map(([code, config]) => ({
      module: config.code,
      name: config.name,
      status: config.status,
      health: config.status === 'active' ? 'healthy' : 'inactive',
      endpoints_count: config.endpoints.length,
      last_check: new Date().toISOString()
    }));

    const overallHealth = healthChecks.every(check => check.health === 'healthy') ? 'healthy' : 'degraded';

    res.json({
      success: true,
      data: {
        overall_health: overallHealth,
        modules: healthChecks,
        timestamp: new Date().toISOString()
      }
    });
  });

  console.log(`\n🎯 ERP System Ready!`);
  console.log(`📊 Total Modules: ${Object.keys(modules).length}`);
  console.log(`✅ Active Modules: ${Object.values(modules).filter(m => m.status === 'active').length}`);
  console.log(`🔗 Module Registry: GET /api/modules`);
  console.log(`💚 Health Check: GET /api/modules/health\n`);
}

/**
 * Get module configuration
 * @param {string} moduleCode - Module code
 * @returns {object} Module configuration
 */
function getModule(moduleCode) {
  return modules[moduleCode.toLowerCase()];
}

/**
 * Get all active modules
 * @returns {array} Array of active modules
 */
function getActiveModules() {
  return Object.entries(modules)
    .filter(([_, config]) => config.status === 'active')
    .map(([code, config]) => ({ code, ...config }));
}

/**
 * Check module dependencies
 * @param {string} moduleCode - Module to check
 * @returns {boolean} True if all dependencies are active
 */
function checkDependencies(moduleCode) {
  const module = modules[moduleCode.toLowerCase()];
  if (!module) return false;

  return module.dependencies.every(dep => {
    const depModule = modules[dep.toLowerCase()];
    return depModule && depModule.status === 'active';
  });
}

module.exports = {
  modules,
  registerModules,
  getModule,
  getActiveModules,
  checkDependencies
};