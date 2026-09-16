// ============================================
// Routes: meta (cities & categories) — public
// ============================================

const express = require('express');
const router = express.Router();
const metaController = require('../controllers/metaController');

// GET /api/meta/cities
router.get('/cities', metaController.getCities);

// GET /api/meta/categories
router.get('/categories', metaController.getCategories);

module.exports = router;
