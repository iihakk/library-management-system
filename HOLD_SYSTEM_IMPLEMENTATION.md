# Hold System Implementation

## ✅ Features Implemented

### 1. **Book Types**

- Books can now be: `physical`, `electronic`, or `both`
- Admin can set book type when creating/editing books
- Book type is displayed in catalog and admin dashboard

### 2. **Hold System for Physical Books**

- Users can place holds **only on physical books** (or books with type "both")
- Electronic books cannot have holds placed on them
- Hold expiry is set to **48 hours** from creation
- Hold status tracked: `pending`, `available`, `cancelled`, `expired`

### 3. **Countdown Timer**

- User dashboard shows real-time countdown timer for each active hold
- Timer updates every second
- Color-coded:
  - **Blue**: More than 2 hours remaining
  - **Orange**: Less than 2 hours remaining (warning)
  - **Red**: Expired

### 4. **Fee System**

- If user doesn't pick up book within 48 hours, a **250 EGP fee** is automatically applied
- Fee is recorded in the `fines` table
- Fee is displayed in user dashboard
- Hold status changes to `expired` when fee is applied

### 5. **Fines Management**

- New `fines` table tracks all fees
- Fine types: `hold_expiry`, `overdue`, `damage`, `lost`
- Fine status: `pending`, `paid`, `waived`
- Users can view their fines in the dashboard

## 📋 Database Changes

### Books Table

- Added `book_type` ENUM('physical', 'electronic', 'both') DEFAULT 'physical'

### Holds Table

- Changed `hold_date` from DATE to DATETIME
- Added `expiry_datetime` DATETIME (48 hours from hold_date)
- Added `fee_amount` DECIMAL(10, 2) DEFAULT 0.00
- Added `fee_applied` BOOLEAN DEFAULT FALSE

### New Fines Table

- Tracks all fines with amount, type, status
- Links to holds and loans
- Includes description field

## 🔧 API Endpoints

### Holds

- `GET /api/holds` - Get user's holds
- `GET /api/holds/:id` - Get specific hold
- `POST /api/holds` - Create hold (only for physical books)
- `DELETE /api/holds/:id` - Cancel hold
- `POST /api/holds/process-expired` - Process expired holds and apply fees

### Fines

- `GET /api/fines` - Get user's fines
- `GET /api/fines/:id` - Get specific fine

## 🎯 How It Works

### Placing a Hold

1. User browses catalog
2. Finds a physical book that's unavailable
3. Clicks "Place Hold" button
4. System creates hold with 48-hour expiry
5. User sees countdown timer in dashboard

### Expiry and Fees

1. System checks for expired holds (via `/api/holds/process-expired`)
2. For each expired hold:
   - Status changed to `expired`
   - Fee of 250 EGP applied
   - Fine record created
   - User notified in dashboard

### Dashboard Display

- Shows countdown timer for each active hold
- Displays total fines amount
- Shows expired holds with fee information
- Updates every 30 seconds automatically

## 🚀 Setup Instructions

1. **Run Migration:**

   ```bash
   cd backend
   npm run migrate:book-type
   ```

2. **Process Expired Holds:**

   - Option 1: Call endpoint manually: `POST /api/holds/process-expired`
   - Option 2: Set up a cron job to call this endpoint periodically (recommended: every hour)

3. **Set Book Types:**
   - Admins can set book type when creating/editing books
   - Default is "physical" for existing books

## 📝 Notes

- **Hold Duration**: Fixed at 48 hours (can be changed in `holdController.js`)
- **Fee Amount**: Fixed at 250 EGP (can be changed in `holdController.js`)
- **Automatic Processing**: Expired holds need to be processed manually or via cron job
- **Electronic Books**: Cannot have holds - users can borrow directly when available

## 🔄 Recommended: Set Up Cron Job

For production, set up a cron job to automatically process expired holds:

```bash
# Run every hour
0 * * * * curl -X POST http://localhost:5000/api/holds/process-expired -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Or use a Node.js scheduler like `node-cron` in the backend.
