const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function addReviewsMigration() {
  let connection;
  try {
    console.log('Creating reviews and ratings system...\n');

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'library_system'
    });

    console.log('Connected to database\n');

    // Create reviews table
    console.log('Creating reviews table...');
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS reviews (
          id INT AUTO_INCREMENT PRIMARY KEY,
          book_id INT NOT NULL,
          user_id INT NOT NULL,
          rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
          review_text TEXT,
          status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY unique_user_book_review (user_id, book_id),
          INDEX idx_book_id (book_id),
          INDEX idx_user_id (user_id),
          INDEX idx_status (status),
          INDEX idx_rating (rating)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✓ Reviews table created\n');
    } catch (error) {
      if (error.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('✓ Reviews table already exists\n');
      } else {
        throw error;
      }
    }

    // Add average_rating column to books table
    console.log('Adding average_rating column to books table...');
    try {
      await connection.execute(`
        ALTER TABLE books
        ADD COLUMN average_rating DECIMAL(3, 2) DEFAULT NULL,
        ADD COLUMN total_reviews INT DEFAULT 0
      `);
      console.log('✓ average_rating and total_reviews columns added\n');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('✓ Rating columns already exist\n');
      } else {
        throw error;
      }
    }

    console.log('✓ Migration completed successfully!\n');
    await connection.end();
  } catch (error) {
    console.error('Migration error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

addReviewsMigration();



