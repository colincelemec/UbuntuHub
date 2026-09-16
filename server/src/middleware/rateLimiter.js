// ============================================
// Middleware: Rate Limiter
// ============================================

const rateLimit = require('express-rate-limit');

// Limits are disabled in development: React's dev mode
// (StrictMode doubles every request) and page reloads would burn
// through the 100 requests/15 min budget and lock you out of login.
//
// IMPORTANT — security: limits are lifted ONLY when NODE_ENV is
// explicitly 'development' or 'test'. When the variable is missing
// (a common case in production), protection stays ON.
// Previously, forgetting NODE_ENV=production was enough to leave
// login with no protection against brute-force attacks.
const env = process.env.NODE_ENV;
const isDev = env === 'development' || env === 'test';

// Global rate limiter, applied to every API route
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes by default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests per window
  skip: () => isDev, // never block in development
  message: {
    success: false,
    message: 'Trop de requêtes. Veuillez réessayer plus tard.'
  },
  standardHeaders: true, // Report rate-limit state in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the legacy `X-RateLimit-*` headers
});

// Strict limiter for authentication routes (anti brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // at most 5 attempts
  skipSuccessfulRequests: true, // Only count failed attempts
  skip: () => isDev, // never block in development
  message: {
    success: false,
    message: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.'
  }
});

// Limiter for content creation
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // at most 10 creations per hour
  message: {
    success: false,
    message: 'Trop de créations. Veuillez réessayer plus tard.'
  }
});

module.exports = {
  limiter,
  authLimiter,
  createLimiter
};
