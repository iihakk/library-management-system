const pool = require('../config/database');

// Get reviews for a book
exports.getBookReviews = async (req, res) => {
  try {
    const { bookId } = req.params;
    const { status = 'approved' } = req.query;
    const userId = req.user?.id;

    let query = `
      SELECT r.*, 
             u.display_name as user_name,
             u.email as user_email
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.book_id = ?
    `;
    const params = [bookId];

    if (status && status !== 'all') {
      query += ' AND r.status = ?';
      params.push(status);
    }

    query += ' ORDER BY r.created_at DESC';

    const [reviews] = await pool.execute(query, params);

    // Mark if current user's review
    const reviewsWithUserFlag = reviews.map(review => ({
      ...review,
      is_current_user: userId ? review.user_id === userId : false
    }));

    res.json({ reviews: reviewsWithUserFlag });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

// Create or update review
exports.createOrUpdateReview = async (req, res) => {
  try {
    const { bookId } = req.params;
    const { rating, review_text } = req.body;
    const userId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Check if book exists
    const [books] = await pool.execute('SELECT id FROM books WHERE id = ?', [bookId]);
    if (books.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Check if user already reviewed this book
    const [existingReviews] = await pool.execute(
      'SELECT id FROM reviews WHERE user_id = ? AND book_id = ?',
      [userId, bookId]
    );

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      if (existingReviews.length > 0) {
        // Update existing review
        await connection.execute(
          `UPDATE reviews 
           SET rating = ?, review_text = ?, status = 'approved', updated_at = NOW()
           WHERE id = ?`,
          [rating, review_text || null, existingReviews[0].id]
        );
      } else {
        // Create new review - auto-approve
        await connection.execute(
          `INSERT INTO reviews (book_id, user_id, rating, review_text, status)
           VALUES (?, ?, ?, ?, 'approved')`,
          [bookId, userId, rating, review_text || null]
        );
      }

      // Recalculate book average rating
      await updateBookRating(connection, bookId);

      await connection.commit();

      const [updatedReview] = await connection.execute(
        `SELECT r.*, u.display_name as user_name
         FROM reviews r
         JOIN users u ON r.user_id = u.id
         WHERE r.user_id = ? AND r.book_id = ?`,
        [userId, bookId]
      );

      res.json({
        message: existingReviews.length > 0 ? 'Review updated successfully' : 'Review submitted successfully',
        review: updatedReview[0]
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
};

// Delete own review
exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    const [reviews] = await pool.execute(
      'SELECT book_id FROM reviews WHERE id = ? AND user_id = ?',
      [reviewId, userId]
    );

    if (reviews.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const bookId = reviews[0].book_id;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute('DELETE FROM reviews WHERE id = ?', [reviewId]);

      await updateBookRating(connection, bookId);

      await connection.commit();

      res.json({ message: 'Review deleted successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
};

// Admin: Get all pending reviews
exports.getPendingReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const [reviews] = await pool.execute(
      `SELECT r.*, 
       b.title as book_title,
       b.author as book_author,
       u.display_name as user_name,
       u.email as user_email
       FROM reviews r
       JOIN books b ON r.book_id = b.id
       JOIN users u ON r.user_id = u.id
       WHERE r.status = 'pending'
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [parseInt(limit), parseInt(offset)]
    );

    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM reviews WHERE status = "pending"'
    );

    res.json({
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get pending reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch pending reviews' });
  }
};

// Admin: Approve review
exports.approveReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const [reviews] = await pool.execute(
      'SELECT book_id FROM reviews WHERE id = ?',
      [reviewId]
    );

    if (reviews.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const bookId = reviews[0].book_id;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute(
        'UPDATE reviews SET status = "approved" WHERE id = ?',
        [reviewId]
      );

      await updateBookRating(connection, bookId);

      await connection.commit();

      res.json({ message: 'Review approved successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Approve review error:', error);
    res.status(500).json({ error: 'Failed to approve review' });
  }
};

// Admin: Reject review
exports.rejectReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const [reviews] = await pool.execute(
      'SELECT book_id FROM reviews WHERE id = ?',
      [reviewId]
    );

    if (reviews.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const bookId = reviews[0].book_id;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute(
        'UPDATE reviews SET status = "rejected" WHERE id = ?',
        [reviewId]
      );

      await updateBookRating(connection, bookId);

      await connection.commit();

      res.json({ message: 'Review rejected successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Reject review error:', error);
    res.status(500).json({ error: 'Failed to reject review' });
  }
};

// Helper function to update book average rating
async function updateBookRating(connection, bookId) {
  const [stats] = await connection.execute(
    `SELECT 
       AVG(rating) as avg_rating,
       COUNT(*) as total_reviews
     FROM reviews
     WHERE book_id = ? AND status = 'approved'`,
    [bookId]
  );

  const avgRating = stats[0].avg_rating ? parseFloat(stats[0].avg_rating).toFixed(2) : null;
  const totalReviews = stats[0].total_reviews || 0;

  await connection.execute(
    'UPDATE books SET average_rating = ?, total_reviews = ? WHERE id = ?',
    [avgRating, totalReviews, bookId]
  );
}

