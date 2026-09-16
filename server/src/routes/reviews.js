// ============================================
// Routes: Reviews
// ============================================

const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { protect, restrictTo } = require('../middleware/auth');
const { validateReview } = require('../middleware/validation');

/**
 * POST /api/reviews
 * Write a review (authentication required)
 */
router.post('/', protect, validateReview, reviewController.createReview);

/**
 * GET /api/reviews/:businessId
 * Fetch every review of a business
 */
router.get('/:businessId', reviewController.getReviewsByBusiness);

/**
 * PUT /api/reviews/:id
 * Modifier son propre avis
 */
router.put('/:id', protect, reviewController.updateReview);

/**
 * DELETE /api/reviews/:id
 * Supprimer son propre avis
 */
router.delete('/:id', protect, reviewController.deleteReview);

/**
 * POST /api/reviews/:id/response
 * Reply to a review (business owner)
 */
router.post('/:id/response', protect, reviewController.respondToReview);

/**
 * PATCH /api/reviews/:id/report
 * Report a review
 */
router.patch('/:id/report', protect, reviewController.reportReview);

/**
 * PATCH /api/reviews/:id/visibility
 * Change a review's visibility (ADMIN only)
 */
router.patch('/:id/visibility', protect, restrictTo('ADMIN'), reviewController.toggleVisibility);

module.exports = router;
