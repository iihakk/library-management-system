# Library Management System

A full-stack library management system for universities built with Next.js and Express.

## Features

- User authentication (signup/login)
- Browse and search books
- Borrow and return books
- Place holds on unavailable books
- User dashboard with loans and holds
- Admin/Staff dashboards

## Tech Stack

**Frontend:** Next.js 14, TypeScript, Tailwind CSS  
**Backend:** Node.js, Express, MySQL, JWT

## Quick Setup

### 1. Database Setup

```bash
mysql -u root -p < backend/config/db-schema.sql
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=library_system
JWT_SECRET=your-secret-key
PORT=5000
```

Start backend:
```bash
npm run dev
```

### 3. Frontend Setup

```bash
npm install
npm run dev
```

## Running the Application

**Backend:** http://localhost:5000  
**Frontend:** http://localhost:3000

Run both servers in separate terminals:
- Terminal 1: `cd backend && npm run dev`
- Terminal 2: `npm run dev`

## Project Structure

```
library-management-system/
├── backend/          # Express API
│   ├── controllers/     # Business logic
│   ├── routes/          # API routes
│   ├── middleware/      # Auth middleware
│   └── config/          # Database config
└── src/                 # Next.js frontend
    ├── app/             # Pages
    ├── components/      # React components
    └── contexts/        # State management
```

## API Endpoints

**Authentication:**
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/verify` - Verify token

**Books:**
- `GET /api/books` - Get all books
- `GET /api/books/:id` - Get book by ID
- `POST /api/books` - Create book (Protected)
- `PUT /api/books/:id` - Update book (Protected)

**Loans:**
- `GET /api/loans` - Get user loans (Protected)
- `POST /api/loans` - Borrow book (Protected)
- `PUT /api/loans/:id/return` - Return book (Protected)

**Holds:**
- `GET /api/holds` - Get user holds (Protected)
- `POST /api/holds` - Create hold (Protected)
- `DELETE /api/holds/:id` - Cancel hold (Protected)

For detailed API documentation, see [backend/README.md](./backend/README.md).

## Troubleshooting

**Database connection error:**
- Check MySQL is running
- Verify `.env` file has correct credentials

**Port already in use:**
- Change `PORT` in `backend/.env` or use different port

**Module not found:**
- Run `npm install` in both root and backend directories

## Documentation

- [Setup Instructions](./SETUP_INSTRUCTIONS.md) - Detailed setup guide
- [Architecture](./ARCHITECTURE.md) - System architecture
- [Backend API](./backend/README.md) - Complete API documentation
