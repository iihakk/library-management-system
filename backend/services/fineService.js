const pool = require('../config/database');
const loanPolicyService = require('./loanPolicyService');

// Calculate fine amount for overdue days (uses current policy)
const calculateFineAmount = async (daysOverdue) => {
  const policy = await loanPolicyService.getCurrentPolicy();
  const gracePeriod = policy.grace_period_days || 0;
  
  // Don't charge fine if within grace period
  if (daysOverdue <= gracePeriod) {
    return 0;
  }
  
  // Calculate fine for days beyond grace period
  const chargeableDays = daysOverdue - gracePeriod;
  return chargeableDays * policy.fine_rate_per_day;
};

// Calculate days overdue
const calculateDaysOverdue = (dueDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  if (today <= due) {
    return 0;
  }
  
  const diffTime = today - due;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Check and create fines for overdue loans
exports.checkAndCreateOverdueFines = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all active overdue loans without existing pending fines
    const [overdueLoans] = await pool.execute(
      `SELECT l.*, b.title as book_title
       FROM loans l
       JOIN books b ON l.book_id = b.id
       WHERE l.status = 'active'
       AND l.due_date < ?
       AND NOT EXISTS (
         SELECT 1 FROM fines f
         WHERE f.loan_id = l.id
         AND f.status = 'pending'
         AND f.type = 'overdue'
       )`,
      [today]
    );

    const finesCreated = [];

    for (const loan of overdueLoans) {
      const daysOverdue = calculateDaysOverdue(loan.due_date);
      const fineAmount = await calculateFineAmount(daysOverdue);

      if (fineAmount > 0) {
        const [result] = await pool.execute(
          `INSERT INTO fines (user_id, loan_id, amount, type, status, description)
           VALUES (?, ?, ?, 'overdue', 'pending', ?)`,
          [
            loan.user_id,
            loan.id,
            fineAmount,
            `Overdue fine for "${loan.book_title}". ${daysOverdue} day(s) overdue.`
          ]
        );

        // Update loan status to overdue if not already
        await pool.execute(
          'UPDATE loans SET status = ? WHERE id = ? AND status != ?',
          ['overdue', loan.id, 'overdue']
        );

        finesCreated.push({
          id: result.insertId,
          loan_id: loan.id,
          user_id: loan.user_id,
          amount: fineAmount,
          daysOverdue
        });
      }
    }

    return finesCreated;
  } catch (error) {
    console.error('Error checking overdue fines:', error);
    throw error;
  }
};

// Calculate fine for a specific loan
exports.calculateLoanFine = async (loan) => {
  if (loan.status === 'returned') {
    return { daysOverdue: 0, amount: 0 };
  }

  const daysOverdue = calculateDaysOverdue(loan.due_date);
  const amount = await calculateFineAmount(daysOverdue);

  return { daysOverdue, amount };
};

// Get total pending fines for a user
exports.getUserTotalPendingFines = async (userId) => {
  try {
    const [result] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM fines
       WHERE user_id = ? AND status = 'pending'`,
      [userId]
    );

    return parseFloat(result[0].total || 0);
  } catch (error) {
    console.error('Error getting user total fines:', error);
    return 0;
  }
};

module.exports = {
  calculateFineAmount: async (daysOverdue) => await calculateFineAmount(daysOverdue),
  calculateDaysOverdue,
  checkAndCreateOverdueFines: exports.checkAndCreateOverdueFines,
  calculateLoanFine: exports.calculateLoanFine,
  getUserTotalPendingFines: exports.getUserTotalPendingFines
};

