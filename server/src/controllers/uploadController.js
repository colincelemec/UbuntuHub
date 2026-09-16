// ============================================
// Controller: image upload (Cloudinary)
//
// The file never travels through our server: the browser sends it
// straight to Cloudinary. Our API only signs the request, which
// avoids exposing the secret key and uses neither bandwidth nor
// disk on the server — essential on Railway, whose disk is wiped
// on every deployment.
//
// When Cloudinary is not configured the endpoint answers 503 and
// the form falls back to a plain URL field: nothing breaks.
// ============================================

const crypto = require('crypto');

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Example values: treated as "not configured"
const isPlaceholder = (v) => !v || /your-|xxx|changeme/i.test(v);

const isConfigured = Boolean(
  !isPlaceholder(CLOUD_NAME) && !isPlaceholder(API_KEY) && !isPlaceholder(API_SECRET)
);

// Allowed folders: the client cannot write wherever it likes
const ALLOWED_FOLDERS = ['ubuntuhub/logos', 'ubuntuhub/covers', 'ubuntuhub/avatars'];

/**
 * Cloudinary signature: SHA-1 of the sorted parameters + api_secret.
 * https://cloudinary.com/documentation/signatures
 */
function signParams(params, secret) {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHash('sha1').update(toSign + secret).digest('hex');
}

/**
 * @route   GET /api/uploads/signature?folder=ubuntuhub/logos
 * @desc    Provides a one-time signature for a direct upload
 * @access  Private (authenticated)
 */
exports.getUploadSignature = (req, res) => {
  if (!isConfigured) {
    return res.status(503).json({
      success: false,
      message: 'Upload d\'images non configuré sur ce serveur.',
      configured: false,
    });
  }

  const folder = ALLOWED_FOLDERS.includes(req.query.folder)
    ? req.query.folder
    : ALLOWED_FOLDERS[0];

  const timestamp = Math.round(Date.now() / 1000);

  // These parameters — and only these — must accompany the upload.
  // Cloudinary rejects the request if the client alters any of them.
  const params = {
    folder,
    timestamp,
    // Resized on the fly: we do not store 8 MB photos straight
    // out of a phone camera.
    transformation: 'c_limit,w_1600,h_1600,q_auto:good',
  };

  res.json({
    success: true,
    configured: true,
    data: {
      signature: signParams(params, API_SECRET),
      timestamp,
      folder,
      transformation: params.transformation,
      apiKey: API_KEY,
      cloudName: CLOUD_NAME,
      uploadUrl: `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    },
  });
};

/**
 * @route   GET /api/uploads/status
 * @desc    Tells the form whether to offer file upload or a URL field
 * @access  Public
 */
exports.getUploadStatus = (req, res) => {
  res.json({ success: true, configured: isConfigured });
};

module.exports.isConfigured = isConfigured;
module.exports.signParams = signParams;
