import express from "express";
import bcrypt from "bcryptjs";
import { connectDB } from "../config/db.js";
import { publicUser, signUser } from "../src/utils.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, name, avatar, password, currency = "BDT" } = req.body;
    if (!email || !name || !password)
      return res.status(400).json({ message: "Name, email, and password are required" });

    const db = await connectDB();
    const existing = await db
      .collection("users")
      .findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(409).json({ message: "Email already registered" });

    const user = {
      email: email.toLowerCase(),
      name,
      avatar:
        avatar ||
        `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`,
      currency,
      role: "user",
      monthlyIncome: 0,
      passwordHash: await bcrypt.hash(password, 10),
      createdAt: new Date(),
    };

    const result = await db.collection("users").insertOne(user);
    user._id = result.insertedId;
    res.status(201).json({ token: signUser(user), user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration failed" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const db = await connectDB();
    const user = await db.collection("users").findOne({
      email: String(req.body.email || "").toLowerCase(),
    });
    if (!user || !(await bcrypt.compare(req.body.password || "", user.passwordHash)))
      return res.status(401).json({ message: "Invalid email or password" });

    res.json({ token: signUser(user), user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
});

// GET /api/auth/me
router.get("/me", verifyToken, (req, res) => {
  res.json(publicUser(req.user));
});

// ONE-TIME SEED ROUTE — remove after seeding!
router.get("/seed-demo", async (req, res) => {
  try {
    const bcrypt = await import("bcryptjs");
    const db = await connectDB();

    // Create demo user
    const passwordHash = await bcrypt.default.hash("demo1234", 10);
    await db.collection("users").deleteOne({ email: "demo@spendwise.ai" });
    const user = {
      email: "demo@spendwise.ai",
      name: "Demo User",
      avatar: "https://api.dicebear.com/9.x/initials/svg?seed=Demo",
      currency: "BDT",
      role: "user",
      monthlyIncome: 35000,
      passwordHash,
      createdAt: new Date(),
    };
    const result = await db.collection("users").insertOne(user);
    const userId = result.insertedId.toString();

    // Delete old data
    await db.collection("expenses").deleteMany({ userId });
    await db.collection("budgets").deleteMany({ userId });
    await db.collection("goals").deleteMany({ userId });

    // Add expenses
    const now = new Date();
    const expenses = [];
    const SAMPLE = [
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

    for (const offset of [0, -1]) {
      for (const e of SAMPLE) {
        const date = new Date(now.getFullYear(), now.getMonth() + offset, Math.floor(Math.random() * 28) + 1);
        expenses.push({ ...e, userId, date, notes: "", receiptUrl: null, createdAt: new Date() });
      }
    }
    await db.collection("expenses").insertMany(expenses);

    // Add budgets
    const month = now.toISOString().slice(0, 7);
    await db.collection("budgets").insertMany([
      { category: "Food & Dining", limit: 5000, userId, month, createdAt: new Date() },
      { category: "Transport", limit: 1500, userId, month, createdAt: new Date() },
      { category: "Subscriptions", limit: 1000, userId, month, createdAt: new Date() },
      { category: "Shopping", limit: 5000, userId, month, createdAt: new Date() },
      { category: "Health", limit: 2000, userId, month, createdAt: new Date() },
      { category: "Education", limit: 4000, userId, month, createdAt: new Date() },
      { category: "Bills & Utilities", limit: 3000, userId, month, createdAt: new Date() },
    ]);

    // Add goals
    await db.collection("goals").insertMany([
      { title: "Emergency Fund", icon: "🛡️", targetAmount: 100000, savedAmount: 32000, description: "6 months of expenses", userId, createdAt: new Date() },
      { title: "New Laptop", icon: "💻", targetAmount: 80000, savedAmount: 15000, description: "MacBook for dev work", userId, createdAt: new Date(), deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
      { title: "Vacation Fund", icon: "✈️", targetAmount: 50000, savedAmount: 8000, description: "Trip to Thailand", userId, createdAt: new Date(), deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) },
    ]);

    res.json({ message: "✅ Seeded! demo@spendwise.ai / demo1234" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/auth/me  — update profile (income, currency, name, avatar)
router.patch("/me", verifyToken, async (req, res) => {
  try {
    const { name, avatar, currency, monthlyIncome } = req.body;
    const db = await connectDB();
    const update = {};
    if (name) update.name = name;
    if (avatar) update.avatar = avatar;
    if (currency) update.currency = currency;
    if (monthlyIncome !== undefined) update.monthlyIncome = Number(monthlyIncome);

    await db
      .collection("users")
      .updateOne({ _id: req.user._id }, { $set: update });
    const updated = await db.collection("users").findOne({ _id: req.user._id });
    res.json(publicUser(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Profile update failed" });
  }
});

export default router;
