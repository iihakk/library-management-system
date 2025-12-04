const express = require('express');
const router = express.Router();
const fineController = require('../controllers/fineController');
const { verifyToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(verifyToken);

router.get('/', fineController.getUserFines);
router.get('/:id', fineController.getFineById);

module.exports = router;

