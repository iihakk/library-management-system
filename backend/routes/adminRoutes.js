const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// All routes require admin authentication
router.use(verifyToken);
router.use(requireAdmin);

router.get('/users/:id/history', adminController.getUserWithHistory);
router.get('/staff/:id/history', adminController.getStaffHistory);
router.get('/staff', adminController.getAllStaff);
router.get('/history', adminController.getAdminHistory);
router.get('/reports/generate', adminController.generateReport);

module.exports = router;

