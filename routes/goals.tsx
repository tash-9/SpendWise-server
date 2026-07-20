import express, { Request, Response } from "express";
import { Document } from "mongodb";
import { connectDB } from "../config/db.js";
import { verifyToken } from "../middleware/auth.js";
import { oid } from "../src/utils.js";

const router = express.Router();
router.use(verifyToken);

// GET /api/goals
router.get("/", async (req: Request, res: Response) => {
  try {
    const db = await connectDB();
    const goals = await db
      .collection("goals")
      .find({ userId: req.user!._id.toString() })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(goals);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch goals" });
  }
});

// POST /api/goals
router.post("/", async (req: Request, res: Response) => {
  try {
    const { title, targetAmount, savedAmount, deadline, description, icon } = req.body;
    if (!title || !targetAmount)
      return res.status(400).json({ message: "Title and target amount are required" });

    const db = await connectDB();
    const goal: Document = {
      userId: req.user!._id.toString(),
      title,
      description: description || "",
      icon: icon || "🎯",
      targetAmount: Number(targetAmount),
      savedAmount: Number(savedAmount || 0),
      deadline: deadline ? new Date(deadline) : null,
      createdAt: new Date(),
    };
    const result = await db.collection("goals").insertOne(goal);
    res.status(201).json({ ...goal, _id: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: "Failed to create goal" });
  }
});

// PATCH /api/goals/:id
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const db = await connectDB();
    const { title, description, targetAmount, savedAmount, deadline, icon } = req.body;
    const update: Document = { updatedAt: new Date() };
    if (title) update.title = title;
    if (description !== undefined) update.description = description;
    if (icon) update.icon = icon;
    if (targetAmount !== undefined) update.targetAmount = Number(targetAmount);
    if (savedAmount !== undefined) update.savedAmount = Number(savedAmount);
    if (deadline !== undefined) update.deadline = deadline ? new Date(deadline) : null;

    const result = await db.collection("goals").findOneAndUpdate(
      { _id: oid(req.params.id), userId: req.user!._id.toString() },
      { $set: update },
      { returnDocument: "after" }
    );
    if (!result) return res.status(404).json({ message: "Goal not found" });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to update goal" });
  }
});

// DELETE /api/goals/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const db = await connectDB();
    await db
      .collection("goals")
      .deleteOne({ _id: oid(req.params.id), userId: req.user!._id.toString() });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete goal" });
  }
});

export default router;