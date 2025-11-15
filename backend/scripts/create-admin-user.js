const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const readline = require('readline');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// Create readline interface for secure input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdminUser() {
  // Get admin credentials from environment variables or prompt
  let email = process.env.INITIAL_ADMIN_EMAIL;
  let password = process.env.INITIAL_ADMIN_PASSWORD;
  let displayName = process.env.INITIAL_ADMIN_NAME || 'System Administrator';

  // If not in environment, prompt for credentials
  if (!email) {
    console.log('=== Admin User Setup ===\n');
    console.log('Admin credentials not found in environment variables.');
    console.log('Please provide admin credentials (or set INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD in .env)\n');
    
    email = await question('Admin Email: ');
    if (!email) {
      console.error('Email is required!');
      rl.close();
      process.exit(1);
    }

    // Use readline with hidden input for password (basic security)
    password = await question('Admin Password: ');
    if (!password) {
      console.error('Password is required!');
      rl.close();
      process.exit(1);
    }

    const nameInput = await question(`Display Name [${displayName}]: `);
    if (nameInput) {
      displayName = nameInput;
    }
  }

  const role = 'admin';
  const uid = `admin_${Date.now()}`;

  try {
    console.log('=== Creating Admin User ===\n');

    // Hash the password
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('✓ Password hashed\n');

    // Connect to database
    console.log('Connecting to database...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '12345',
      database: process.env.DB_NAME || 'library_system'
    });
    console.log('✓ Connected to database\n');

    // Check if admin user already exists
    const [existingUsers] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      console.log('Admin user already exists! Updating to admin role...');
      await connection.execute(
        'UPDATE users SET password = ?, display_name = ?, role = ?, updated_at = NOW() WHERE email = ?',
        [hashedPassword, displayName, role, email]
      );
      console.log('✓ Admin user updated\n');
    } else {
      console.log('Creating new admin user...');
      await connection.execute(
        'INSERT INTO users (uid, email, password, display_name, email_verified, role) VALUES (?, ?, ?, ?, ?, ?)',
        [uid, email, hashedPassword, displayName, true, role]
      );
      console.log('✓ Admin user created\n');
    }

    // Fetch and display the admin user
    const [users] = await connection.execute(
      'SELECT id, uid, email, display_name, role, email_verified, created_at FROM users WHERE email = ?',
      [email]
    );

    console.log('=== Admin User Details ===');
    console.log('ID:', users[0].id);
    console.log('UID:', users[0].uid);
    console.log('Email:', users[0].email);
    console.log('Display Name:', users[0].display_name);
    console.log('Role:', users[0].role);
    console.log('Email Verified:', users[0].email_verified);
    console.log('Created At:', users[0].created_at);
    console.log('\n✓ Admin user ready!');
    console.log('You can now login with:');
    console.log(`  Email: ${email}`);
    if (!process.env.INITIAL_ADMIN_PASSWORD) {
      console.log(`  Password: [the password you provided]`);
    } else {
      console.log('  Password: [from INITIAL_ADMIN_PASSWORD in .env]');
    }
    console.log('\n⚠️  SECURITY NOTE: Change the admin password after first login!\n');

    await connection.end();
    rl.close();
  } catch (error) {
    console.error('Error creating admin user:', error);
    rl.close();
    process.exit(1);
  }
}

createAdminUser();

