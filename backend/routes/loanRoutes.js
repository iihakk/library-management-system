const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const { verifyToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(verifyToken);

router.get('/', loanController.getUserLoans);
router.get('/:id', loanController.getLoanById);
router.post('/', loanController.createLoan);
router.put('/:id/return', loanController.returnLoan);

module.exports = router;

