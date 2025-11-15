const express = require('express');
const router = express.Router();
const holdController = require('../controllers/holdController');
const { verifyToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(verifyToken);

router.get('/', holdController.getUserHolds);
router.get('/:id', holdController.getHoldById);
router.post('/', holdController.createHold);
router.delete('/:id', holdController.cancelHold);

module.exports = router;

