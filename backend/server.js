const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const bookRoutes = require('./routes/bookRoutes');
const loanRoutes = require('./routes/loanRoutes');
const holdRoutes = require('./routes/holdRoutes');
const fineRoutes = require('./routes/fineRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Library Management System API',
    version: '1.0.0',
    endpoints: {
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        verify: 'GET /api/auth/verify'
      },
      books: {
        list: 'GET /api/books',
        getById: 'GET /api/books/:id',
        create: 'POST /api/books (protected)',
        update: 'PUT /api/books/:id (protected)',
        delete: 'DELETE /api/books/:id (protected)'
      },
      loans: {
        list: 'GET /api/loans (protected)',
        getById: 'GET /api/loans/:id (protected)',
        create: 'POST /api/loans (protected)',
        return: 'PUT /api/loans/:id/return (protected)'
      },
      holds: {
        list: 'GET /api/holds (protected)',
        getById: 'GET /api/holds/:id (protected)',
        create: 'POST /api/holds (protected)',
        cancel: 'DELETE /api/holds/:id (protected)'
      }
    }
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/holds', holdRoutes);
app.use('/api/fines', fineRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

