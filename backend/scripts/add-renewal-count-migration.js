const pool = require('../config/database');

async function addRenewalCountColumn() {
  try {
    console.log('Adding renewal_count column to loans table...');
    
    // Check if column already exists
    const [columns] = await pool.execute(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'loans' 
       AND COLUMN_NAME = 'renewal_count'`
    );

    if (columns.length > 0) {
      console.log('Column renewal_count already exists. Skipping migration.');
      process.exit(0);
    }

    // Add renewal_count column
    await pool.execute(
      `ALTER TABLE loans 
       ADD COLUMN renewal_count INT DEFAULT 0 AFTER status`
    );

    // Set all existing loans to 0 renewals
    await pool.execute(
      `UPDATE loans SET renewal_count = 0 WHERE renewal_count IS NULL`
    );

    console.log('Successfully added renewal_count column to loans table.');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

addRenewalCountColumn();

