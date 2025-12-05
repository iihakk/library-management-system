const pool = require('../config/database');

async function addLoanConditionField() {
  try {
    console.log('Checking and adding condition fields to loans table...');
    
    // Check if columns exist
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'loans' 
      AND COLUMN_NAME IN ('return_condition', 'return_notes')
    `);
    
    const existingColumns = columns.map(col => col.COLUMN_NAME);
    
    // Add return_condition if it doesn't exist
    if (!existingColumns.includes('return_condition')) {
      await pool.execute(`
        ALTER TABLE loans 
        ADD COLUMN return_condition ENUM('excellent', 'good', 'fair', 'poor', 'damaged') NULL
      `);
      console.log('✓ Added return_condition field');
    } else {
      console.log('✓ return_condition field already exists');
    }
    
    // Add return_notes if it doesn't exist
    if (!existingColumns.includes('return_notes')) {
      await pool.execute(`
        ALTER TABLE loans 
        ADD COLUMN return_notes TEXT NULL
      `);
      console.log('✓ Added return_notes field');
    } else {
      console.log('✓ return_notes field already exists');
    }
    
    console.log('✓ Successfully completed migration');
    process.exit(0);
  } catch (error) {
    console.error('Error adding condition field:', error);
    process.exit(1);
  }
}

addLoanConditionField();

