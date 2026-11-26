const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { uploadLimiter } = require('../middleware/rateLimiter');

// Upload file (PDF / DOCX) - Protected & Rate-limited
router.post('/upload', authMiddleware, uploadLimiter, upload.single('file'), fileController.uploadFile);

// List files with search & filter - Protected
router.get('/', authMiddleware, fileController.listFiles);

// Public stream endpoint for local fallback storage (Supports /stream/filename or /stream/uploads/filename)
router.get('/stream/*', fileController.streamLocalFile);
router.get('/stream/:filename', fileController.streamLocalFile);

// Get presigned URL for specific file - Protected
router.get('/:id/url', authMiddleware, fileController.getFilePresignedUrl);

// Delete file - Protected (RBAC: Admin or owner)
router.delete('/:id', authMiddleware, fileController.deleteFile);

module.exports = router;
