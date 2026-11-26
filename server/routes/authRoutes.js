const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const { sanitizeRequestBody } = require('../middleware/securityMiddleware');

// Public endpoints with rate limiting & sanitization
router.post('/register', authLimiter, sanitizeRequestBody, authController.register);
router.post('/login', authLimiter, sanitizeRequestBody, authController.login);

// Protected endpoint
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
