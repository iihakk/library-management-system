const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const sampleBooks = [
  {
    isbn: '978-0-06-112008-4',
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    publisher: 'Harper Perennial Modern Classics',
    publication_year: 1960,
    category: 'Fiction',
    description: 'A gripping, heart-wrenching, and wholly remarkable tale of coming-of-age in a South poisoned by virulent prejudice.',
    total_copies: 5,
    available_copies: 5
  },
  {
    isbn: '978-0-7432-7356-5',
    title: '1984',
    author: 'George Orwell',
    publisher: 'Signet Classic',
    publication_year: 1949,
    category: 'Science Fiction',
    description: 'A dystopian social science fiction novel and cautionary tale about the dangers of totalitarianism.',
    total_copies: 4,
    available_copies: 4
  },
  {
    isbn: '978-0-14-028329-3',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    publisher: 'Penguin Classics',
    publication_year: 1813,
    category: 'Romance',
    description: 'A romantic novel of manners that follows the character development of Elizabeth Bennet.',
    total_copies: 3,
    available_copies: 3
  },
  {
    isbn: '978-0-06-093546-7',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    publisher: 'Scribner',
    publication_year: 1925,
    category: 'Fiction',
    description: 'A novel about the impossibility of recapturing the past and the difficulty of altering one\'s future.',
    total_copies: 6,
    available_copies: 6
  },
  {
    isbn: '978-0-452-28423-4',
    title: 'The Catcher in the Rye',
    author: 'J.D. Salinger',
    publisher: 'Little, Brown and Company',
    publication_year: 1951,
    category: 'Fiction',
    description: 'A story about teenage rebellion and alienation that has become an icon for teenage rebellion.',
    total_copies: 4,
    available_copies: 4
  },
  {
    isbn: '978-0-06-112241-5',
    title: 'The Hobbit',
    author: 'J.R.R. Tolkien',
    publisher: 'Houghton Mifflin Harcourt',
    publication_year: 1937,
    category: 'Fantasy',
    description: 'A fantasy novel about the quest of home-loving Bilbo Baggins to win a share of the treasure guarded by Smaug the dragon.',
    total_copies: 5,
    available_copies: 5
  },
  {
    isbn: '978-0-316-76948-0',
    title: 'Harry Potter and the Philosopher\'s Stone',
    author: 'J.K. Rowling',
    publisher: 'Bloomsbury',
    publication_year: 1997,
    category: 'Fantasy',
    description: 'The first novel in the Harry Potter series about an eleven-year-old boy discovering he is a wizard.',
    total_copies: 8,
    available_copies: 8
  },
  {
    isbn: '978-0-06-085052-4',
    title: 'Brave New World',
    author: 'Aldous Huxley',
    publisher: 'Harper Perennial',
    publication_year: 1932,
    category: 'Science Fiction',
    description: 'A dystopian novel that anticipates huge scientific advancements in reproductive technology.',
    total_copies: 3,
    available_copies: 3
  },
  {
    isbn: '978-0-7432-7357-2',
    title: 'Animal Farm',
    author: 'George Orwell',
    publisher: 'Signet Classic',
    publication_year: 1945,
    category: 'Political Fiction',
    description: 'An allegorical novella reflecting events leading up to the Russian Revolution of 1917.',
    total_copies: 4,
    available_copies: 4
  },
  {
    isbn: '978-0-14-017739-8',
    title: 'Of Mice and Men',
    author: 'John Steinbeck',
    publisher: 'Penguin Books',
    publication_year: 1937,
    category: 'Fiction',
    description: 'A novella about the experiences of George Milton and Lennie Small during the Great Depression.',
    total_copies: 5,
    available_copies: 5
  },
  {
    isbn: '978-0-06-440055-8',
    title: 'Where the Wild Things Are',
    author: 'Maurice Sendak',
    publisher: 'HarperCollins',
    publication_year: 1963,
    category: 'Children',
    description: 'A children\'s picture book about a young boy who escapes to an island inhabited by mysterious creatures.',
    total_copies: 6,
    available_copies: 6
  },
  {
    isbn: '978-0-679-72335-6',
    title: 'The Road',
    author: 'Cormac McCarthy',
    publisher: 'Vintage Books',
    publication_year: 2006,
    category: 'Post-Apocalyptic',
    description: 'A post-apocalyptic novel about a journey of a father and his young son over several months.',
    total_copies: 3,
    available_copies: 3
  },
  {
    isbn: '978-0-385-33312-0',
    title: 'The Da Vinci Code',
    author: 'Dan Brown',
    publisher: 'Doubleday',
    publication_year: 2003,
    category: 'Thriller',
    description: 'A mystery thriller novel following symbologist Robert Langdon and cryptologist Sophie Neveu.',
    total_copies: 7,
    available_copies: 7
  },
  {
    isbn: '978-0-316-01686-9',
    title: 'Twilight',
    author: 'Stephenie Meyer',
    publisher: 'Little, Brown and Company',
    publication_year: 2005,
    category: 'Romance',
    description: 'A young-adult vampire-romance novel about a teenage girl who falls in love with a vampire.',
    total_copies: 5,
    available_copies: 5
  },
  {
    isbn: '978-0-547-92822-7',
    title: 'The Lord of the Rings',
    author: 'J.R.R. Tolkien',
    publisher: 'Houghton Mifflin Harcourt',
    publication_year: 1954,
    category: 'Fantasy',
    description: 'An epic high-fantasy novel following the quest to destroy the One Ring.',
    total_copies: 6,
    available_copies: 6
  },
  {
    isbn: '978-0-06-245773-5',
    title: 'The Alchemist',
    author: 'Paulo Coelho',
    publisher: 'HarperOne',
    publication_year: 1988,
    category: 'Fiction',
    description: 'A novel about an Andalusian shepherd boy who travels to the Egyptian desert in search of treasure.',
    total_copies: 4,
    available_copies: 4
  },
  {
    isbn: '978-0-143-03943-3',
    title: 'The Kite Runner',
    author: 'Khaled Hosseini',
    publisher: 'Riverhead Books',
    publication_year: 2003,
    category: 'Historical Fiction',
    description: 'A story about the unlikely friendship between a wealthy boy and the son of his father\'s servant.',
    total_copies: 5,
    available_copies: 5
  },
  {
    isbn: '978-0-06-092898-8',
    title: 'The Giver',
    author: 'Lois Lowry',
    publisher: 'Houghton Mifflin Harcourt',
    publication_year: 1993,
    category: 'Dystopian',
    description: 'A 1993 American young adult dystopian novel set in a society which is at first presented as a utopian society.',
    total_copies: 4,
    available_copies: 4
  },
  {
    isbn: '978-0-06-440036-7',
    title: 'Charlotte\'s Web',
    author: 'E.B. White',
    publisher: 'Harper & Brothers',
    publication_year: 1952,
    category: 'Children',
    description: 'A beloved children\'s novel about a pig named Wilbur and his friendship with a barn spider named Charlotte.',
    total_copies: 7,
    available_copies: 7
  },
  {
    isbn: '978-0-06-112270-5',
    title: 'A Tale of Two Cities',
    author: 'Charles Dickens',
    publisher: 'Dover Publications',
    publication_year: 1859,
    category: 'Historical Fiction',
    description: 'A historical novel set in London and Paris before and during the French Revolution.',
    total_copies: 3,
    available_copies: 3
  }
];

async function seedBooks() {
  try {
    console.log('=== Starting Book Seeding ===\n');

    // Connect to database
    const connectionConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      database: process.env.DB_NAME || 'library_system'
    };

    if (process.env.DB_PASSWORD) {
      connectionConfig.password = process.env.DB_PASSWORD;
    }

    const connection = await mysql.createConnection(connectionConfig);
    console.log('✓ Connected to database\n');

    // Check if books already exist
    const [existing] = await connection.execute('SELECT COUNT(*) as count FROM books');

    if (existing[0].count > 0) {
      console.log(`📚 Database already has ${existing[0].count} books`);
      console.log('Do you want to add more books? (This will not delete existing books)\n');
    }

    // Insert books
    let inserted = 0;
    let skipped = 0;

    for (const book of sampleBooks) {
      try {
        await connection.execute(
          `INSERT INTO books (isbn, title, author, publisher, publication_year, category, description, total_copies, available_copies)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            book.isbn,
            book.title,
            book.author,
            book.publisher,
            book.publication_year,
            book.category,
            book.description,
            book.total_copies,
            book.available_copies
          ]
        );
        console.log(`✓ Added: ${book.title} by ${book.author}`);
        inserted++;
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`⊘ Skipped (already exists): ${book.title}`);
          skipped++;
        } else {
          throw err;
        }
      }
    }

    // Get final count
    const [final] = await connection.execute('SELECT COUNT(*) as count FROM books');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('         SEEDING COMPLETED          ');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📚 Total books in database: ${final[0].count}`);
    console.log(`✅ Books added: ${inserted}`);
    console.log(`⊘ Books skipped: ${skipped}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await connection.end();
    console.log('✓ Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\nPlease check your MySQL credentials in backend/.env');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\nMySQL server is not running. Please start MySQL and try again.');
    }
    process.exit(1);
  }
}

seedBooks();
