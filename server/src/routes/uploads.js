// ============================================
// Routes: Upload d'images
// ============================================

const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { protect } = require('../middleware/auth');

/**
 * GET /api/uploads/status
 * Lets the form know whether file upload can be offered
 */
router.get('/status', uploadController.getUploadStatus);

/**
 * GET /api/uploads/signature
 * One-time signature for a direct upload to Cloudinary
 */
router.get('/signature', protect, uploadController.getUploadSignature);

module.exports = router;
