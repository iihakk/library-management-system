const pool = require('../config/database');

async function createLoanPoliciesTable() {
  try {
    console.log('Creating loan_policies table...');
    
    // Check if table already exists
    const [tables] = await pool.execute(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = DATABASE() AND table_name = 'loan_policies'`
    );

    if (tables[0].count > 0) {
      console.log('loan_policies table already exists. Skipping migration.');
      process.exit(0);
    }

    // Create loan_policies table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS loan_policies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        loan_period_days INT NOT NULL DEFAULT 14,
        max_loans_per_user INT NOT NULL DEFAULT 5,
        max_renewals_per_loan INT NOT NULL DEFAULT 1,
        fine_rate_per_day DECIMAL(10, 2) NOT NULL DEFAULT 5.00,
        grace_period_days INT NOT NULL DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Insert default policy
    await pool.execute(`
      INSERT INTO loan_policies 
      (loan_period_days, max_loans_per_user, max_renewals_per_loan, fine_rate_per_day, grace_period_days, is_active)
      VALUES (14, 5, 1, 5.00, 0, TRUE)
    `);

    console.log('Successfully created loan_policies table with default policy.');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

createLoanPoliciesTable();

