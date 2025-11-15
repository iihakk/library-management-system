# Setting Up Database in MySQL Workbench

Follow these steps to create the database and tables using MySQL Workbench.

## Step-by-Step Instructions

### 1. Open MySQL Workbench

- Launch MySQL Workbench on your computer
- You should see your local MySQL connection (usually named "Local instance MySQL" or similar)

### 2. Connect to MySQL Server

- Click on your local MySQL connection
- Enter password: `12345` (or your MySQL root password)
- Click "OK" to connect

### 3. Open the SQL Schema File

**Option A: Open SQL File in Workbench**
1. In MySQL Workbench, go to: **File → Open SQL Script**
2. Navigate to: `backend/config/db-schema.sql`
3. Click "Open"

**Option B: Copy and Paste**
1. Open the file `backend/config/db-schema.sql` in any text editor
2. Copy all the contents (Ctrl+A, then Ctrl+C)
3. In MySQL Workbench, paste it into a new query tab

### 4. Execute the SQL Script

1. Make sure you're connected to your MySQL server
2. Click the **Execute** button (⚡ lightning bolt icon) or press `Ctrl+Shift+Enter`
3. Wait for the script to complete

### 5. Verify the Database and Tables

1. In the left sidebar (Schema panel), click the **refresh icon** (🔄)
2. You should see `library_system` database appear
3. Expand `library_system` to see the tables:
   - `users`
   - `books`
   - `loans`
   - `holds`

### 6. Verify Tables Structure

1. Right-click on `library_system` database
2. Select "Set as Default Schema"
3. Expand each table to verify columns exist

## Alternative: Manual Verification Query

Run this query to verify all tables were created:

```sql
USE library_system;
SHOW TABLES;
```

You should see:
- users
- books
- loans
- holds

## Troubleshooting

### If you get "Access Denied" error:
- Make sure you're using the correct MySQL root password
- The password in your `.env` file should match your MySQL root password

### If tables already exist:
- The script uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times
- If you want to recreate tables, you can drop them first:
  ```sql
  DROP DATABASE IF EXISTS library_system;
  ```
  Then run the schema file again

### If you see foreign key errors:
- Make sure you run the entire script from top to bottom
- The script creates tables in the correct order (users and books before loans and holds)

## Quick Test

After setup, you can test the connection from your backend:

1. Make sure your backend server is running
2. The backend will automatically connect when it starts
3. Check the backend console for: `✅ Database connected successfully`

If you see `❌ Database connection error`, check:
- MySQL server is running
- Database name matches: `library_system`
- Username: `root`
- Password: `12345` (or whatever is in your `.env` file)

