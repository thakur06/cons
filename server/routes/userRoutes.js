const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/rbacMiddleware');

// Get system stats - Protected
router.get('/stats', authMiddleware, userController.getStats);

// List all users - Protected (Admin only)
router.get('/', authMiddleware, authorizeRoles('Admin'), userController.listUsers);

// Update user role - Protected (Admin only)
router.patch('/:id/role', authMiddleware, authorizeRoles('Admin'), userController.updateUserRole);

module.exports = router;
