// ============================================
// Routes: Users
// ============================================

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');

/**
 * GET /api/users/profile
 * Fetch my profile
 */
router.get('/profile', protect, userController.getProfile);

/**
 * PUT /api/users/profile
 * Update my profile
 */
router.put('/profile', protect, userController.updateProfile);

/**
 * GET /api/users/favorites
 * Fetch my favourite businesses
 */
router.get('/favorites', protect, userController.getFavorites);

/**
 * GET /api/users/my-reviews
 * Fetch my reviews
 */
router.get('/my-reviews', protect, userController.getMyReviews);

/**
 * DELETE /api/users/account
 * Delete my account
 */
router.delete('/account', protect, userController.deleteAccount);

module.exports = router;
