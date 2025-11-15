# Backend Files Created

This document lists all the files created for the backend API.

## File Structure

```
backend/
├── config/
│   ├── database.js          # MySQL connection pool using mysql2
│   └── db-schema.sql         # Database schema (users, books, loans, holds tables)
├── controllers/
│   ├── authController.js     # Authentication: signup, login, logout, verify
│   ├── bookController.js     # Books: CRUD operations, search, pagination
│   ├── loanController.js     # Loans: create, get, return
│   └── holdController.js      # Holds: create, get, cancel
├── middleware/
│   └── authMiddleware.js     # JWT token verification middleware
├── routes/
│   ├── authRoutes.js         # Auth endpoints: /api/auth/*
│   ├── bookRoutes.js         # Book endpoints: /api/books/*
│   ├── loanRoutes.js         # Loan endpoints: /api/loans/*
│   └── holdRoutes.js         # Hold endpoints: /api/holds/*
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore file
├── package.json              # Backend dependencies and scripts
├── server.js                 # Express server entry point
├── README.md                 # Backend API documentation
└── FILES_CREATED.md          # This file
```

## Key Files

### server.js
- Express server setup
- CORS configuration
- Route mounting
- Error handling
- Runs on port 5000

### config/database.js
- MySQL connection pool using mysql2
- Environment-based configuration
- Connection testing

### config/db-schema.sql
- Creates `library_system` database
- Creates tables: users, books, loans, holds
- Includes indexes and foreign keys

### controllers/authController.js
- `signup()` - Create new user account with password hashing
- `login()` - Authenticate user and return JWT token
- `logout()` - Logout endpoint
- `verifyToken()` - Verify JWT and return user data

### controllers/bookController.js
- `getAllBooks()` - List books with search, filters, pagination
- `getBookById()` - Get single book
- `createBook()` - Add new book
- `updateBook()` - Update book details
- `deleteBook()` - Delete book

### controllers/loanController.js
- `getUserLoans()` - Get all loans for authenticated user
- `getLoanById()` - Get single loan
- `createLoan()` - Borrow a book (creates loan, decreases available copies)
- `returnLoan()` - Return a book (updates loan, increases available copies)

### controllers/holdController.js
- `getUserHolds()` - Get all holds for authenticated user
- `getHoldById()` - Get single hold
- `createHold()` - Reserve a book
- `cancelHold()` - Cancel a hold

### middleware/authMiddleware.js
- `verifyToken()` - Middleware to verify JWT token
- Attaches user data to `req.user`
- Used by protected routes

## API Endpoints Summary

### Authentication (Public)
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/verify` - Verify token

### Books
- `GET /api/books` - List books (public)
- `GET /api/books/:id` - Get book (public)
- `POST /api/books` - Create book (protected)
- `PUT /api/books/:id` - Update book (protected)
- `DELETE /api/books/:id` - Delete book (protected)

### Loans (All Protected)
- `GET /api/loans` - Get user's loans
- `GET /api/loans/:id` - Get single loan
- `POST /api/loans` - Borrow book
- `PUT /api/loans/:id/return` - Return book

### Holds (All Protected)
- `GET /api/holds` - Get user's holds
- `GET /api/holds/:id` - Get single hold
- `POST /api/holds` - Create hold
- `DELETE /api/holds/:id` - Cancel hold

## Frontend Changes

### Modified Files
- `src/contexts/AuthContext.tsx` - Updated to use API endpoints instead of localStorage

### API Base URL
- All API calls use: `http://localhost:5000/api`
- Token stored in: `localStorage.getItem('auth_token')`
- Token sent in header: `Authorization: Bearer <token>`

## Dependencies

### Backend
- `express` - Web framework
- `mysql2` - MySQL driver
- `cors` - CORS middleware
- `dotenv` - Environment variables
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT tokens
- `nodemon` - Development auto-reload (dev dependency)

## Database Schema

### users
- id, uid, email, password, display_name, email_verified, created_at, updated_at

### books
- id, isbn, title, author, publisher, publication_year, category, description, total_copies, available_copies, created_at, updated_at

### loans
- id, user_id, book_id, loan_date, due_date, return_date, status, created_at, updated_at

### holds
- id, user_id, book_id, hold_date, expiry_date, status, created_at, updated_at

