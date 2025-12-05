const pool = require('../config/database');
const searchService = require('../services/searchService');

// Get all books with advanced search
exports.getAllBooks = async (req, res) => {
  try {
    const {
      search,
      query,
      author,
      category,
      isbn,
      publisher,
      year,
      yearFrom,
      yearTo,
      bookType,
      availableOnly,
      minRating,
      page = 1,
      limit = 20
    } = req.query;

    // Use advanced search if any advanced parameters are provided
    const useAdvancedSearch = query || isbn || publisher || year || yearFrom || yearTo || 
                              bookType || availableOnly || minRating;

    if (useAdvancedSearch) {
      const searchResult = await searchService.advancedSearch({
        query: query || search,
        isbn,
        publisher,
        year,
        yearFrom,
        yearTo,
        bookType,
        availableOnly,
        minRating,
        category,
        author,
        page,
        limit
      });

      // Add reserved count and rating info
      const booksWithReserved = await Promise.all(searchResult.books.map(async (book) => {
        const [reservedCount] = await pool.execute(
          'SELECT COUNT(*) as count FROM holds WHERE book_id = ? AND status IN ("pending", "available")',
          [book.id]
        );
        
        const avgRating = book.average_rating ? parseFloat(book.average_rating) : null;
        const totalReviews = book.total_reviews || 0;
        
        return {
          ...book,
          reserved_count: reservedCount[0].count || 0,
          average_rating: avgRating,
          total_reviews: totalReviews
        };
      }));

      res.json({
        books: booksWithReserved,
        pagination: {
          page: searchResult.page,
          limit: searchResult.limit,
          total: searchResult.total,
          totalPages: searchResult.totalPages
        }
      });
    } else {
      // Fallback to simple search for backward compatibility
      const offset = (page - 1) * limit;
      let queryStr = 'SELECT * FROM books WHERE 1=1';
      const params = [];

      if (search) {
        queryStr += ' AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (author) {
        queryStr += ' AND author LIKE ?';
        params.push(`%${author}%`);
      }

      if (category) {
        queryStr += ' AND category = ?';
        params.push(category);
      }

      const limitNum = parseInt(limit);
      const offsetNum = parseInt(offset);
      queryStr += ` ORDER BY title LIMIT ${limitNum} OFFSET ${offsetNum}`;

      const [books] = await pool.execute(queryStr, params);

      // Add reserved count and rating info for each book
      const booksWithReserved = await Promise.all(books.map(async (book) => {
        const [reservedCount] = await pool.execute(
          'SELECT COUNT(*) as count FROM holds WHERE book_id = ? AND status IN ("pending", "available")',
          [book.id]
        );
        
        const avgRating = book.average_rating ? parseFloat(book.average_rating) : null;
        const totalReviews = book.total_reviews || 0;
        
        return {
          ...book,
          reserved_count: reservedCount[0].count || 0,
          average_rating: avgRating,
          total_reviews: totalReviews
        };
      }));

      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM books WHERE 1=1';
      const countParams = [];

      if (search) {
        countQuery += ' AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)';
        const searchTerm = `%${search}%`;
        countParams.push(searchTerm, searchTerm, searchTerm);
      }

      if (author) {
        countQuery += ' AND author LIKE ?';
        countParams.push(`%${author}%`);
      }

      if (category) {
        countQuery += ' AND category = ?';
        countParams.push(category);
      }

      const [countResult] = await pool.execute(countQuery, countParams);
      const total = countResult[0].total;

      res.json({
        books: booksWithReserved,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    }
  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
};

// Get search suggestions
exports.getSearchSuggestions = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }

    const suggestions = await searchService.getSearchSuggestions(q, 10);
    res.json({ suggestions });
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
};

// Get book by ID
exports.getBookById = async (req, res) => {
  try {
    const { id } = req.params;

    const [books] = await pool.execute(
      'SELECT * FROM books WHERE id = ?',
      [id]
    );

    if (books.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Add reserved count
    const [reservedCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM holds WHERE book_id = ? AND status IN ("pending", "available")',
      [id]
    );

    const book = books[0];
    const avgRating = book.average_rating ? parseFloat(book.average_rating) : null;
    const totalReviews = book.total_reviews || 0;

    const bookWithData = {
      ...book,
      reserved_count: reservedCount[0].count || 0,
      average_rating: avgRating,
      total_reviews: totalReviews
    };

    res.json(bookWithData);
  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({ error: 'Failed to fetch book' });
  }
};

// Create book (admin only - add admin check if needed)
exports.createBook = async (req, res) => {
  try {
    const { isbn, title, author, publisher, publication_year, category, description, total_copies, book_type, download_link } = req.body;
    const adminId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';

    if (!title || !author) {
      return res.status(400).json({ error: 'Title and author are required' });
    }

    // Validate book_type
    const validBookTypes = ['physical', 'electronic', 'both'];
    const bookType = book_type && validBookTypes.includes(book_type) ? book_type : 'physical';

    const available_copies = total_copies || 1;

    const [result] = await pool.execute(
      'INSERT INTO books (isbn, title, author, publisher, publication_year, category, description, book_type, total_copies, available_copies, download_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [isbn || null, title, author, publisher || null, publication_year || null, category || null, description || null, bookType, total_copies || 1, available_copies, download_link || null]
    );

    const bookId = result.insertId;

    // Log admin action if admin created the book
    if (isAdmin && adminId) {
      const newValues = {
        isbn: isbn || null,
        title,
        author,
        publisher: publisher || null,
        publication_year: publication_year || null,
        category: category || null,
        description: description || null,
        book_type: bookType,
        total_copies: total_copies || 1,
        available_copies
      };
      
      await pool.execute(
        'INSERT INTO audit_log (admin_id, action_type, entity_type, entity_id, new_values, description) VALUES (?, ?, ?, ?, ?, ?)',
        [adminId, 'book_created', 'book', bookId, JSON.stringify(newValues), `Created book: ${title} by ${author}`]
      );
    }

    const [newBook] = await pool.execute(
      'SELECT * FROM books WHERE id = ?',
      [bookId]
    );

    res.status(201).json(newBook[0]);
  } catch (error) {
    console.error('Create book error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Book with this ISBN already exists' });
    }
    res.status(500).json({ error: 'Failed to create book' });
  }
};

// Update book
exports.updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { isbn, title, author, publisher, publication_year, category, description, total_copies, available_copies, book_type, download_link } = req.body;
    const adminId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';

    // Get old book values for audit log
    const [oldBooks] = await pool.execute(
      'SELECT * FROM books WHERE id = ?',
      [id]
    );

    if (oldBooks.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const oldBook = oldBooks[0];

    // Build update query dynamically
    const updates = [];
    const params = [];
    const oldValues = {};
    const newValues = {};

    if (isbn !== undefined) { 
      updates.push('isbn = ?'); 
      params.push(isbn); 
      oldValues.isbn = oldBook.isbn;
      newValues.isbn = isbn;
    }
    if (title !== undefined) { 
      updates.push('title = ?'); 
      params.push(title); 
      oldValues.title = oldBook.title;
      newValues.title = title;
    }
    if (author !== undefined) { 
      updates.push('author = ?'); 
      params.push(author); 
      oldValues.author = oldBook.author;
      newValues.author = author;
    }
    if (publisher !== undefined) { 
      updates.push('publisher = ?'); 
      params.push(publisher); 
      oldValues.publisher = oldBook.publisher;
      newValues.publisher = publisher;
    }
    if (publication_year !== undefined) { 
      updates.push('publication_year = ?'); 
      params.push(publication_year); 
      oldValues.publication_year = oldBook.publication_year;
      newValues.publication_year = publication_year;
    }
    if (category !== undefined) { 
      updates.push('category = ?'); 
      params.push(category); 
      oldValues.category = oldBook.category;
      newValues.category = category;
    }
    if (description !== undefined) { 
      updates.push('description = ?'); 
      params.push(description); 
      oldValues.description = oldBook.description;
      newValues.description = description;
    }
    if (book_type !== undefined) {
      const validBookTypes = ['physical', 'electronic', 'both'];
      if (validBookTypes.includes(book_type)) {
        updates.push('book_type = ?');
        params.push(book_type);
        oldValues.book_type = oldBook.book_type;
        newValues.book_type = book_type;
      }
    }
    if (total_copies !== undefined) { 
      updates.push('total_copies = ?'); 
      params.push(total_copies); 
      oldValues.total_copies = oldBook.total_copies;
      newValues.total_copies = total_copies;
    }
    if (available_copies !== undefined) { 
      updates.push('available_copies = ?'); 
      params.push(available_copies); 
      oldValues.available_copies = oldBook.available_copies;
      newValues.available_copies = available_copies;
    }
    if (download_link !== undefined) { 
      updates.push('download_link = ?'); 
      params.push(download_link || null); 
      oldValues.download_link = oldBook.download_link;
      newValues.download_link = download_link || null;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);

    await pool.execute(
      `UPDATE books SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Log admin action if admin updated the book
    if (isAdmin && adminId) {
      await pool.execute(
        'INSERT INTO audit_log (admin_id, action_type, entity_type, entity_id, old_values, new_values, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [adminId, 'book_updated', 'book', id, JSON.stringify(oldValues), JSON.stringify(newValues), `Updated book: ${oldBook.title}`]
      );
    }

    const [updatedBook] = await pool.execute(
      'SELECT * FROM books WHERE id = ?',
      [id]
    );

    res.json(updatedBook[0]);
  } catch (error) {
    console.error('Update book error:', error);
    res.status(500).json({ error: 'Failed to update book' });
  }
};

// Delete book
exports.deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';

    // Get book details before deletion for audit log
    const [books] = await pool.execute(
      'SELECT * FROM books WHERE id = ?',
      [id]
    );

    if (books.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const book = books[0];

    await pool.execute('DELETE FROM books WHERE id = ?', [id]);

    // Log admin action if admin deleted the book
    if (isAdmin && adminId) {
      await pool.execute(
        'INSERT INTO audit_log (admin_id, action_type, entity_type, entity_id, old_values, description) VALUES (?, ?, ?, ?, ?, ?)',
        [adminId, 'book_deleted', 'book', id, JSON.stringify(book), `Deleted book: ${book.title} by ${book.author}`]
      );
    }

    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({ error: 'Failed to delete book' });
  }
};


