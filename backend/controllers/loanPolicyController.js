const pool = require('../config/database');

// Get current active loan policy
exports.getLoanPolicy = async (req, res) => {
  try {
    const [policies] = await pool.execute(
      'SELECT * FROM loan_policies WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1'
    );

    if (policies.length === 0) {
      // Return default policy if none exists
      return res.json({
        id: null,
        loan_period_days: 14,
        max_loans_per_user: 5,
        max_renewals_per_loan: 1,
        fine_rate_per_day: 5.00,
        grace_period_days: 0,
        is_active: true
      });
    }

    res.json(policies[0]);
  } catch (error) {
    console.error('Get loan policy error:', error);
    res.status(500).json({ error: 'Failed to fetch loan policy' });
  }
};

// Update loan policy (creates new active policy and deactivates old ones)
exports.updateLoanPolicy = async (req, res) => {
  try {
    const { loan_period_days, max_loans_per_user, max_renewals_per_loan, fine_rate_per_day, grace_period_days } = req.body;
    const adminId = req.user.id;

    // Validation
    if (loan_period_days !== undefined && (loan_period_days < 1 || loan_period_days > 365)) {
      return res.status(400).json({ error: 'Loan period must be between 1 and 365 days' });
    }

    if (max_loans_per_user !== undefined && (max_loans_per_user < 1 || max_loans_per_user > 50)) {
      return res.status(400).json({ error: 'Max loans per user must be between 1 and 50' });
    }

    if (max_renewals_per_loan !== undefined && (max_renewals_per_loan < 0 || max_renewals_per_loan > 10)) {
      return res.status(400).json({ error: 'Max renewals per loan must be between 0 and 10' });
    }

    if (fine_rate_per_day !== undefined && (fine_rate_per_day < 0 || fine_rate_per_day > 100)) {
      return res.status(400).json({ error: 'Fine rate per day must be between 0 and 100' });
    }

    if (grace_period_days !== undefined && (grace_period_days < 0 || grace_period_days > 30)) {
      return res.status(400).json({ error: 'Grace period must be between 0 and 30 days' });
    }

    // Get current active policy
    const [currentPolicies] = await pool.execute(
      'SELECT * FROM loan_policies WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1'
    );

    let currentPolicy = null;
    if (currentPolicies.length > 0) {
      currentPolicy = currentPolicies[0];
    }

    // Deactivate all existing policies
    await pool.execute(
      'UPDATE loan_policies SET is_active = FALSE WHERE is_active = TRUE'
    );

    // Create new active policy with updated values
    const newPolicy = {
      loan_period_days: loan_period_days !== undefined ? parseInt(loan_period_days) : (currentPolicy?.loan_period_days || 14),
      max_loans_per_user: max_loans_per_user !== undefined ? parseInt(max_loans_per_user) : (currentPolicy?.max_loans_per_user || 5),
      max_renewals_per_loan: max_renewals_per_loan !== undefined ? parseInt(max_renewals_per_loan) : (currentPolicy?.max_renewals_per_loan || 1),
      fine_rate_per_day: fine_rate_per_day !== undefined ? parseFloat(fine_rate_per_day) : (currentPolicy?.fine_rate_per_day || 5.00),
      grace_period_days: grace_period_days !== undefined ? parseInt(grace_period_days) : (currentPolicy?.grace_period_days || 0),
      is_active: true
    };

    const [result] = await pool.execute(
      `INSERT INTO loan_policies 
       (loan_period_days, max_loans_per_user, max_renewals_per_loan, fine_rate_per_day, grace_period_days, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        newPolicy.loan_period_days,
        newPolicy.max_loans_per_user,
        newPolicy.max_renewals_per_loan,
        newPolicy.fine_rate_per_day,
        newPolicy.grace_period_days,
        newPolicy.is_active
      ]
    );

    // Log admin action
    try {
      await pool.execute(
        'INSERT INTO audit_log (admin_id, action_type, entity_type, entity_id, old_values, new_values, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          adminId,
          'loan_policy_updated',
          'policy',
          result.insertId,
          currentPolicy ? JSON.stringify(currentPolicy) : null,
          JSON.stringify(newPolicy),
          `Updated loan policy: ${newPolicy.loan_period_days} days, max ${newPolicy.max_loans_per_user} loans, ${newPolicy.max_renewals_per_loan} renewals, ${newPolicy.fine_rate_per_day} EGP/day fine`
        ]
      );
    } catch (logError) {
      console.error('Failed to log admin action:', logError);
    }

    // Clear cache so new policy is used immediately
    loanPolicyService.clearCache();

    const [newPolicyRecord] = await pool.execute(
      'SELECT * FROM loan_policies WHERE id = ?',
      [result.insertId]
    );

    res.json({
      message: 'Loan policy updated successfully',
      policy: newPolicyRecord[0]
    });
  } catch (error) {
    console.error('Update loan policy error:', error);
    res.status(500).json({ error: 'Failed to update loan policy' });
  }
};

