# SpendWise AI Server

SpendWise AI Server is the backend REST API for the SpendWise budget and expense management platform. It provides secure authentication, expense tracking, budget management with spending alerts, savings goal tracking, and AI-powered financial insights. The server helps users track spending, stay within budget, and reach savings goals through a secure and scalable API.

## Purpose

SpendWise AI is a full-stack budget and expense management platform. The backend provides secure authentication, expense CRUD with filtering and pagination, category-based budgeting with real-time spend tracking, savings goal management, dashboard statistics with monthly trends, and AI-powered coaching features backed by Groq.

---

## 🔗 Live URL

- **Backend API:** [https://spendwise-server-production-451d.up.railway.app](https://spendwise-server-production-451d.up.railway.app)

---

Health Check:
```
{"name":"SpendWise AI API","status":"healthy","version":"1.0.0","timestamp":"2025-01-01T00:00:00.000Z","database":"connected"}
```

---

## Key Features

- JWT-based authentication with email/password and Google sign-in
- Expense tracking with category, payment method, date, and month filters
- Category-based budgets with automatic spend/remaining calculation and 80% alert threshold
- Savings goals with progress tracking and deadlines
- Dashboard statistics: monthly totals, month-over-month change, 6-month trend, budget alerts
- AI-powered financial coaching via Groq (spending coach, purchase advisor, weekly reflection, goal coach, chat assistant, receipt analysis)
- Password encryption using bcryptjs
- Auto-seedable demo user with two months of sample data
- Written in TypeScript
- CORS-enabled for frontend consumption

---

## Technologies Used

- Node.js
- Express.js
- TypeScript
- MongoDB
- JWT (jsonwebtoken)
- bcryptjs
- Groq API (AI features)
- CORS
- dotenv

## NPM Packages Used

- express
- mongodb
- jsonwebtoken
- bcryptjs
- cors
- dotenv
- typescript
- tsx
- nodemon

---

## Project Structure

```
config/
│   └── db.tsx          # MongoDB connection
src/
├── index.tsx           # App entry point, middleware, route mounting
├── seed.tsx             # Auto-seeds demo user with sample expenses, budgets, goals
├── utils.tsx            # Shared helpers (categories, pagination, ObjectId, JWT sign)
middleware/
    └── auth.tsx          # JWT verification, role guard
routes/
    ├── auth.tsx          # Register, login, Google login, /me
    ├── expenses.tsx       # Expense CRUD with filters, pagination, monthly summary
    ├── budgets.tsx         # Budget CRUD, upsert per category/month
    ├── goals.tsx           # Savings goal CRUD
    ├── ai.tsx              # AI coaching endpoints (spending coach, purchase advisor, chat, etc.)
    └── stats.tsx            # Dashboard statistics
```

---

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/spendwise-server.git
cd spendwise-server

# Install dependencies
npm install

# Check connection with Database
npm run seed

# Start development server
npm run dev
```

---

## Scripts

```bash
npm run dev      # Start with nodemon + tsx (auto-restart on changes)
npm run build    # Compile TypeScript to dist/
npm start        # Build and start production server
npm run seed     # Run seed script manually
```

---

## Demo Credentials

After seeding, log in with:
```
Email:    demo@spendwise.ai
Password: demo1234
```

---

## Author

Tasfia Islam Raisha
