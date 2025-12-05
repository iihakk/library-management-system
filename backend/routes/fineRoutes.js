const express = require('express');
const router = express.Router();
const fineController = require('../controllers/fineController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', fineController.getUserFines);
router.get('/history', fineController.getFineHistory);
router.get('/:id', fineController.getFineById);
router.post('/:id/pay', fineController.payFine);

module.exports = router;

