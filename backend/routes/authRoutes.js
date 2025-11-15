const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// Public routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/verify', authController.verifyToken);

// Protected admin routes
router.post('/staff', verifyToken, requireAdmin, authController.createStaff);

module.exports = router;

