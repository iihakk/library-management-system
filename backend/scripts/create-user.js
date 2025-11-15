const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function createUser() {
  const email = 'iihak@aucegypt.edu';
  const password = '132547698';
  const displayName = 'Abdulaziz Al-Haidary';
  const uid = `user_${Date.now()}`;

  try {
    // Hash the password with 10 salt rounds (same as backend)
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');

    // Connect to database
    console.log('Connecting to database...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '12345',
      database: process.env.DB_NAME || 'library_system'
    });
    console.log('Connected to database');

    // Check if user already exists
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
      console.log('User password updated successfully!');
    } else {
      // Insert new user
      console.log('Creating new user...');
      const [result] = await connection.execute(
        'INSERT INTO users (uid, email, password, display_name, email_verified) VALUES (?, ?, ?, ?, ?)',
        [uid, email, hashedPassword, displayName, true]
      );
      console.log('User created successfully!');
      console.log('User ID:', result.insertId);
    }

    // Fetch and display the user
    const [users] = await connection.execute(
      'SELECT id, uid, email, display_name, email_verified, created_at FROM users WHERE email = ?',
      [email]
    );

    console.log('\n=== User Details ===');
    console.log('ID:', users[0].id);
    console.log('UID:', users[0].uid);
    console.log('Email:', users[0].email);
    console.log('Display Name:', users[0].display_name);
    console.log('Email Verified:', users[0].email_verified);
    console.log('Created At:', users[0].created_at);
    console.log('\n=== Login Credentials ===');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('======================\n');

    await connection.end();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createUser();
