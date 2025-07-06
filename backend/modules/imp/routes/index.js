const express = require('express');
const router = express.Router();

// Import all route modules
const importacaoRoutes = require('./importacao');

// Mount routes
router.use('/importacao', importacaoRoutes);

module.exports = router;