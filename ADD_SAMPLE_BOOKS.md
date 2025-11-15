# Adding Sample Books to the Catalog

Follow these steps to add sample books to your library system.

## Option 1: Using MySQL Workbench (Recommended)

1. **Open MySQL Workbench** and connect to your database

2. **Open the SQL file:**
   - Go to: **File → Open SQL Script**
   - Navigate to: `backend/scripts/add-sample-books.sql`
   - Click "Open"

3. **Execute the script:**
   - Click the **Execute** button (⚡) or press `Ctrl+Shift+Enter`
   - Wait for the script to complete

4. **Verify:**
   - Run this query to see the books:
   ```sql
   USE library_system;
   SELECT COUNT(*) as total_books FROM books;
   ```
   - You should see 20 books added

## Option 2: Using MySQL Command Line

```bash
mysql -u root -p12345 library_system < backend/scripts/add-sample-books.sql
```

## Option 3: Using the API (Requires Authentication)

If you want to add books programmatically, you can use the API:

1. **Login first** to get a token:
   ```bash
   POST http://localhost:5000/api/auth/login
   Body: {
     "email": "your-email@example.com",
     "password": "your-password"
   }
   ```

2. **Create a book:**
   ```bash
   POST http://localhost:5000/api/books
   Headers: {
     "Authorization": "Bearer YOUR_TOKEN",
     "Content-Type": "application/json"
   }
   Body: {
     "title": "Book Title",
     "author": "Author Name",
     "isbn": "978-0-123456-78-9",
     "publisher": "Publisher Name",
     "publication_year": 2023,
     "category": "Fiction",
     "description": "Book description",
     "total_copies": 5
   }
   ```

## Sample Books Included

The SQL script adds 20 classic books including:
- The Great Gatsby
- To Kill a Mockingbird
- 1984
- Pride and Prejudice
- The Catcher in the Rye
- Lord of the Flies
- The Hobbit
- And many more...

## After Adding Books

1. **Visit the catalog:** `http://localhost:3000/catalog`
2. **You should see all the books** displayed in a grid
3. **Test the search and filter features:**
   - Search by title, author, or ISBN
   - Filter by category
   - Filter by author

## Verify in Database

Run this query to see all books:

```sql
USE library_system;
SELECT id, title, author, category, available_copies, total_copies FROM books;
```

