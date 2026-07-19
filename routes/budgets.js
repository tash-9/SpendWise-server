import express from "express";
import { connectDB } from "../config/db.js";
import { verifyToken } from "../middleware/auth.js";
import { oid, EXPENSE_CATEGORIES } from "../src/utils.js";

const router = express.Router();
router.use(verifyToken);

// GET /api/budgets?month=2025-07
router.get("/", async (req, res) => {
  try {
    const db = await connectDB();
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const budgets = await db
      .collection("budgets")
      .find({ userId: req.user._id.toString(), month })
      .toArray();

    // Enrich with actual spending
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const spending = await db
      .collection("expenses")
      .aggregate([
        {
          $match: {
            userId: req.user._id.toString(),
            date: { $gte: start, $lt: end },
          },
        },
        { $group: { _id: "$category", spent: { $sum: "$amount" } } },
      ])
      .toArray();

    const spendMap = Object.fromEntries(spending.map((s) => [s._id, s.spent]));
    const enriched = budgets.map((b) => ({
      ...b,
      spent: spendMap[b.category] || 0,
      remaining: b.limit - (spendMap[b.category] || 0),
    }));

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch budgets" });
  }
});

// POST /api/budgets
router.post("/", async (req, res) => {
  try {
    const { category, limit, month } = req.body;
    if (!category || !limit)
      return res.status(400).json({ message: "Category and limit are required" });
    if (!EXPENSE_CATEGORIES.includes(category))
      return res.status(400).json({ message: "Invalid category" });

    const db = await connectDB();
    const m = month || new Date().toISOString().slice(0, 7);

    // Upsert — one budget per category per month per user
    const result = await db.collection("budgets").findOneAndUpdate(
      { userId: req.user._id.toString(), category, month: m },
      { $set: { limit: Number(limit), updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, returnDocument: "after" }
    );
    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save budget" });
  }
});

// DELETE /api/budgets/:id
router.delete("/:id", async (req, res) => {
  try {
    const db = await connectDB();
    await db
      .collection("budgets")
      .deleteOne({ _id: oid(req.params.id), userId: req.user._id.toString() });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete budget" });
  }
});

export default router;
