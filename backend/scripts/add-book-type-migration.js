const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function addBookTypeMigration() {
  try {
    console.log('=== Adding Book Type and Hold Fee Features ===\n');

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '12345',
      database: process.env.DB_NAME || 'library_system'
    });
    console.log('✓ Connected to database\n');

    // 1. Add book_type to books table
    console.log('Adding book_type column to books table...');
    try {
      await connection.execute(`
        ALTER TABLE books 
        ADD COLUMN book_type ENUM('physical', 'electronic', 'both') DEFAULT 'physical' AFTER description
      `);
      console.log('✓ Book type column added\n');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('✓ Book type column already exists\n');
      } else {
        throw error;
      }
    }

    // 2. Update holds table - change expiry_date to DATETIME and add fee fields
    console.log('Updating holds table...');
    try {
      // Check if columns exist
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'holds' AND COLUMN_NAME IN ('expiry_datetime', 'fee_amount', 'fee_applied')
      `, [process.env.DB_NAME || 'library_system']);

      const existingColumns = columns.map(c => c.COLUMN_NAME);

      // Add expiry_datetime if it doesn't exist
      if (!existingColumns.includes('expiry_datetime')) {
        await connection.execute(`
          ALTER TABLE holds 
          ADD COLUMN expiry_datetime DATETIME AFTER expiry_date
        `);
        // Migrate existing expiry_date to expiry_datetime (set to end of day)
        await connection.execute(`
          UPDATE holds 
          SET expiry_datetime = CONCAT(expiry_date, ' 23:59:59') 
          WHERE expiry_date IS NOT NULL AND expiry_datetime IS NULL
        `);
        console.log('✓ Expiry datetime column added\n');
      }

      // Add fee_amount if it doesn't exist
      if (!existingColumns.includes('fee_amount')) {
        await connection.execute(`
          ALTER TABLE holds 
          ADD COLUMN fee_amount DECIMAL(10, 2) DEFAULT 0.00 AFTER expiry_datetime
        `);
        console.log('✓ Fee amount column added\n');
      }

      // Add fee_applied if it doesn't exist
      if (!existingColumns.includes('fee_applied')) {
        await connection.execute(`
          ALTER TABLE holds 
          ADD COLUMN fee_applied BOOLEAN DEFAULT FALSE AFTER fee_amount
        `);
        console.log('✓ Fee applied column added\n');
      }
    } catch (error) {
      console.error('Error updating holds table:', error.message);
    }

    // 3. Create fines table if it doesn't exist
    console.log('Creating fines table...');
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS fines (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          hold_id INT NULL,
          loan_id INT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          type ENUM('hold_expiry', 'overdue', 'damage', 'lost') DEFAULT 'hold_expiry',
          status ENUM('pending', 'paid', 'waived') DEFAULT 'pending',
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (hold_id) REFERENCES holds(id) ON DELETE SET NULL,
          FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE SET NULL,
          INDEX idx_user_id (user_id),
          INDEX idx_status (status),
          INDEX idx_type (type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✓ Fines table created\n');
    } catch (error) {
      if (error.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('✓ Fines table already exists\n');
      } else {
        throw error;
      }
    }

    console.log('✓ Migration completed successfully!\n');
    await connection.end();
  } catch (error) {
    console.error('Migration error:', error.message);
    process.exit(1);
  }
}

addBookTypeMigration();

