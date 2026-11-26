const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 * Protects against basic DOS and spamming across all endpoints
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Max 200 requests per windowMs per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP address. Please try again after 15 minutes.',
    status: 429
  }
});

/**
 * Strict Auth rate limiter
 * Protects login and registration from brute-force credential stuffing
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Max 15 attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts from this IP. Please wait 15 minutes before trying again.',
    status: 429
  }
});

/**
 * One-Time Share Passcode (OTP) verification rate limiter
 * Very strict limit to prevent OTP brute-force attacks
 */
const shareOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // Max 10 attempts per 10 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many passcode attempts. Access temporarily blocked for 10 minutes.',
    status: 429
  }
});

/**
 * File upload rate limiter
 * Limits resource-intensive multipart file uploads
 */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25, // Max 25 uploads per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Upload limit reached for this session. Please try again in 15 minutes.',
    status: 429
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  shareOtpLimiter,
  uploadLimiter
};
