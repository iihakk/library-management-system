const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// Public routes
router.get('/', bookController.getAllBooks);
router.get('/:id', bookController.getBookById);

// Protected routes (admin only)
router.post('/', verifyToken, requireAdmin, bookController.createBook);
router.put('/:id', verifyToken, requireAdmin, bookController.updateBook);
router.delete('/:id', verifyToken, requireAdmin, bookController.deleteBook);

module.exports = router;

