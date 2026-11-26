const crypto = require('crypto');
const path = require('path');

/**
 * Sanitize filename to prevent directory traversal and header injection
 */
const sanitizeFilename = (filename) => {
  if (!filename) return 'unnamed_file';
  // Strip null bytes and path separators
  let cleaned = filename.replace(/\0/g, '').replace(/[\/\\]/g, '_');
  // Get extension safely
  const ext = path.extname(cleaned).toLowerCase();
  const base = path.basename(cleaned, ext).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  // Truncate to reasonable length
  const safeBase = base.slice(0, 100);
  return `${safeBase || 'document'}${ext}`;
};

/**
 * Timing-safe string comparison to protect against timing attacks on tokens / OTPs
 */
const safeCompare = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a.trim());
  const bufB = Buffer.from(b.trim());
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Hash an OTP with a fixed server salt
 */
const hashOtp = (otp) => {
  const salt = process.env.OTP_SALT || 'secure_vault_otp_salt_2026';
  return crypto.createHash('sha256').update(`${otp.trim()}:${salt}`).digest('hex');
};

/**
 * General security headers check & request body sanitizer
 */
const sanitizeRequestBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        // Strip null bytes
        req.body[key] = req.body[key].replace(/\0/g, '');
      }
    }
  }
  next();
};

module.exports = {
  sanitizeFilename,
  safeCompare,
  hashOtp,
  sanitizeRequestBody
};
