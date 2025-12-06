const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const userManagementController = require('../controllers/userManagementController');
const loanPolicyController = require('../controllers/loanPolicyController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// All routes require admin authentication
router.use(verifyToken);
router.use(requireAdmin);

router.get('/users/:id/history', adminController.getUserWithHistory);
router.get('/staff/:id/history', adminController.getStaffHistory);
router.get('/staff', adminController.getAllStaff);
router.get('/history', adminController.getAdminHistory);
router.get('/reports/generate', adminController.generateReport);

// User management routes
router.post('/users/:id/activate', userManagementController.activateUser);
router.post('/users/:id/deactivate', userManagementController.deactivateUser);

// Loan policy routes
router.get('/loan-policy', loanPolicyController.getLoanPolicy);
router.put('/loan-policy', loanPolicyController.updateLoanPolicy);

module.exports = router;

