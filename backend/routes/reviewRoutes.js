const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// Public route for viewing approved reviews (auth optional for user context)
router.get('/book/:bookId', async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const { verifyToken } = require('../middleware/authMiddleware');
      await verifyToken(req, res, () => {});
      if (!res.headersSent) next();
    } catch (err) {
      next();
    }
  } else {
    next();
  }
}, reviewController.getBookReviews);

// Protected routes (users must be authenticated)
router.use(verifyToken);
router.post('/book/:bookId', reviewController.createOrUpdateReview);
router.delete('/:reviewId', reviewController.deleteReview);

// Admin routes
router.use(requireAdmin);
router.get('/pending', reviewController.getPendingReviews);
router.post('/:reviewId/approve', reviewController.approveReview);
router.post('/:reviewId/reject', reviewController.rejectReview);

module.exports = router;

