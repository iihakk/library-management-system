# Library Management System - Backend API

Backend API built with Node.js, Express, and MySQL for the Library Management System.

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm or yarn

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Database Setup

1. Make sure MySQL is running on your system.

2. Create the database and tables by running the SQL schema:

```bash
mysql -u root -p12345 < config/db-schema.sql
```

Or manually:
- Open MySQL command line or MySQL Workbench
- Run the SQL commands from `config/db-schema.sql`

### 3. Environment Configuration

Create a `.env` file in the `backend` directory:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=12345
DB_NAME=library_system
JWT_SECRET=your-secret-key-change-this-in-production
PORT=5000
```

**Note:** Copy `.env.example` to `.env` and update the values if needed.

### 4. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication

#### POST `/api/auth/signup`
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "message": "Account created successfully",
  "user": {
    "uid": "abc123xyz",
    "email": "user@example.com",
    "displayName": "John Doe",
    "emailVerified": false
  },
  "token": "jwt_token_here"
}
```

#### POST `/api/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response:**
```json
{
  "user": {
    "uid": "abc123xyz",
    "email": "user@example.com",
    "displayName": "John Doe",
    "emailVerified": false
  },
  "token": "jwt_token_here"
}
```

#### POST `/api/auth/logout`
Logout (removes token on client side).

**Headers:**
```
Authorization: Bearer <token>
```

#### GET `/api/auth/verify`
Verify token and get current user.

**Headers:**
```
Authorization: Bearer <token>
```

### Books

#### GET `/api/books`
Get all books with optional filters.

**Query Parameters:**
- `search` - Search in title, author, or ISBN
- `author` - Filter by author
- `category` - Filter by category
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Example:**
```
GET /api/books?search=javascript&page=1&limit=10
```

#### GET `/api/books/:id`
Get a specific book by ID.

#### POST `/api/books` (Protected)
Create a new book.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "isbn": "978-0-123456-78-9",
  "title": "Book Title",
  "author": "Author Name",
  "publisher": "Publisher Name",
  "publication_year": 2023,
  "category": "Fiction",
  "description": "Book description",
  "total_copies": 5
}
```

#### PUT `/api/books/:id` (Protected)
Update a book.

**Headers:**
```
Authorization: Bearer <token>
```

#### DELETE `/api/books/:id` (Protected)
Delete a book.

**Headers:**
```
Authorization: Bearer <token>
```

### Loans

All loan endpoints require authentication.

#### GET `/api/loans`
Get all loans for the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

#### GET `/api/loans/:id`
Get a specific loan by ID.

**Headers:**
```
Authorization: Bearer <token>
```

#### POST `/api/loans`
Borrow a book (create a loan).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "book_id": 1
}
```

#### PUT `/api/loans/:id/return`
Return a book.

**Headers:**
```
Authorization: Bearer <token>
```

### Holds

All hold endpoints require authentication.

#### GET `/api/holds`
Get all holds for the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

#### GET `/api/holds/:id`
Get a specific hold by ID.

**Headers:**
```
Authorization: Bearer <token>
```

#### POST `/api/holds`
Create a hold (reserve a book).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "book_id": 1
}
```

#### DELETE `/api/holds/:id`
Cancel a hold.

**Headers:**
```
Authorization: Bearer <token>
```

## Testing with Thunder Client / Postman

### 1. Signup

**Method:** POST  
**URL:** `http://localhost:5000/api/auth/signup`  
**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "email": "test@example.com",
  "password": "Test123!@#",
  "name": "Test User"
}
```

### 2. Login

**Method:** POST  
**URL:** `http://localhost:5000/api/auth/login`  
**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "email": "test@example.com",
  "password": "Test123!@#"
}
```

**Save the `token` from the response for authenticated requests.**

### 3. Get Books

**Method:** GET  
**URL:** `http://localhost:5000/api/books`  
**Headers:** None (public endpoint)

### 4. Create Book (Protected)

**Method:** POST  
**URL:** `http://localhost:5000/api/books`  
**Headers:**
```
Content-Type: application/json
Authorization: Bearer <your_token_here>
```

**Body (JSON):**
```json
{
  "title": "The Great Gatsby",
  "author": "F. Scott Fitzgerald",
  "isbn": "978-0-7432-7356-5",
  "publisher": "Scribner",
  "publication_year": 1925,
  "category": "Fiction",
  "description": "A classic American novel",
  "total_copies": 3
}
```

### 5. Get User Loans (Protected)

**Method:** GET  
**URL:** `http://localhost:5000/api/loans`  
**Headers:**
```
Authorization: Bearer <your_token_here>
```

### 6. Borrow a Book (Protected)

**Method:** POST  
**URL:** `http://localhost:5000/api/loans`  
**Headers:**
```
Content-Type: application/json
Authorization: Bearer <your_token_here>
```

**Body (JSON):**
```json
{
  "book_id": 1
}
```

### 7. Return a Book (Protected)

**Method:** PUT  
**URL:** `http://localhost:5000/api/loans/1/return`  
**Headers:**
```
Authorization: Bearer <your_token_here>
```

### 8. Create a Hold (Protected)

**Method:** POST  
**URL:** `http://localhost:5000/api/holds`  
**Headers:**
```
Content-Type: application/json
Authorization: Bearer <your_token_here>
```

**Body (JSON):**
```json
{
  "book_id": 1
}
```

## Project Structure

```
backend/
├── config/
│   ├── database.js          # Database connection pool
│   └── db-schema.sql         # Database schema
├── controllers/
│   ├── authController.js     # Authentication logic
│   ├── bookController.js     # Book CRUD operations
│   ├── loanController.js      # Loan management
│   └── holdController.js     # Hold management
├── middleware/
│   └── authMiddleware.js     # JWT token verification
├── routes/
│   ├── authRoutes.js         # Auth routes
│   ├── bookRoutes.js         # Book routes
│   ├── loanRoutes.js         # Loan routes
│   └── holdRoutes.js         # Hold routes
├── .env                      # Environment variables (create this)
├── .env.example              # Environment variables template
├── .gitignore
├── package.json
├── server.js                 # Express server entry point
└── README.md
```

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

Error responses follow this format:
```json
{
  "error": "Error message here"
}
```

## Security Notes

1. **JWT Secret:** Change the `JWT_SECRET` in production to a strong, random string.
2. **Password Hashing:** Passwords are hashed using bcryptjs before storage.
3. **CORS:** Currently configured to allow all origins. Restrict in production.
4. **SQL Injection:** Using parameterized queries to prevent SQL injection.

## Troubleshooting

### Database Connection Error
- Verify MySQL is running
- Check database credentials in `.env`
- Ensure database `library_system` exists

### Port Already in Use
- Change `PORT` in `.env` file
- Or stop the process using port 5000

### Module Not Found
- Run `npm install` in the backend directory

## Next Steps

1. Add input validation middleware (e.g., express-validator)
2. Add rate limiting
3. Implement admin role system
4. Add email verification functionality
5. Add pagination metadata improvements
6. Add request logging

