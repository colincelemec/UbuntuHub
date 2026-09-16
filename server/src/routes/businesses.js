// ============================================
// Routes: Businesses (Entreprises)
// ============================================

const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');
const { protect, restrictTo } = require('../middleware/auth');
const { validateBusiness } = require('../middleware/validation');

// ============================================
// ROUTES PUBLIQUES
// ============================================

/**
 * GET /api/businesses
 * List every business (paginated and filtered)
 * Query params: page, limit, city, category, search
 */
router.get('/', businessController.getAllBusinesses);

/**
 * GET /api/businesses/search
 * Advanced business search
 * Query params: q, city, category, lat, lng, radius
 */
router.get('/search', businessController.searchBusinesses);

/**
 * GET /api/businesses/:slug
 * Fetch one business by its slug
 */
router.get('/:slug', businessController.getBusinessBySlug);

/**
 * GET /api/businesses/:id/reviews
 * Fetch the reviews of a business
 */
router.get('/:id/reviews', businessController.getBusinessReviews);

// ============================================
// PROTECTED ROUTES (authentication required)
// ============================================

/**
 * POST /api/businesses
 * Create a new business (USER or BUSINESS)
 */
router.post('/',
  protect,
  validateBusiness,
  businessController.createBusiness
);

/**
 * PUT /api/businesses/:id
 * Update a business (owner only)
 */
router.put('/:id',
  protect,
  validateBusiness,
  businessController.updateBusiness
);

/**
 * DELETE /api/businesses/:id
 * Delete a business (owner or admin)
 */
router.delete('/:id',
  protect,
  businessController.deleteBusiness
);

/**
 * POST /api/businesses/:id/favorite
 * Add to or remove from favourites
 */
router.post('/:id/favorite',
  protect,
  businessController.toggleFavorite
);

/**
 * GET /api/businesses/my/list
 * Fetch my own businesses (owner)
 */
router.get('/my/list',
  protect,
  businessController.getMyBusinesses
);

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * PATCH /api/businesses/:id/verify
 * Grant the verified badge (ADMIN only)
 */
router.patch('/:id/verify',
  protect,
  restrictTo('ADMIN'),
  businessController.verifyBusiness
);

/**
 * PATCH /api/businesses/:id/status
 * Change a business status (ADMIN only)
 */
router.patch('/:id/status',
  protect,
  restrictTo('ADMIN'),
  businessController.updateBusinessStatus
);

module.exports = router;
