import express from "express";
import { connectDB, ObjectId } from "../config/db.js";
import { verifyToken } from "../middleware/auth.js";
import { oid, pageOptions, EXPENSE_CATEGORIES } from "../src/utils.js";

const router = express.Router();
router.use(verifyToken);

// GET /api/expenses?page=&limit=&category=&method=&month=&sort=
router.get("/", async (req, res) => {
  try {
    const db = await connectDB();
    const { page, limit, skip } = pageOptions(req);
    const { category, method, month, sort } = req.query;

    const filter = { userId: req.user._id.toString() };
    if (category) filter.category = category;
    if (method) filter.paymentMethod = method;
    if (month) {
      // month = "2025-07"
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      filter.date = { $gte: start, $lt: end };
    }

    const sortMap = {
      date_desc: { date: -1 },
      date_asc: { date: 1 },
      amount_desc: { amount: -1 },
      amount_asc: { amount: 1 },
    };
    const sortOpt = sortMap[sort] || { date: -1 };

    const [expenses, total] = await Promise.all([
      db.collection("expenses").find(filter).sort(sortOpt).skip(skip).limit(limit).toArray(),
      db.collection("expenses").countDocuments(filter),
    ]);

    res.json({ expenses, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch expenses" });
  }
});

// GET /api/expenses/summary?month=2025-07
router.get("/summary", async (req, res) => {
  try {
    const db = await connectDB();
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const pipeline = [
      {
        $match: {
          userId: req.user._id.toString(),
          date: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ];

    const byCategory = await db.collection("expenses").aggregate(pipeline).toArray();
    const totalSpent = byCategory.reduce((s, c) => s + c.total, 0);

    // Last 30 days daily trend
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dailyTrend = await db
      .collection("expenses")
      .aggregate([
        {
          $match: {
            userId: req.user._id.toString(),
            date: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    res.json({ byCategory, totalSpent, dailyTrend, month });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch summary" });
  }
});

// POST /api/expenses
router.post("/", async (req, res) => {
  try {
    const { title, amount, category, paymentMethod, date, notes, receiptUrl } = req.body;
    if (!title || !amount || !category)
      return res.status(400).json({ message: "Title, amount, and category are required" });
    if (!EXPENSE_CATEGORIES.includes(category))
      return res.status(400).json({ message: "Invalid category" });

    const db = await connectDB();
    const expense = {
      userId: req.user._id.toString(),
      title,
      amount: Number(amount),
      category,
      paymentMethod: paymentMethod || "Cash",
      date: date ? new Date(date) : new Date(),
      notes: notes || "",
      receiptUrl: receiptUrl || null,
      createdAt: new Date(),
    };
    const result = await db.collection("expenses").insertOne(expense);
    res.status(201).json({ ...expense, _id: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add expense" });
  }
});

// PATCH /api/expenses/:id
router.patch("/:id", async (req, res) => {
  try {
    const db = await connectDB();
    const { title, amount, category, paymentMethod, date, notes, receiptUrl } = req.body;
    const update = {};
    if (title) update.title = title;
    if (amount !== undefined) update.amount = Number(amount);
    if (category) update.category = category;
    if (paymentMethod) update.paymentMethod = paymentMethod;
    if (date) update.date = new Date(date);
    if (notes !== undefined) update.notes = notes;
    if (receiptUrl !== undefined) update.receiptUrl = receiptUrl;
    update.updatedAt = new Date();

    const result = await db.collection("expenses").findOneAndUpdate(
      { _id: oid(req.params.id), userId: req.user._id.toString() },
      { $set: update },
      { returnDocument: "after" }
    );
    if (!result) return res.status(404).json({ message: "Expense not found" });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update expense" });
  }
});

// DELETE /api/expenses/:id
router.delete("/:id", async (req, res) => {
  try {
    const db = await connectDB();
    const result = await db
      .collection("expenses")
      .deleteOne({ _id: oid(req.params.id), userId: req.user._id.toString() });
    if (result.deletedCount === 0)
      return res.status(404).json({ message: "Expense not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete expense" });
  }
});

export default router;
