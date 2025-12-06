const pool = require('../config/database');
const fineService = require('../services/fineService');

// Get all loans for a user
exports.getUserLoans = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check and create fines for overdue loans
    await fineService.checkAndCreateOverdueFines();

    const [loans] = await pool.execute(
      `SELECT l.*, b.title, b.author, b.isbn 
       FROM loans l 
       JOIN books b ON l.book_id = b.id 
       WHERE l.user_id = ? 
       ORDER BY l.loan_date DESC`,
      [userId]
    );

    // Add fine information to each loan
    const loansWithFines = await Promise.all(loans.map(async (loan) => {
      const fineInfo = await fineService.calculateLoanFine(loan);
      
      // Get existing pending fine for this loan
      const [existingFines] = await pool.execute(
        'SELECT id, amount, status FROM fines WHERE loan_id = ? AND status = "pending" AND type = "overdue"',
        [loan.id]
      );

      return {
        ...loan,
        daysOverdue: fineInfo.daysOverdue,
        estimatedFine: fineInfo.amount,
        hasPendingFine: existingFines.length > 0,
        fineId: existingFines.length > 0 ? existingFines[0].id : null
      };
    }));

    res.json(loansWithFines);
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
    const userRole = req.user.role;

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

    const book = books[0];
    const bookType = book.book_type || 'physical';

    // Regular users can only borrow electronic books directly
    // Physical books must be borrowed through staff
    if (userRole !== 'staff' && userRole !== 'admin') {
      if (bookType === 'physical') {
        return res.status(403).json({ 
          error: 'Physical books must be borrowed through library staff. Please place a reservation instead.' 
        });
      }
      // Allow electronic and both types for regular users
      if (bookType !== 'electronic' && bookType !== 'both') {
        return res.status(403).json({ 
          error: 'This book type cannot be borrowed directly. Please contact library staff.' 
        });
      }
    }

    if (book.available_copies <= 0) {
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

    // Check max loans limit
    const policy = await loanPolicyService.getCurrentPolicy();
    const [userActiveLoans] = await pool.execute(
      'SELECT COUNT(*) as count FROM loans WHERE user_id = ? AND status = "active"',
      [userId]
    );
    
    if (userActiveLoans[0].count >= policy.max_loans_per_user) {
      return res.status(400).json({ 
        error: `Maximum loan limit reached. You can only have ${policy.max_loans_per_user} active loan(s) at a time.` 
      });
    }

    // Calculate dates using current policy
    const loanDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + policy.loan_period_days);

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

// Renew loan
exports.renewLoan = async (req, res) => {
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

    if (loan.status !== 'active') {
      return res.status(400).json({ error: 'Can only renew active loans' });
    }

    // Check if loan is overdue
    const today = new Date();
    const dueDate = new Date(loan.due_date);
    if (today > dueDate) {
      return res.status(400).json({ error: 'Cannot renew overdue books. Please return the book and pay any fines.' });
    }

    // Check max renewals limit
    const policy = await loanPolicyService.getCurrentPolicy();
    const renewalCount = loan.renewal_count || 0;
    
    if (renewalCount >= policy.max_renewals_per_loan) {
      return res.status(400).json({ 
        error: `Maximum renewal limit reached. This loan can only be renewed ${policy.max_renewals_per_loan} time(s).` 
      });
    }

    // Extend due date by current policy loan period
    const newDueDate = new Date(loan.due_date);
    newDueDate.setDate(newDueDate.getDate() + policy.loan_period_days);

    await pool.execute(
      'UPDATE loans SET due_date = ?, renewal_count = ? WHERE id = ?',
      [newDueDate, renewalCount + 1, id]
    );

    // Get updated loan
    const [updatedLoan] = await pool.execute(
      `SELECT l.*, b.title, b.author, b.isbn
       FROM loans l
       JOIN books b ON l.book_id = b.id
       WHERE l.id = ?`,
      [id]
    );

    res.json(updatedLoan[0]);
  } catch (error) {
    console.error('Renew loan error:', error);
    res.status(500).json({ error: 'Failed to renew loan' });
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

