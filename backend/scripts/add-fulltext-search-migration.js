const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function addFulltextSearchMigration() {
  let connection;
  try {
    console.log('Adding full-text search indexes...\n');

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'library_system'
    });

    console.log('Connected to database\n');

    // Add FULLTEXT indexes for better search performance
    console.log('Adding FULLTEXT indexes to books table...');
    try {
      // Check if indexes already exist
      const [indexes] = await connection.execute(`
        SHOW INDEX FROM books WHERE Key_name = 'ft_title_author'
      `);

      if (indexes.length === 0) {
        await connection.execute(`
          ALTER TABLE books
          ADD FULLTEXT INDEX ft_title_author (title, author)
        `);
        console.log('✓ FULLTEXT index on title and author added\n');
      } else {
        console.log('✓ FULLTEXT index already exists\n');
      }

      // Add index for description if it doesn't exist
      const [descIndexes] = await connection.execute(`
        SHOW INDEX FROM books WHERE Key_name = 'ft_description'
      `);

      if (descIndexes.length === 0) {
        await connection.execute(`
          ALTER TABLE books
          ADD FULLTEXT INDEX ft_description (description)
        `);
        console.log('✓ FULLTEXT index on description added\n');
      } else {
        console.log('✓ FULLTEXT index on description already exists\n');
      }
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('✓ FULLTEXT indexes already exist\n');
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

addFulltextSearchMigration();

