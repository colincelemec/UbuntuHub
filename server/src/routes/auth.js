// ============================================
// Routes: Authentication
// ============================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimiter');

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', authLimiter, validateRegister, authController.register);

/**
 * POST /api/auth/login
 * Sign a user in
 */
router.post('/login', authLimiter, validateLogin, authController.login);

/**
 * POST /api/auth/logout
 * Sign out (optional — mostly handled client-side)
 */
router.post('/logout', protect, authController.logout);

/**
 * GET /api/auth/me
 * Return the signed-in user's details
 */
router.get('/me', protect, authController.getMe);

/**
 * PUT /api/auth/update-password
 * Change the password
 */
router.put('/update-password', protect, authController.updatePassword);

/**
 * POST /api/auth/google
 * Sign in with Google OAuth (verifies the client-side idToken)
 */
router.post('/google', authLimiter, authController.googleAuth);

module.exports = router;
