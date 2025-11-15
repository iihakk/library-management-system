const pool = require('../config/database');

// Get all books
exports.getAllBooks = async (req, res) => {
  try {
    const { search, author, category, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM books WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (author) {
      query += ' AND author LIKE ?';
      params.push(`%${author}%`);
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);
    query += ` ORDER BY title LIMIT ${limitNum} OFFSET ${offsetNum}`;

    const [books] = await pool.execute(query, params);

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
      books,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({ error: 'Failed to fetch books' });
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

    res.json(books[0]);
  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({ error: 'Failed to fetch book' });
  }
};

// Create book (admin only - add admin check if needed)
exports.createBook = async (req, res) => {
  try {
    const { isbn, title, author, publisher, publication_year, category, description, total_copies } = req.body;

    if (!title || !author) {
      return res.status(400).json({ error: 'Title and author are required' });
    }

    const available_copies = total_copies || 1;

    const [result] = await pool.execute(
      'INSERT INTO books (isbn, title, author, publisher, publication_year, category, description, total_copies, available_copies) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [isbn || null, title, author, publisher || null, publication_year || null, category || null, description || null, total_copies || 1, available_copies]
    );

    const [newBook] = await pool.execute(
      'SELECT * FROM books WHERE id = ?',
      [result.insertId]
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
    const { isbn, title, author, publisher, publication_year, category, description, total_copies, available_copies } = req.body;

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (isbn !== undefined) { updates.push('isbn = ?'); params.push(isbn); }
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (author !== undefined) { updates.push('author = ?'); params.push(author); }
    if (publisher !== undefined) { updates.push('publisher = ?'); params.push(publisher); }
    if (publication_year !== undefined) { updates.push('publication_year = ?'); params.push(publication_year); }
    if (category !== undefined) { updates.push('category = ?'); params.push(category); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (total_copies !== undefined) { updates.push('total_copies = ?'); params.push(total_copies); }
    if (available_copies !== undefined) { updates.push('available_copies = ?'); params.push(available_copies); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);

    await pool.execute(
      `UPDATE books SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

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

    await pool.execute('DELETE FROM books WHERE id = ?', [id]);

    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({ error: 'Failed to delete book' });
  }
};

