const pool = require('../config/database');
const fineService = require('../services/fineService');

// Get all fines for a user
exports.getUserFines = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check and create fines for overdue loans before fetching
    await fineService.checkAndCreateOverdueFines();

    const [fines] = await pool.execute(
      `SELECT f.*, 
       COALESCE(hb.title, lb.title) as book_title,
       COALESCE(hb.author, lb.author) as book_author,
       l.due_date as loan_due_date,
       l.status as loan_status
       FROM fines f
       LEFT JOIN holds h ON f.hold_id = h.id
       LEFT JOIN books hb ON h.book_id = hb.id
       LEFT JOIN loans l ON f.loan_id = l.id
       LEFT JOIN books lb ON l.book_id = lb.id
       WHERE f.user_id = ? 
       ORDER BY f.created_at DESC`,
      [userId]
    );

    const totalPending = await fineService.getUserTotalPendingFines(userId);

    res.json({ fines, totalPending });
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
       COALESCE(hb.title, lb.title) as book_title,
       COALESCE(hb.author, lb.author) as book_author,
       l.due_date as loan_due_date,
       l.status as loan_status
       FROM fines f
       LEFT JOIN holds h ON f.hold_id = h.id
       LEFT JOIN books hb ON h.book_id = hb.id
       LEFT JOIN loans l ON f.loan_id = l.id
       LEFT JOIN books lb ON l.book_id = lb.id
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

// Pay fine
exports.payFine = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [fines] = await pool.execute(
      'SELECT * FROM fines WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (fines.length === 0) {
      return res.status(404).json({ error: 'Fine not found' });
    }

    const fine = fines[0];

    if (fine.status === 'paid') {
      return res.status(400).json({ error: 'Fine has already been paid' });
    }

    if (fine.status === 'waived') {
      return res.status(400).json({ error: 'Fine has been waived and cannot be paid' });
    }

    await pool.execute(
      `UPDATE fines 
       SET status = 'paid', paid_at = NOW() 
       WHERE id = ?`,
      [id]
    );

    const [updatedFine] = await pool.execute(
      `SELECT f.*, 
       COALESCE(hb.title, lb.title) as book_title
       FROM fines f
       LEFT JOIN holds h ON f.hold_id = h.id
       LEFT JOIN books hb ON h.book_id = hb.id
       LEFT JOIN loans l ON f.loan_id = l.id
       LEFT JOIN books lb ON l.book_id = lb.id
       WHERE f.id = ?`,
      [id]
    );

    res.json({ 
      message: 'Fine paid successfully',
      fine: updatedFine[0]
    });
  } catch (error) {
    console.error('Pay fine error:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
};

// Get fine history (all fines including paid)
exports.getFineHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, type } = req.query;

    let query = `
      SELECT f.*, 
       COALESCE(hb.title, lb.title) as book_title,
       COALESCE(hb.author, lb.author) as book_author,
       l.due_date as loan_due_date,
       l.status as loan_status
       FROM fines f
       LEFT JOIN holds h ON f.hold_id = h.id
       LEFT JOIN books hb ON h.book_id = hb.id
       LEFT JOIN loans l ON f.loan_id = l.id
       LEFT JOIN books lb ON l.book_id = lb.id
       WHERE f.user_id = ?
    `;
    const params = [userId];

    if (status) {
      query += ' AND f.status = ?';
      params.push(status);
    }

    if (type) {
      query += ' AND f.type = ?';
      params.push(type);
    }

    query += ' ORDER BY f.created_at DESC';

    const [fines] = await pool.execute(query, params);

    const stats = {
      total: fines.length,
      pending: fines.filter(f => f.status === 'pending').length,
      paid: fines.filter(f => f.status === 'paid').length,
      waived: fines.filter(f => f.status === 'waived').length,
      totalAmount: fines.reduce((sum, f) => sum + parseFloat(f.amount), 0),
      paidAmount: fines.filter(f => f.status === 'paid').reduce((sum, f) => sum + parseFloat(f.amount), 0),
      pendingAmount: fines.filter(f => f.status === 'pending').reduce((sum, f) => sum + parseFloat(f.amount), 0)
    };

    res.json({ fines, stats });
  } catch (error) {
    console.error('Get fine history error:', error);
    res.status(500).json({ error: 'Failed to fetch fine history' });
  }
};

