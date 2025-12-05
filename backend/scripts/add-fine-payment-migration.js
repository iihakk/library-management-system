const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function addFinePaymentMigration() {
  let connection;
  try {
    console.log('Adding fine payment tracking fields...\n');

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'library_system'
    });

    console.log('Connected to database\n');

    // Add paid_at column to fines table
    console.log('Adding paid_at column to fines table...');
    try {
      await connection.execute(`
        ALTER TABLE fines
        ADD COLUMN paid_at TIMESTAMP NULL DEFAULT NULL
        AFTER status
      `);
      console.log('✓ paid_at column added\n');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('✓ paid_at column already exists\n');
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

addFinePaymentMigration();

