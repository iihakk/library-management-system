const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'library_system',
      multipleStatements: true
    });

    console.log('Connected to database. Running email verification migration...');

    // Create email_verification_codes table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS email_verification_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_email (email),
        INDEX idx_code (code),
        INDEX idx_expires_at (expires_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Add university_id column to users table if it doesn't exist
    try {
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN university_id VARCHAR(50) NULL AFTER email,
        ADD INDEX idx_university_id (university_id);
      `);
      console.log('✓ Added university_id column to users table');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('✓ university_id column already exists');
      } else {
        throw error;
      }
    }

    console.log('✓ Email verification migration completed successfully!');
    
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();

