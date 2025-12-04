const pool = require('../config/database');

// Get all fines for a user
exports.getUserFines = async (req, res) => {
  try {
    const userId = req.user.id;

    const [fines] = await pool.execute(
      `SELECT f.*, 
       h.id as hold_id, b.title as book_title,
       l.id as loan_id
       FROM fines f
       LEFT JOIN holds h ON f.hold_id = h.id
       LEFT JOIN books b ON h.book_id = b.id
       LEFT JOIN loans l ON f.loan_id = l.id
       WHERE f.user_id = ? 
       ORDER BY f.created_at DESC`,
      [userId]
    );

    res.json({ fines });
  } catch (error) {
    console.error('Get fines error:', error);
    res.status(500).json({ error: 'Failed to fetch fines' });
  }
};

// Get fine by ID
exports.getFineById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [fines] = await pool.execute(
      `SELECT f.*, 
       h.id as hold_id, b.title as book_title,
       l.id as loan_id
       FROM fines f
       LEFT JOIN holds h ON f.hold_id = h.id
       LEFT JOIN books b ON h.book_id = b.id
       LEFT JOIN loans l ON f.loan_id = l.id
       WHERE f.id = ? AND f.user_id = ?`,
      [id, userId]
    );

    if (fines.length === 0) {
      return res.status(404).json({ error: 'Fine not found' });
    }

    res.json(fines[0]);
  } catch (error) {
    console.error('Get fine error:', error);
    res.status(500).json({ error: 'Failed to fetch fine' });
  }
};

