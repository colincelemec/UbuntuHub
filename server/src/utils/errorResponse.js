// ============================================
// Error details returned in API responses
//
// In development, returning error.message to the client is convenient.
// In production it leaks information: Prisma messages expose table
// and column names, and sometimes fragments of SQL queries — all
// valuable to an attacker.
//
// Usage :
//   res.status(500).json({ success: false, message: '…', ...devDetails(error) });
// ============================================

const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

/**
 * Returns { error: '…' } in development, {} in production.
 * The full error always remains visible in the server logs.
 */
function devDetails(error) {
  if (!isDev) return {};
  return { error: error?.message || String(error) };
}

module.exports = { devDetails, isDev };
