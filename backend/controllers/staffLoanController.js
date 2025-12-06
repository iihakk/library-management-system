const pool = require('../config/database');

// Search users by email or name (staff only)
exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchTerm = `%${query.trim()}%`;
    const [users] = await pool.execute(
      `SELECT id, uid, email, display_name, role, created_at 
       FROM users 
       WHERE email LIKE ? OR display_name LIKE ? OR uid LIKE ?
       ORDER BY display_name ASC
       LIMIT 20`,
      [searchTerm, searchTerm, searchTerm]
    );

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
};

// Get user by ID (staff only)
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await pool.execute(
      `SELECT id, uid, email, display_name, role, created_at 
       FROM users 
       WHERE id = ?`,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// Assign book to user (staff only)
exports.assignBook = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { user_id, book_id, loan_period_days } = req.body;

    if (!user_id || !book_id) {
      return res.status(400).json({ error: 'User ID and Book ID are required' });
    }

    // Verify user exists
    const [users] = await connection.execute(
      'SELECT id, email, display_name FROM users WHERE id = ?',
      [user_id]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify book exists and is available
    const [books] = await connection.execute(
      'SELECT * FROM books WHERE id = ?',
      [book_id]
    );

    if (books.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Book not found' });
    }

    const book = books[0];

    if (book.available_copies <= 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Book is not available. No copies available.' });
    }

    // Check if user already has this book on loan
    const [existingLoans] = await connection.execute(
      'SELECT * FROM loans WHERE user_id = ? AND book_id = ? AND status = "active"',
      [user_id, book_id]
    );

    if (existingLoans.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'User already has this book on loan' });
    }

    // Cancel any existing reservations/holds for this user on this book
    const [existingHolds] = await connection.execute(
      'SELECT * FROM holds WHERE user_id = ? AND book_id = ? AND status IN ("pending", "available")',
      [user_id, book_id]
    );

    if (existingHolds.length > 0) {
      await connection.execute(
        'UPDATE holds SET status = "cancelled" WHERE user_id = ? AND book_id = ? AND status IN ("pending", "available")',
        [user_id, book_id]
      );
      console.log(`Cancelled ${existingHolds.length} reservation(s) for user ${user_id} on book ${book_id}`);
    }

    // Calculate dates - use policy if loan_period_days not specified
    const loanPolicyService = require('../services/loanPolicyService');
    const policy = await loanPolicyService.getCurrentPolicy();
    const loanDate = new Date();
    const dueDate = new Date();
    const loanPeriod = loan_period_days ? parseInt(loan_period_days) : policy.loan_period_days;
    dueDate.setDate(dueDate.getDate() + loanPeriod);

    // Get staff member ID who is assigning the book
    const staffId = req.user.id;

    // Create loan with staff tracking
    const [result] = await connection.execute(
      'INSERT INTO loans (user_id, book_id, loan_date, due_date, status, assigned_by_staff_id) VALUES (?, ?, ?, ?, ?, ?)',
      [user_id, book_id, loanDate, dueDate, 'active', staffId]
    );

    // Decrease available copies
    await connection.execute(
      'UPDATE books SET available_copies = available_copies - 1 WHERE id = ?',
      [book_id]
    );

    // Get loan with book and user details
    const [newLoan] = await connection.execute(
      `SELECT l.*, b.title, b.author, b.isbn, u.email, u.display_name as user_name
       FROM loans l 
       JOIN books b ON l.book_id = b.id 
       JOIN users u ON l.user_id = u.id
       WHERE l.id = ?`,
      [result.insertId]
    );

    await connection.commit();
    res.status(201).json(newLoan[0]);
  } catch (error) {
    await connection.rollback();
    console.error('Assign book error:', error);
    res.status(500).json({ error: 'Failed to assign book' });
  } finally {
    connection.release();
  }
};

// Get all active loans (staff only)
exports.getAllActiveLoans = async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT l.*, 
             b.title, b.author, b.isbn,
             u.email, u.display_name as user_name, u.id as user_id
      FROM loans l
      JOIN books b ON l.book_id = b.id
      JOIN users u ON l.user_id = u.id
    `;

    const params = [];
    if (status) {
      query += ' WHERE l.status = ?';
      params.push(status);
    } else {
      query += ' WHERE l.status = "active"';
    }

    query += ' ORDER BY l.loan_date DESC';

    const [loans] = await pool.execute(query, params);
    res.json({ loans });
  } catch (error) {
    console.error('Get all loans error:', error);
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
};

// Process return (staff only) - with condition and fine calculation
exports.processReturn = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { return_condition, return_notes } = req.body;

    // Get loan with book details
    const [loans] = await connection.execute(
      `SELECT l.*, b.title, b.available_copies
       FROM loans l
       JOIN books b ON l.book_id = b.id
       WHERE l.id = ?`,
      [id]
    );

    if (loans.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loan = loans[0];

    if (loan.status === 'returned') {
      await connection.rollback();
      return res.status(400).json({ error: 'Book already returned' });
    }

    const returnDate = new Date();
    const dueDate = new Date(loan.due_date);
    const isOverdue = returnDate > dueDate;
    let daysOverdue = 0;
    let fineAmount = 0;

    const fineService = require('../services/fineService');
    if (isOverdue) {
      daysOverdue = fineService.calculateDaysOverdue(loan.due_date);
      fineAmount = await fineService.calculateFineAmount(daysOverdue);
    }

    // Update loan
    const updateFields = ['return_date = ?', 'status = ?'];
    const updateParams = [returnDate, 'returned'];

    if (return_condition) {
      updateFields.push('return_condition = ?');
      updateParams.push(return_condition);
    }

    if (return_notes) {
      updateFields.push('return_notes = ?');
      updateParams.push(return_notes);
    }

    // Get staff member ID who is processing the return
    const staffId = req.user.id;
    
    updateFields.push('returned_by_staff_id = ?');
    updateParams.push(staffId);
    updateParams.push(id);

    await connection.execute(
      `UPDATE loans SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );

    // Increase available copies
    await connection.execute(
      'UPDATE books SET available_copies = available_copies + 1 WHERE id = ?',
      [loan.book_id]
    );

    // Create fine if overdue
    let fineId = null;
    if (fineAmount > 0) {
      const [fineResult] = await connection.execute(
        `INSERT INTO fines (user_id, loan_id, amount, type, status, description) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          loan.user_id,
          loan.id,
          fineAmount,
          'overdue',
          'pending',
          `Overdue fine for "${loan.title}". ${daysOverdue} day(s) overdue.`
        ]
      );
      fineId = fineResult.insertId;
    }

    // Check for pending holds on this book and assign to first in queue
    const [pendingHolds] = await connection.execute(
      `SELECT h.*, u.email, u.display_name
       FROM holds h
       JOIN users u ON h.user_id = u.id
       WHERE h.book_id = ? AND h.status = 'pending'
       ORDER BY h.hold_date ASC
       LIMIT 1`,
      [loan.book_id]
    );

    let holdAssigned = false;
    if (pendingHolds.length > 0 && loan.available_copies > 0) {
      const hold = pendingHolds[0];
      // Update hold to available and set expiry datetime (48 hours from now)
      const expiryDatetime = new Date();
      expiryDatetime.setHours(expiryDatetime.getHours() + 48);

      await connection.execute(
        `UPDATE holds 
         SET status = 'available', expiry_datetime = ?
         WHERE id = ?`,
        [expiryDatetime, hold.id]
      );

      // Decrease available copies (book assigned to hold)
      await connection.execute(
        'UPDATE books SET available_copies = available_copies - 1 WHERE id = ?',
        [loan.book_id]
      );

      holdAssigned = true;
    }

    await connection.commit();

    res.json({
      message: 'Book returned successfully',
      return_date: returnDate,
      fine_incurred: fineAmount > 0,
      fine_amount: fineAmount,
      days_overdue: daysOverdue,
      hold_assigned: holdAssigned,
      return_condition: return_condition || null,
      return_notes: return_notes || null
    });
  } catch (error) {
    await connection.rollback();
    console.error('Process return error:', error);
    res.status(500).json({ error: 'Failed to process return' });
  } finally {
    connection.release();
  }
};

// Get loan by ID (staff only)
exports.getLoanById = async (req, res) => {
  try {
    const { id } = req.params;

    const [loans] = await pool.execute(
      `SELECT l.*, 
       b.title, b.author, b.isbn, b.available_copies,
       u.email, u.display_name as user_name, u.id as user_id
       FROM loans l
       JOIN books b ON l.book_id = b.id
       JOIN users u ON l.user_id = u.id
       WHERE l.id = ?`,
      [id]
    );

    if (loans.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    res.json(loans[0]);
  } catch (error) {
    console.error('Get loan error:', error);
    res.status(500).json({ error: 'Failed to fetch loan' });
  }
};

