import express from "express";
import { connectDB } from "../config/db.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();
router.use(verifyToken);

// GET /api/stats/dashboard
router.get("/dashboard", async (req, res) => {
  try {
    const db = await connectDB();
    const userId = req.user._id.toString();
    const now = new Date();

    // Current month
    const currentMonth = now.toISOString().slice(0, 7);
    const currentStart = new Date(`${currentMonth}-01T00:00:00.000Z`);
    const currentEnd = new Date(currentStart);
    currentEnd.setMonth(currentEnd.getMonth() + 1);

    // Previous month
    const prevDate = new Date(currentStart);
    prevDate.setMonth(prevDate.getMonth() - 1);
    const prevMonth = prevDate.toISOString().slice(0, 7);
    const prevStart = new Date(`${prevMonth}-01T00:00:00.000Z`);

    const [currentExpenses, prevExpenses, budgets, goals, recentExpenses] = await Promise.all([
      db.collection("expenses").find({ userId, date: { $gte: currentStart, $lt: currentEnd } }).toArray(),
      db.collection("expenses").find({ userId, date: { $gte: prevStart, $lt: currentStart } }).toArray(),
      db.collection("budgets").find({ userId, month: currentMonth }).toArray(),
      db.collection("goals").find({ userId }).toArray(),
      db.collection("expenses").find({ userId }).sort({ date: -1 }).limit(5).toArray(),
    ]);

    const currentTotal = currentExpenses.reduce((s, e) => s + e.amount, 0);
    const prevTotal = prevExpenses.reduce((s, e) => s + e.amount, 0);
    const income = req.user.monthlyIncome || 0;
    const savings = income - currentTotal;

    // Budget alerts (over 80%)
    const spendByCategory = {};
    currentExpenses.forEach((e) => {
      spendByCategory[e.category] = (spendByCategory[e.category] || 0) + e.amount;
    });
    const alerts = budgets
      .map((b) => ({ ...b, spent: spendByCategory[b.category] || 0 }))
      .filter((b) => b.spent / b.limit >= 0.8);

    // Monthly trend (last 6 months)
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentStart);
      d.setMonth(d.getMonth() - i);
      const m = d.toISOString().slice(0, 7);
      const s = new Date(`${m}-01T00:00:00.000Z`);
      const e2 = new Date(s);
      e2.setMonth(e2.getMonth() + 1);
      const monthly = await db
        .collection("expenses")
        .aggregate([
          { $match: { userId, date: { $gte: s, $lt: e2 } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
        .toArray();
      trend.push({ month: m, spent: monthly[0]?.total || 0 });
    }

    res.json({
      currentMonth,
      income,
      currentTotal,
      prevTotal,
      savings,
      change: prevTotal ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0,
      budgetAlerts: alerts,
      goals: goals.map((g) => ({
        ...g,
        progress: Math.min((g.savedAmount / g.targetAmount) * 100, 100),
      })),
      recentExpenses,
      monthlyTrend: trend,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load dashboard stats" });
  }
});

export default router;
