# Testing Guide - Library Management System

Now that your database is set up, here's how to test the application.

## ✅ Current Status

- ✅ Backend server running on `http://localhost:5000`
- ✅ Frontend server running on `http://localhost:3000`
- ✅ Database `library_system` created with all tables

## 🧪 Testing Steps

### 1. Test the Frontend Application

1. **Open your browser** and go to: `http://localhost:3000`

2. **Sign Up for a new account:**
   - Click "Sign Up" or go to `http://localhost:3000/signup`
   - Fill in:
     - Name: `John Doe`
     - Email: `john@example.com`
     - Password: `Test123!@#` (must meet requirements)
     - Confirm Password: `Test123!@#`
   - Click "Create Account"
   - You should see a success message and be redirected to login

3. **Login:**
   - Go to `http://localhost:3000/login`
   - Enter:
     - Email: `john@example.com`
     - Password: `Test123!@#`
   - Click "Sign in"
   - You should be redirected to the dashboard

4. **View Dashboard:**
   - You should see your account information
   - Welcome message with your name

### 2. Test API Endpoints Directly

#### Using Browser

**API Info:**
- Visit: `http://localhost:5000/api`
- You should see a list of all available endpoints

**Health Check:**
- Visit: `http://localhost:5000/health`
- Should return: `{"status":"OK","message":"Server is running"}`

#### Using Thunder Client / Postman

**1. Sign Up (POST)**
```
URL: http://localhost:5000/api/auth/signup
Method: POST
Headers:
  Content-Type: application/json
Body (JSON):
{
  "email": "test@example.com",
  "password": "Test123!@#",
  "name": "Test User"
}
```

**Expected Response:**
```json
{
  "message": "Account created successfully",
  "user": {
    "uid": "abc123...",
    "email": "test@example.com",
    "displayName": "Test User",
    "emailVerified": false
  },
  "token": "jwt_token_here"
}
```

**2. Login (POST)**
```
URL: http://localhost:5000/api/auth/login
Method: POST
Headers:
  Content-Type: application/json
Body (JSON):
{
  "email": "test@example.com",
  "password": "Test123!@#"
}
```

**Expected Response:**
```json
{
  "user": {
    "uid": "abc123...",
    "email": "test@example.com",
    "displayName": "Test User",
    "emailVerified": false
  },
  "token": "jwt_token_here"
}
```

**3. Get Books (GET)**
```
URL: http://localhost:5000/api/books
Method: GET
```

**Expected Response:**
```json
{
  "books": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```
(Empty array is normal - no books added yet)

**4. Create a Book (POST) - Protected**
```
URL: http://localhost:5000/api/books
Method: POST
Headers:
  Content-Type: application/json
  Authorization: Bearer YOUR_TOKEN_HERE
Body (JSON):
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

**5. Get User Loans (GET) - Protected**
```
URL: http://localhost:5000/api/loans
Method: GET
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
```

### 3. Add Sample Data (Optional)

You can add sample books directly in MySQL Workbench:

```sql
USE library_system;

INSERT INTO books (title, author, isbn, publisher, publication_year, category, description, total_copies, available_copies) VALUES
('The Great Gatsby', 'F. Scott Fitzgerald', '978-0-7432-7356-5', 'Scribner', 1925, 'Fiction', 'A classic American novel', 3, 3),
('To Kill a Mockingbird', 'Harper Lee', '978-0-06-112008-4', 'J.B. Lippincott & Co.', 1960, 'Fiction', 'A gripping tale of racial injustice', 5, 5),
('1984', 'George Orwell', '978-0-452-28423-4', 'Secker & Warburg', 1949, 'Dystopian Fiction', 'A dystopian social science fiction novel', 4, 4),
('Pride and Prejudice', 'Jane Austen', '978-0-14-143951-8', 'T. Egerton', 1813, 'Romance', 'A romantic novel of manners', 6, 6);
```

## 🔍 Verify Database Connection

Check if the backend connected successfully:

1. Look at the backend console/terminal
2. You should see: `✅ Database connected successfully`

If you see an error, check:
- MySQL server is running
- Database credentials in `backend/.env` are correct
- Database `library_system` exists

## 🐛 Troubleshooting

### Frontend can't connect to backend
- Make sure backend is running on port 5000
- Check browser console for CORS errors
- Verify `API_BASE_URL` in `src/contexts/AuthContext.tsx` is `http://localhost:5000/api`

### "Failed to fetch books" error
- This is normal if no books exist yet
- Try creating a book using the API
- Or add sample data using the SQL above

### Authentication errors
- Make sure you're using the correct token
- Token expires after 7 days
- Try logging in again to get a new token

### Database connection errors
- Verify MySQL is running
- Check `backend/.env` file has correct credentials
- Restart the backend server

## 📝 Next Steps

1. ✅ Test signup and login in the frontend
2. ✅ Test API endpoints
3. ✅ Add some sample books
4. ✅ Test borrowing a book (create a loan)
5. ✅ Test creating a hold
6. ✅ Test returning a book

Your library management system is now fully functional! 🎉

