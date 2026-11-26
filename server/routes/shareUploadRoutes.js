const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { shareOtpLimiter, uploadLimiter } = require('../middleware/rateLimiter');
const { sanitizeRequestBody } = require('../middleware/securityMiddleware');
const {
  createShareLink,
  listMyShareLinks,
  revokeShareLink,
  deleteShareLink,
  getShareLinkInfo,
  verifyOtp,
  uploadViaShareLink
} = require('../controllers/shareUploadController');

// --- Protected Endpoints (For Authenticated Users Generating Links) ---
router.post('/generate', authMiddleware, sanitizeRequestBody, createShareLink);
router.get('/my-links', authMiddleware, listMyShareLinks);
router.patch('/:id/revoke', authMiddleware, revokeShareLink);
router.delete('/:id', authMiddleware, deleteShareLink);

// --- Public Endpoints (For Recipient / Guest User Using the Link) ---
// 1. Get info on link (active, expired, used)
router.get('/:token/info', getShareLinkInfo);

// 2. Verify OTP passcode (Strict rate limiter)
router.post('/:token/verify-otp', shareOtpLimiter, sanitizeRequestBody, verifyOtp);

// 3. Upload file(s) using OTP (Strict rate limiter, supports multiple files, one-time only!)
router.post('/:token/upload', shareOtpLimiter, uploadLimiter, upload.any(), uploadViaShareLink);

module.exports = router;
