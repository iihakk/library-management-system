const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const { verifyToken, requireStaff } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(verifyToken);

// User routes - can only view their own loans
router.get('/', loanController.getUserLoans);
router.get('/:id', loanController.getLoanById);
router.put('/:id/renew', loanController.renewLoan);

// Loan creation - users can borrow electronic books directly, staff required for physical books
router.post('/', loanController.createLoan);
// Staff-only routes - only staff can process returns
router.put('/:id/return', verifyToken, requireStaff, loanController.returnLoan);

module.exports = router;

