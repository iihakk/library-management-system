const express = require('express');
const router = express.Router();
const staffLoanController = require('../controllers/staffLoanController');
const { verifyToken, requireStaff } = require('../middleware/authMiddleware');

// All routes require staff authentication
router.use(verifyToken);
router.use(requireStaff);

// User search
router.get('/users/search', staffLoanController.searchUsers);
router.get('/users/:id', staffLoanController.getUserById);

// Loan management
router.get('/loans', staffLoanController.getAllActiveLoans);
router.get('/loans/:id', staffLoanController.getLoanById);
router.post('/loans/assign', staffLoanController.assignBook);
router.put('/loans/:id/return', staffLoanController.processReturn);

module.exports = router;

