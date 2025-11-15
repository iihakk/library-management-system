# Application Architecture

This Library Management System uses a **Layered Architecture (N-Tier Architecture)** pattern, combined with **Component-Based Architecture** for the frontend.

## Overall Architecture Pattern

### **Backend: Layered Architecture (3-Tier)**

The backend follows a classic **3-Tier Layered Architecture**:

```
┌─────────────────────────────────────┐
│      Presentation Layer             │
│  (Routes + Middleware)              │
├─────────────────────────────────────┤
│      Business Logic Layer           │
│  (Controllers)                       │
├─────────────────────────────────────┤
│      Data Access Layer              │
│  (Database Connection + SQL)         │
└─────────────────────────────────────┘
```

### **Frontend: Component-Based Architecture**

The frontend uses **Component-Based Architecture** with **Context API** for state management:

```
┌─────────────────────────────────────┐
│      Pages (Next.js App Router)     │
├─────────────────────────────────────┤
│      Components                     │
├─────────────────────────────────────┤
│      Contexts (State Management)    │
├─────────────────────────────────────┤
│      Utilities/Lib                  │
└─────────────────────────────────────┘
```

---

## Backend Architecture (Layered/N-Tier)

### **Layer 1: Presentation Layer** (`/routes` + `/middleware`)

**Purpose:** Handle HTTP requests, routing, and request validation

**Components:**
- **Routes** (`/routes/*.js`): Define API endpoints and map them to controllers
- **Middleware** (`/middleware/authMiddleware.js`): Handle cross-cutting concerns (authentication, authorization)

**Responsibilities:**
- Route definition and HTTP method mapping
- Request parsing and validation
- Authentication/authorization checks
- Response formatting

**Example Flow:**
```
HTTP Request → Route → Middleware (if needed) → Controller
```

**Files:**
- `routes/authRoutes.js`
- `routes/bookRoutes.js`
- `routes/loanRoutes.js`
- `routes/holdRoutes.js`
- `middleware/authMiddleware.js`

### **Layer 2: Business Logic Layer** (`/controllers`)

**Purpose:** Contains business logic, validation, and orchestrates data operations

**Components:**
- **Controllers** (`/controllers/*.js`): Handle business logic for each domain

**Responsibilities:**
- Business rule validation
- Data transformation
- Error handling
- Orchestrating multiple data operations
- Security (password hashing, JWT generation)

**Example:**
- `authController.js`: Handles signup, login, logout logic
- `bookController.js`: Handles book CRUD operations
- `loanController.js`: Handles loan creation, return logic

**Files:**
- `controllers/authController.js`
- `controllers/bookController.js`
- `controllers/loanController.js`
- `controllers/holdController.js`

### **Layer 3: Data Access Layer** (`/config/database.js`)

**Purpose:** Handles all database interactions

**Components:**
- **Database Connection Pool**: MySQL connection management
- **SQL Queries**: Direct SQL execution (no ORM)

**Responsibilities:**
- Database connection management
- SQL query execution
- Transaction management (if needed)
- Connection pooling

**Files:**
- `config/database.js` - Connection pool configuration
- SQL queries are embedded in controllers (could be extracted to a models/repository layer)

**Note:** Currently using **Data Access Object (DAO) pattern** embedded in controllers. Could be refactored to a separate repository/model layer.

---

## Frontend Architecture (Component-Based)

### **Layer 1: Pages** (`/app` - Next.js App Router)

**Purpose:** Route-level components that represent full pages

**Structure:**
- Uses Next.js 14 App Router
- Each route is a folder with `page.tsx`
- `layout.tsx` provides shared layout

**Files:**
- `app/page.tsx` - Home page
- `app/login/page.tsx` - Login page
- `app/signup/page.tsx` - Signup page
- `app/dashboard/page.tsx` - Dashboard page
- `app/catalog/page.tsx` - Catalog page
- `app/layout.tsx` - Root layout

### **Layer 2: Components** (`/components`)

**Purpose:** Reusable UI components

**Files:**
- `components/ProtectedRoute.tsx` - Route protection wrapper

### **Layer 3: Contexts** (`/contexts`)

**Purpose:** Global state management using React Context API

**Files:**
- `contexts/AuthContext.tsx` - Authentication state and methods

**Pattern:** Context API (React's built-in state management)

### **Layer 4: Utilities** (`/lib`)

**Purpose:** Shared utility functions and helpers

**Files:**
- `lib/validation.ts` - Form validation utilities

---

## Data Flow

### **Backend Request Flow:**

```
1. HTTP Request arrives
   ↓
2. Express Middleware (CORS, JSON parsing)
   ↓
3. Route Handler (routes/*.js)
   ↓
4. Authentication Middleware (if protected route)
   ↓
5. Controller (controllers/*.js)
   - Validates input
   - Executes business logic
   - Calls database
   ↓
6. Database (MySQL via mysql2)
   ↓
7. Response sent back through layers
```

### **Frontend Request Flow:**

```
1. User Action (button click, form submit)
   ↓
2. Component/Page Event Handler
   ↓
3. Context Method (e.g., AuthContext.login)
   ↓
4. API Call (fetch to backend)
   ↓
5. Update Context State
   ↓
6. Re-render UI
```

---

## Architecture Patterns Used

### 1. **Layered Architecture (Backend)**
- Separation of concerns
- Each layer has a specific responsibility
- Easy to test and maintain

### 2. **Component-Based Architecture (Frontend)**
- Reusable components
- Separation of UI logic
- Easy to scale

### 3. **MVC-like Pattern** (Backend)
- **Model**: Database schema + SQL queries
- **View**: JSON responses (REST API)
- **Controller**: Business logic in controllers

### 4. **Repository Pattern** (Implicit)
- Database queries are in controllers
- Could be extracted to a repository layer for better separation

### 5. **Middleware Pattern**
- Cross-cutting concerns (auth, CORS, error handling)
- Applied at the route level

### 6. **Context API Pattern** (Frontend)
- Global state management
- Avoids prop drilling

---

## Current Structure

```
library-management-system/
├── backend/                    # Backend (Layered Architecture)
│   ├── config/                 # Configuration Layer
│   │   ├── database.js         # Data Access Layer
│   │   └── db-schema.sql      # Database Schema
│   ├── controllers/            # Business Logic Layer
│   │   ├── authController.js
│   │   ├── bookController.js
│   │   ├── loanController.js
│   │   └── holdController.js
│   ├── middleware/             # Presentation Layer (Middleware)
│   │   └── authMiddleware.js
│   ├── routes/                 # Presentation Layer (Routes)
│   │   ├── authRoutes.js
│   │   ├── bookRoutes.js
│   │   ├── loanRoutes.js
│   │   └── holdRoutes.js
│   └── server.js               # Application Entry Point
│
└── src/                        # Frontend (Component-Based)
    ├── app/                    # Pages Layer
    │   ├── page.tsx
    │   ├── login/page.tsx
    │   ├── signup/page.tsx
    │   ├── dashboard/page.tsx
    │   ├── catalog/page.tsx
    │   └── layout.tsx
    ├── components/              # Components Layer
    │   └── ProtectedRoute.tsx
    ├── contexts/                # State Management Layer
    │   └── AuthContext.tsx
    └── lib/                     # Utilities Layer
        └── validation.ts
```

---

## Design Principles Applied

1. **Separation of Concerns**: Each layer has a single responsibility
2. **Single Responsibility Principle**: Each file/function does one thing
3. **DRY (Don't Repeat Yourself)**: Reusable components and utilities
4. **Dependency Injection**: Controllers depend on database connection pool
5. **RESTful API Design**: Standard HTTP methods and status codes

---

## Potential Improvements

### Backend:
1. **Add Repository/Model Layer**: Extract SQL queries from controllers
2. **Add Service Layer**: Separate business logic from controllers
3. **Add DTOs (Data Transfer Objects)**: For request/response validation
4. **Add Validation Layer**: Use libraries like Joi or express-validator

### Frontend:
1. **Add Custom Hooks**: Extract reusable logic
2. **Add State Management**: Consider Redux/Zustand for complex state
3. **Add API Client Layer**: Centralized API calls
4. **Add Error Boundary**: Better error handling

---

## Summary

**Backend:** **Layered Architecture (3-Tier)**
- Presentation Layer (Routes + Middleware)
- Business Logic Layer (Controllers)
- Data Access Layer (Database Connection)

**Frontend:** **Component-Based Architecture**
- Pages (Route Components)
- Components (Reusable UI)
- Contexts (State Management)
- Utilities (Helper Functions)

This architecture provides:
- ✅ Clear separation of concerns
- ✅ Easy to test and maintain
- ✅ Scalable structure
- ✅ Follows industry best practices

