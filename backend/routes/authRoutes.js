const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/verify', authController.verifyToken);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerificationCode);
router.post('/forgot-password', authController.requestPasswordReset);
router.post('/verify-reset-code', authController.verifyPasswordResetCode);
router.post('/reset-password', authController.resetPassword);
router.post('/staff', verifyToken, requireAdmin, authController.createStaff);
router.get('/users', verifyToken, requireAdmin, authController.getAllUsers);
router.get('/users/:id', verifyToken, requireAdmin, authController.getUserById);

module.exports = router;
