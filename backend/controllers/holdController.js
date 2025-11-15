const pool = require('../config/database');

// Get all holds for a user
exports.getUserHolds = async (req, res) => {
  try {
    const userId = req.user.id;

    const [holds] = await pool.execute(
      `SELECT h.*, b.title, b.author, b.isbn, b.available_copies 
       FROM holds h 
       JOIN books b ON h.book_id = b.id 
       WHERE h.user_id = ? 
       ORDER BY h.hold_date DESC`,
      [userId]
    );

    res.json(holds);
  } catch (error) {
    console.error('Get holds error:', error);
    res.status(500).json({ error: 'Failed to fetch holds' });
  }
};

// Get hold by ID
exports.getHoldById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [holds] = await pool.execute(
      `SELECT h.*, b.title, b.author, b.isbn, b.available_copies 
       FROM holds h 
       JOIN books b ON h.book_id = b.id 
       WHERE h.id = ? AND h.user_id = ?`,
      [id, userId]
    );

    if (holds.length === 0) {
      return res.status(404).json({ error: 'Hold not found' });
    }

    res.json(holds[0]);
  } catch (error) {
    console.error('Get hold error:', error);
    res.status(500).json({ error: 'Failed to fetch hold' });
  }
};

// Create hold (reserve book)
exports.createHold = async (req, res) => {
  try {
    const { book_id } = req.body;
    const userId = req.user.id;

    if (!book_id) {
      return res.status(400).json({ error: 'Book ID is required' });
    }

    // Check if book exists
    const [books] = await pool.execute(
      'SELECT * FROM books WHERE id = ?',
      [book_id]
    );

    if (books.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Check if user already has a pending hold for this book
    const [existingHolds] = await pool.execute(
      'SELECT * FROM holds WHERE user_id = ? AND book_id = ? AND status = "pending"',
      [userId, book_id]
    );

    if (existingHolds.length > 0) {
      return res.status(400).json({ error: 'You already have a hold on this book' });
    }

    // Calculate expiry date (7 days from now)
    const holdDate = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);

    // Create hold
    const [result] = await pool.execute(
      'INSERT INTO holds (user_id, book_id, hold_date, expiry_date, status) VALUES (?, ?, ?, ?, ?)',
      [userId, book_id, holdDate, expiryDate, 'pending']
    );

    // Get hold with book details
    const [newHold] = await pool.execute(
      `SELECT h.*, b.title, b.author, b.isbn, b.available_copies 
       FROM holds h 
       JOIN books b ON h.book_id = b.id 
       WHERE h.id = ?`,
      [result.insertId]
    );

    res.status(201).json(newHold[0]);
  } catch (error) {
    console.error('Create hold error:', error);
    res.status(500).json({ error: 'Failed to create hold' });
  }
};

// Cancel hold
exports.cancelHold = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get hold
    const [holds] = await pool.execute(
      'SELECT * FROM holds WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (holds.length === 0) {
      return res.status(404).json({ error: 'Hold not found' });
    }

    const hold = holds[0];

    if (hold.status === 'cancelled') {
      return res.status(400).json({ error: 'Hold already cancelled' });
    }

    // Update hold
    await pool.execute(
      'UPDATE holds SET status = ? WHERE id = ?',
      ['cancelled', id]
    );

    res.json({ message: 'Hold cancelled successfully' });
  } catch (error) {
    console.error('Cancel hold error:', error);
    res.status(500).json({ error: 'Failed to cancel hold' });
  }
};

