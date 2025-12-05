const pool = require('../config/database');

// Get all holds for a user
exports.getUserHolds = async (req, res) => {
  try {
    const userId = req.user.id;

    const [holds] = await pool.execute(
      `SELECT h.*, b.title, b.author, b.isbn, b.available_copies, b.book_type 
       FROM holds h 
       JOIN books b ON h.book_id = b.id 
       WHERE h.user_id = ? 
       ORDER BY h.hold_date DESC`,
      [userId]
    );

    res.json({ holds });
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
      `SELECT h.*, b.title, b.author, b.isbn, b.available_copies, b.book_type 
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

// Check and process expired holds (apply fees)
exports.processExpiredHolds = async (req, res) => {
  try {
    const now = new Date();
    const HOLD_FEE_AMOUNT = 250.00; // 250 EGP

    // Find expired holds that haven't had fees applied yet
    const [expiredHolds] = await pool.execute(
      `SELECT h.*, b.title 
       FROM holds h 
       JOIN books b ON h.book_id = b.id 
       WHERE h.expiry_datetime < ? 
       AND h.status IN ('pending', 'available') 
       AND h.fee_applied = FALSE`,
      [now]
    );

    let feesApplied = 0;

    for (const hold of expiredHolds) {
      // Update hold status to expired and mark fee as applied
      await pool.execute(
        'UPDATE holds SET status = ?, fee_amount = ?, fee_applied = TRUE WHERE id = ?',
        ['expired', HOLD_FEE_AMOUNT, hold.id]
      );

      // Create fine record
      await pool.execute(
        `INSERT INTO fines (user_id, hold_id, amount, type, status, description) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          hold.user_id,
          hold.id,
          HOLD_FEE_AMOUNT,
          'hold_expiry',
          'pending',
          `Fee for expired hold on book: ${hold.title}. Hold expired on ${new Date(hold.expiry_datetime).toLocaleString()}`
        ]
      );

      feesApplied++;
    }

    res.json({ 
      message: `Processed ${feesApplied} expired holds`,
      feesApplied,
      expiredHolds: expiredHolds.length
    });
  } catch (error) {
    console.error('Process expired holds error:', error);
    res.status(500).json({ error: 'Failed to process expired holds' });
  }
};

// Create hold (reserve book) - Only for physical books
exports.createHold = async (req, res) => {
  try {
    const { book_id } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Only regular users can place reservations, not staff or admin
    if (userRole === 'staff' || userRole === 'admin') {
      return res.status(403).json({ 
        error: 'Staff and admin members cannot place reservations. Only regular users can reserve books.' 
      });
    }

    if (!book_id) {
      return res.status(400).json({ error: 'Book ID is required' });
    }

    // Check if book exists and get book type
    const [books] = await pool.execute(
      'SELECT * FROM books WHERE id = ?',
      [book_id]
    );

    if (books.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const book = books[0];
    const bookType = book.book_type || 'physical';

    // Only allow holds on physical books
    if (bookType === 'electronic') {
      return res.status(400).json({ 
        error: 'Cannot place a hold on electronic books. Electronic books can be borrowed directly.' 
      });
    }

    // Check if user already has a pending hold for this book
    const [existingHolds] = await pool.execute(
      'SELECT * FROM holds WHERE user_id = ? AND book_id = ? AND status IN ("pending", "available")',
      [userId, book_id]
    );

    if (existingHolds.length > 0) {
      return res.status(400).json({ error: 'You already have a hold on this book' });
    }

    // Calculate expiry datetime (48 hours from now)
    const holdDate = new Date();
    const expiryDatetime = new Date();
    expiryDatetime.setHours(expiryDatetime.getHours() + 48);
    
    // Also set expiry_date for backward compatibility
    const expiryDate = new Date(expiryDatetime);
    expiryDate.setHours(0, 0, 0, 0);

    // Create hold
    const [result] = await pool.execute(
      'INSERT INTO holds (user_id, book_id, hold_date, expiry_date, expiry_datetime, status, fee_amount, fee_applied) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, book_id, holdDate, expiryDate, expiryDatetime, 'pending', 0.00, false]
    );

    // Get hold with book details
    const [newHold] = await pool.execute(
      `SELECT h.*, b.title, b.author, b.isbn, b.available_copies, b.book_type 
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

