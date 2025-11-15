const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function addRoleColumn() {
  try {
    console.log('=== Adding Role Column Migration ===\n');

    // Connect to database
    console.log('Connecting to database...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '12345',
      database: process.env.DB_NAME || 'library_system'
    });
    console.log('✓ Connected to database\n');

    // Check if role column already exists
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'`,
      [process.env.DB_NAME || 'library_system']
    );

    if (columns.length > 0) {
      console.log('Role column already exists. Skipping migration.\n');
      await connection.end();
      return;
    }

    // Add role column
    console.log('Adding role column to users table...');
    await connection.execute(`
      ALTER TABLE users 
      ADD COLUMN role ENUM('user', 'staff', 'admin') DEFAULT 'user' AFTER email_verified
    `);
    console.log('✓ Role column added\n');

    // Create index on role
    console.log('Creating index on role column...');
    await connection.execute('CREATE INDEX idx_role ON users(role)');
    console.log('✓ Index created\n');

    // Update existing users to have 'user' role
    console.log('Updating existing users to have "user" role...');
    const [updateResult] = await connection.execute(
      "UPDATE users SET role = 'user' WHERE role IS NULL"
    );
    console.log(`✓ Updated ${updateResult.affectedRows} users\n`);

    console.log('✓ Migration completed successfully!\n');
    await connection.end();
  } catch (error) {
    console.error('Migration error:', error.message);
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Role column already exists. Migration skipped.\n');
    } else {
      process.exit(1);
    }
  }
}

addRoleColumn();

