const pool = require('../config/database');

async function addBookLinkField() {
  try {
    console.log('Adding download_link field to books table...');
    
    // Check if column already exists
    const [columns] = await pool.execute(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'books' 
       AND COLUMN_NAME = 'download_link'`
    );

    if (columns.length > 0) {
      console.log('download_link column already exists. Skipping...');
      return;
    }

    // Add download_link column
    await pool.execute(
      `ALTER TABLE books 
       ADD COLUMN download_link VARCHAR(500) NULL 
       AFTER book_type`
    );

    console.log('✅ Successfully added download_link field to books table');
  } catch (error) {
    console.error('❌ Error adding download_link field:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

addBookLinkField();



