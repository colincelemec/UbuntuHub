// ============================================
// Middleware: Validation
// ============================================

const { body, validationResult } = require('express-validator');

// ── Business phone numbers ──
// Accepts: "+39 02 1234567", "02 1234567", "333 123 4567", "02-1234567",
// "(02) 1234567", "+39.06.12345678". Requires 6 to 15 digits in total.
const PHONE_REGEX = /^\+?[\d\s().-]{6,25}$/;
const PHONE_MIN_DIGITS = 6;
const PHONE_MAX_DIGITS = 15;

/** Checks both the shape AND the real digit count */
const isValidPhone = (value) => {
  if (!PHONE_REGEX.test(value)) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= PHONE_MIN_DIGITS && digits.length <= PHONE_MAX_DIGITS;
};

/**
 * Middleware collecting the validation errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Erreurs de validation',
      errors: errors.array()
    });
  }

  next();
};

/**
 * Validation rules for creating or updating a business
 */
const validateBusiness = [
  body('name')
    .trim()
    .notEmpty().withMessage('Le nom est requis')
    .isLength({ min: 2, max: 255 }).withMessage('Le nom doit contenir entre 2 et 255 caractères'),

  body('description')
    .trim()
    .notEmpty().withMessage('La description est requise')
    .isLength({ min: 20 }).withMessage('La description doit contenir au moins 20 caractères'),

  // IDs are cuid values (not UUIDs) → we only check that they are present
  body('cityId')
    .notEmpty().withMessage('La ville est requise')
    .isString().withMessage('ID de ville invalide'),

  body('categoryId')
    .notEmpty().withMessage('La catégorie est requise')
    .isString().withMessage('ID de catégorie invalide'),

  body('address')
    .trim()
    .notEmpty().withMessage('L\'adresse est requise'),

  // Coordinates are optional: the controller falls back to the city centre
  body('latitude')
    .optional({ checkFalsy: true })
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide'),

  body('longitude')
    .optional({ checkFalsy: true })
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide'),

  // Phone: business numbers are accepted the way they are written in
  // Italy — landlines AND mobiles, with spaces, dots, dashes, brackets
  // and the international prefix. (isMobilePhone rejected landlines, e.g. 02 1234567.)
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .custom(isValidPhone).withMessage('Numéro de téléphone invalide'),

  body('whatsapp')
    .optional({ checkFalsy: true })
    .trim()
    .custom(isValidPhone).withMessage('Numéro WhatsApp invalide'),

  body('email')
    .optional({ checkFalsy: true })
    .isEmail().withMessage('Email invalide'),

  // require_tld: a complete domain is required (https://example → invalid)
  body('website')
    .optional({ checkFalsy: true })
    .trim()
    .isURL({ require_protocol: false, require_tld: true })
    .withMessage('URL du site web invalide'),

  validate
];

const validateRegister = [
  body('email')
    .trim()
    .notEmpty().withMessage('L\'email est requis')
    .isEmail().withMessage('Email invalide')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Le mot de passe est requis')
    .isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/\d/).withMessage('Le mot de passe doit contenir au moins un chiffre')
    .matches(/[a-zA-Z]/).withMessage('Le mot de passe doit contenir au moins une lettre'),

  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Le prénom doit contenir entre 2 et 100 caractères'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères'),

  validate
];

/**
 * Validation rules for sign-in
 */
const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('L\'email est requis')
    .isEmail().withMessage('Email invalide'),

  body('password')
    .notEmpty().withMessage('Le mot de passe est requis'),

  validate
];

/**
 * Validation rules for a review
 */
const validateReview = [
  // IDs are cuid values (e.g. "cmf3x8k2p0000qw3h5n8t2y1a"), not UUIDs:
  // isUUID() therefore rejected every review submission.
  body('businessId')
    .notEmpty().withMessage('L\'ID de l\'entreprise est requis')
    .isString().withMessage('ID d\'entreprise invalide'),

  body('rating')
    .notEmpty().withMessage('La note est requise')
    .isInt({ min: 1, max: 5 }).withMessage('La note doit être entre 1 et 5'),

  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Le commentaire ne peut pas dépasser 1000 caractères'),

  validate
];

module.exports = {
  validate,
  validateBusiness,
  validateRegister,
  validateLogin,
  validateReview
};
