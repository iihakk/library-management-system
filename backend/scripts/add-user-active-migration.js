const pool = require('../config/database');

async function addUserActiveColumn() {
  try {
    console.log('Adding is_active column to users table...');
    
    // Check if column already exists
    const [columns] = await pool.execute(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'users' 
       AND COLUMN_NAME = 'is_active'`
    );

    if (columns.length > 0) {
      console.log('Column is_active already exists. Skipping migration.');
      process.exit(0);
    }

    // Add is_active column
    await pool.execute(
      `ALTER TABLE users 
       ADD COLUMN is_active BOOLEAN DEFAULT TRUE AFTER role`
    );

    // Set all existing users as active
    await pool.execute(
      `UPDATE users SET is_active = TRUE WHERE is_active IS NULL`
    );

    console.log('Successfully added is_active column to users table.');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

addUserActiveColumn();

