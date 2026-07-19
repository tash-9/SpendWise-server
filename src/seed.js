/**
 * Seed script — creates a demo user + 2 months of realistic expense data
 * Run: npm run seed
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "../config/db.js";
import { EXPENSE_CATEGORIES } from "./utils.js";

const DEMO_EMAIL = "demo@spendwise.ai";
const DEMO_PASSWORD = "demo1234";

const SAMPLE_EXPENSES = [
  // Current month
  { title: "Lunch at Gulshan", category: "Food & Dining", amount: 350, paymentMethod: "Cash" },
  { title: "Uber ride home", category: "Transport", amount: 180, paymentMethod: "Mobile Banking" },
  { title: "Netflix subscription", category: "Subscriptions", amount: 780, paymentMethod: "Card" },
  { title: "Gym membership", category: "Health", amount: 1200, paymentMethod: "Card" },
  { title: "Groceries", category: "Food & Dining", amount: 2200, paymentMethod: "Cash" },
  { title: "Online course", category: "Education", amount: 3500, paymentMethod: "Card" },
  { title: "Electricity bill", category: "Bills & Utilities", amount: 1800, paymentMethod: "Mobile Banking" },
  { title: "Shopping at Bashundhara", category: "Shopping", amount: 4500, paymentMethod: "Card" },
  { title: "Dinner with friends", category: "Food & Dining", amount: 850, paymentMethod: "Cash" },
  { title: "Pathao ride", category: "Transport", amount: 120, paymentMethod: "Mobile Banking" },
  { title: "Spotify", category: "Subscriptions", amount: 199, paymentMethod: "Card" },
  { title: "Doctor visit", category: "Health", amount: 600, paymentMethod: "Cash" },
  { title: "Shawarma delivery", category: "Food & Dining", amount: 490, paymentMethod: "Mobile Banking" },
  { title: "Internet bill", category: "Bills & Utilities", amount: 950, paymentMethod: "Mobile Banking" },
  { title: "Stationary", category: "Education", amount: 350, paymentMethod: "Cash" },
];

async function seed() {
  const db = await connectDB();

  // Upsert demo user
  const existing = await db.collection("users").findOne({ email: DEMO_EMAIL });
  let userId;

  if (existing) {
    userId = existing._id;
    console.log("Demo user already exists, skipping user creation.");
  } else {
    const user = {
      email: DEMO_EMAIL,
      name: "Demo User",
      avatar: "https://api.dicebear.com/9.x/initials/svg?seed=Demo",
      currency: "BDT",
      role: "user",
      monthlyIncome: 35000,
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
      createdAt: new Date(),
    };
    const result = await db.collection("users").insertOne(user);
    userId = result.insertedId;
    console.log("Created demo user:", DEMO_EMAIL);
  }

  // Seed expenses for current + previous month
  await db.collection("expenses").deleteMany({ userId: userId.toString() });

  const now = new Date();
  const expenses = [];

  for (let monthOffset of [0, -1]) {
    for (const e of SAMPLE_EXPENSES) {
      const date = new Date(now.getFullYear(), now.getMonth() + monthOffset, Math.floor(Math.random() * 28) + 1);
      expenses.push({
        ...e,
        userId: userId.toString(),
        date,
        notes: "",
        receiptUrl: null,
        createdAt: new Date(),
      });
    }
  }

  await db.collection("expenses").insertMany(expenses);
  console.log(`Inserted ${expenses.length} expenses`);

  // Seed budgets for current month
  const month = now.toISOString().slice(0, 7);
  await db.collection("budgets").deleteMany({ userId: userId.toString(), month });

  const budgets = [
    { category: "Food & Dining", limit: 5000 },
    { category: "Transport", limit: 1500 },
    { category: "Subscriptions", limit: 1000 },
    { category: "Shopping", limit: 5000 },
    { category: "Health", limit: 2000 },
    { category: "Education", limit: 4000 },
    { category: "Bills & Utilities", limit: 3000 },
  ].map((b) => ({
    ...b,
    userId: userId.toString(),
    month,
    createdAt: new Date(),
  }));

  await db.collection("budgets").insertMany(budgets);
  console.log("Seeded budgets");

  // Seed goals
  await db.collection("goals").deleteMany({ userId: userId.toString() });
  const goals = [
    { title: "Emergency Fund", icon: "🛡️", targetAmount: 100000, savedAmount: 32000, description: "6 months of expenses as safety net" },
    { title: "New Laptop", icon: "💻", targetAmount: 80000, savedAmount: 15000, description: "MacBook for development work", deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
    { title: "Vacation Fund", icon: "✈️", targetAmount: 50000, savedAmount: 8000, description: "Trip to Thailand", deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) },
  ].map((g) => ({ ...g, userId: userId.toString(), createdAt: new Date() }));

  await db.collection("goals").insertMany(goals);
  console.log("Seeded goals");

  console.log("\n✅ Seed complete!");
  console.log(`Demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
