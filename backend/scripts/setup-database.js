const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function setupDatabase() {
  const email = 'iihak@aucegypt.edu';
  const password = '132547698';
  const displayName = 'Abdulaziz Al-Haidary';
  const uid = `user_${Date.now()}`;

  try {
    console.log('=== Database Setup Started ===\n');

    // Connect to MySQL (without database)
    console.log('Connecting to MySQL server...');
    const connectionConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root'
    };

    // Only add password if it's set
    if (process.env.DB_PASSWORD) {
      connectionConfig.password = process.env.DB_PASSWORD;
    }

    const connection = await mysql.createConnection(connectionConfig);
    console.log('✓ Connected to MySQL server\n');

    // Create database if it doesn't exist
    console.log('Creating database if not exists...');
    await connection.query('CREATE DATABASE IF NOT EXISTS library_system');
    console.log('✓ Database "library_system" ready\n');

    // Switch to the database
    await connection.query('USE library_system');

    // Create users table
    console.log('Creating users table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uid VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_uid (uid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Users table ready\n');

    // Create books table
    console.log('Creating books table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS books (
        id INT AUTO_INCREMENT PRIMARY KEY,
        isbn VARCHAR(20) UNIQUE,
        title VARCHAR(500) NOT NULL,
        author VARCHAR(255) NOT NULL,
        publisher VARCHAR(255),
        publication_year INT,
        category VARCHAR(100),
        description TEXT,
        total_copies INT DEFAULT 1,
        available_copies INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_title (title),
        INDEX idx_author (author),
        INDEX idx_category (category),
        INDEX idx_isbn (isbn)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Books table ready\n');

    // Create loans table
    console.log('Creating loans table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS loans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        book_id INT NOT NULL,
        loan_date DATE NOT NULL,
        due_date DATE NOT NULL,
        return_date DATE NULL,
        status ENUM('active', 'returned', 'overdue') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_book_id (book_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Loans table ready\n');

    // Create holds table
    console.log('Creating holds table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS holds (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        book_id INT NOT NULL,
        hold_date DATE NOT NULL,
        expiry_date DATE,
        status ENUM('pending', 'available', 'cancelled', 'expired') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_book_id (book_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Holds table ready\n');

    // Hash password
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('✓ Password hashed\n');

    // Check if user exists
    const [existingUsers] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      console.log('User already exists! Updating password...');
      await connection.execute(
        'UPDATE users SET password = ?, display_name = ?, updated_at = NOW() WHERE email = ?',
        [hashedPassword, displayName, email]
      );
      console.log('✓ User password updated\n');
    } else {
      console.log('Creating new user...');
      await connection.execute(
        'INSERT INTO users (uid, email, password, display_name, email_verified) VALUES (?, ?, ?, ?, ?)',
        [uid, email, hashedPassword, displayName, true]
      );
      console.log('✓ User created\n');
    }

    // Fetch user details
    const [users] = await connection.execute(
      'SELECT id, uid, email, display_name, email_verified, created_at FROM users WHERE email = ?',
      [email]
    );

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('           USER ACCOUNT CREATED              ');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('User ID:        ', users[0].id);
    console.log('UID:            ', users[0].uid);
    console.log('Email:          ', users[0].email);
    console.log('Display Name:   ', users[0].display_name);
    console.log('Email Verified: ', users[0].email_verified ? 'Yes' : 'No');
    console.log('Created At:     ', users[0].created_at);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('         LOGIN CREDENTIALS (SAVE THESE)      ');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:    ', email);
    console.log('Password: ', password);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await connection.end();
    console.log('=== Database Setup Completed Successfully ===\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\nPlease check your MySQL credentials in backend/.env');
      console.error('Current settings:');
      console.error('  DB_HOST:', process.env.DB_HOST || 'localhost');
      console.error('  DB_USER:', process.env.DB_USER || 'root');
      console.error('  DB_PASSWORD: [hidden]');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\nMySQL server is not running. Please start MySQL and try again.');
    }
    process.exit(1);
  }
}

setupDatabase();
