const pool = require('../config/database');

async function addStaffTrackingFields() {
  try {
    console.log('Checking and adding staff tracking fields to loans table...');
    
    // Check if columns exist
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'loans' 
      AND COLUMN_NAME IN ('assigned_by_staff_id', 'returned_by_staff_id')
    `);
    
    const existingColumns = columns.map(col => col.COLUMN_NAME);
    
    // Add assigned_by_staff_id if it doesn't exist
    if (!existingColumns.includes('assigned_by_staff_id')) {
      await pool.execute(`
        ALTER TABLE loans 
        ADD COLUMN assigned_by_staff_id INT NULL,
        ADD FOREIGN KEY (assigned_by_staff_id) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('✓ Added assigned_by_staff_id field');
    } else {
      console.log('✓ assigned_by_staff_id field already exists');
    }
    
    // Add returned_by_staff_id if it doesn't exist
    if (!existingColumns.includes('returned_by_staff_id')) {
      await pool.execute(`
        ALTER TABLE loans 
        ADD COLUMN returned_by_staff_id INT NULL,
        ADD FOREIGN KEY (returned_by_staff_id) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('✓ Added returned_by_staff_id field');
    } else {
      console.log('✓ returned_by_staff_id field already exists');
    }
    
    console.log('✓ Successfully completed migration');
    process.exit(0);
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_DUP_KEYNAME') {
      console.log('✓ Fields already exist in loans table');
      process.exit(0);
    } else {
      console.error('Error adding staff tracking fields:', error);
      process.exit(1);
    }
  }
}

addStaffTrackingFields();

