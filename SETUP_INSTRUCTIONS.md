# Library Management System - Setup Instructions

Complete setup guide for running both frontend and backend.

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm or yarn

## Step-by-Step Setup

### 1. Database Setup

1. **Start MySQL Server**
   - Make sure MySQL is running on your system
   - Default connection: `localhost:3306`

2. **Create Database and Tables**
   
   Open MySQL command line or MySQL Workbench and run:
   
   ```bash
   mysql -u root -p12345 < backend/config/db-schema.sql
   ```
   
   Or manually:
   - Connect to MySQL: `mysql -u root -p12345`
   - Run the SQL commands from `backend/config/db-schema.sql`

### 2. Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   
   Create a `.env` file in the `backend` directory:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=12345
   DB_NAME=library_system
   JWT_SECRET=your-secret-key-change-this-in-production
   PORT=5000
   ```

4. **Start the backend server:**
   
   **Development mode (with auto-reload):**
   ```bash
   npm run dev
   ```
   
   **Production mode:**
   ```bash
   npm start
   ```
   
   The backend will run on `http://localhost:5000`

### 3. Frontend Setup

1. **Navigate to project root (if not already there):**
   ```bash
   cd ..
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the frontend development server:**
   ```bash
   npm run dev
   ```
   
   The frontend will run on `http://localhost:3000` (or next available port)

## Running Both Servers

You need to run both servers simultaneously:

### Option 1: Two Terminal Windows

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### Option 2: Using npm-run-all (if installed)

Create a script in root `package.json`:
```json
{
  "scripts": {
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "next dev",
    "dev": "npm-run-all --parallel dev:backend dev:frontend"
  }
}
```

Then run:
```bash
npm run dev
```

## Verification

1. **Backend Health Check:**
   - Open browser: `http://localhost:5000/health`
   - Should return: `{"status":"OK","message":"Server is running"}`

2. **Frontend:**
   - Open browser: `http://localhost:3000`
   - Should see the Library Management System homepage

3. **Test Authentication:**
   - Click "Sign Up" and create an account
   - Try logging in with the created account

## API Testing Examples

See `backend/README.md` for detailed API endpoint documentation and testing examples using Thunder Client or Postman.

### Quick Test with curl:

**Signup:**
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#","name":"Test User"}'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'
```

## Troubleshooting

### Backend Issues

**Database Connection Error:**
- Verify MySQL is running: `mysql -u root -p12345`
- Check `.env` file exists and has correct credentials
- Ensure database `library_system` exists

**Port 5000 Already in Use:**
- Change `PORT` in `backend/.env` file
- Or stop the process using port 5000

**Module Not Found:**
- Run `npm install` in the `backend` directory

### Frontend Issues

**Cannot Connect to Backend:**
- Ensure backend is running on port 5000
- Check CORS settings in `backend/server.js`
- Verify API_BASE_URL in `src/contexts/AuthContext.tsx` is `http://localhost:5000/api`

**Port 3000 Already in Use:**
- Next.js will automatically use the next available port (3001, 3002, etc.)

## Project Structure

```
library-management-system/
├── backend/                 # Backend API
│   ├── config/             # Database config and schema
│   ├── controllers/        # Business logic
│   ├── middleware/         # Auth middleware
│   ├── routes/             # API routes
│   ├── server.js          # Express server
│   └── package.json
├── src/                    # Frontend (Next.js)
│   ├── app/               # Pages
│   ├── components/        # React components
│   ├── contexts/          # React contexts (Auth)
│   └── lib/               # Utilities
└── package.json           # Frontend dependencies
```

## Next Steps

1. Test all API endpoints using Postman or Thunder Client
2. Create some test books in the database
3. Test the loan and hold functionality
4. Customize the frontend as needed

For detailed API documentation, see `backend/README.md`.

