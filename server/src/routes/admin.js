// ============================================
// Routes: Admin
// ============================================

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/auth');

// Every admin route requires the ADMIN role
router.use(protect);
router.use(restrictTo('ADMIN'));

/**
 * GET /api/admin/stats
 * Platform-wide statistics
 */
router.get('/stats', adminController.getStats);

/**
 * GET /api/admin/businesses
 * List every business (with filters)
 */
router.get('/businesses', adminController.getAllBusinesses);

/**
 * GET /api/admin/businesses/pending
 * Businesses awaiting a check
 */
router.get('/businesses/pending', adminController.getPendingBusinesses);

/**
 * GET /api/admin/users
 * List every user
 */
router.get('/users', adminController.getAllUsers);

/**
 * PATCH /api/admin/users/:id/role
 * Change a user's role
 */
router.patch('/users/:id/role', adminController.updateUserRole);

/**
 * GET /api/admin/reviews/reported
 * Reported reviews
 */
router.get('/reviews/reported', adminController.getReportedReviews);

/**
 * DELETE /api/admin/reviews/:id
 * Delete a review (moderation)
 */
router.delete('/reviews/:id', adminController.deleteReview);

/**
 * DELETE /api/admin/users/:id
 * Delete a user
 */
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;
