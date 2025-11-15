const pool = require('../config/database');

// Get all loans for a user
exports.getUserLoans = async (req, res) => {
  try {
    const userId = req.user.id;

    const [loans] = await pool.execute(
      `SELECT l.*, b.title, b.author, b.isbn 
       FROM loans l 
       JOIN books b ON l.book_id = b.id 
       WHERE l.user_id = ? 
       ORDER BY l.loan_date DESC`,
      [userId]
    );

    res.json(loans);
  } catch (error) {
    console.error('Get loans error:', error);
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
};

// Get loan by ID
exports.getLoanById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [loans] = await pool.execute(
      `SELECT l.*, b.title, b.author, b.isbn 
       FROM loans l 
       JOIN books b ON l.book_id = b.id 
       WHERE l.id = ? AND l.user_id = ?`,
      [id, userId]
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

// Create loan (borrow book)
exports.createLoan = async (req, res) => {
  try {
    const { book_id } = req.body;
    const userId = req.user.id;

    if (!book_id) {
      return res.status(400).json({ error: 'Book ID is required' });
    }

    // Check if book is available
    const [books] = await pool.execute(
      'SELECT * FROM books WHERE id = ?',
      [book_id]
    );

    if (books.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    if (books[0].available_copies <= 0) {
      return res.status(400).json({ error: 'Book is not available' });
    }

    // Check if user already has this book on loan
    const [existingLoans] = await pool.execute(
      'SELECT * FROM loans WHERE user_id = ? AND book_id = ? AND status = "active"',
      [userId, book_id]
    );

    if (existingLoans.length > 0) {
      return res.status(400).json({ error: 'You already have this book on loan' });
    }

    // Calculate dates
    const loanDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14); // 14 days loan period

    // Create loan
    const [result] = await pool.execute(
      'INSERT INTO loans (user_id, book_id, loan_date, due_date, status) VALUES (?, ?, ?, ?, ?)',
      [userId, book_id, loanDate, dueDate, 'active']
    );

    // Decrease available copies
    await pool.execute(
      'UPDATE books SET available_copies = available_copies - 1 WHERE id = ?',
      [book_id]
    );

    // Get loan with book details
    const [newLoan] = await pool.execute(
      `SELECT l.*, b.title, b.author, b.isbn 
       FROM loans l 
       JOIN books b ON l.book_id = b.id 
       WHERE l.id = ?`,
      [result.insertId]
    );

    res.status(201).json(newLoan[0]);
  } catch (error) {
    console.error('Create loan error:', error);
    res.status(500).json({ error: 'Failed to create loan' });
  }
};

// Return book
exports.returnLoan = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get loan
    const [loans] = await pool.execute(
      'SELECT * FROM loans WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (loans.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loan = loans[0];

    if (loan.status === 'returned') {
      return res.status(400).json({ error: 'Book already returned' });
    }

    // Update loan
    await pool.execute(
      'UPDATE loans SET return_date = ?, status = ? WHERE id = ?',
      [new Date(), 'returned', id]
    );

    // Increase available copies
    await pool.execute(
      'UPDATE books SET available_copies = available_copies + 1 WHERE id = ?',
      [loan.book_id]
    );

    res.json({ message: 'Book returned successfully' });
  } catch (error) {
    console.error('Return loan error:', error);
    res.status(500).json({ error: 'Failed to return book' });
  }
};

