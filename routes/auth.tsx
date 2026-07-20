import express, { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { Document } from "mongodb";
import { connectDB } from "../config/db.js";
import { publicUser, signUser } from "../src/utils.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response) => {
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

    const user: Document = {
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
router.post("/login", async (req: Request, res: Response) => {
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
router.get("/me", verifyToken, (req: Request, res: Response) => {
  res.json(publicUser(req.user!));
});

// PATCH /api/auth/me  — update profile (income, currency, name, avatar)
router.patch("/me", verifyToken, async (req: Request, res: Response) => {
  try {
    const { name, avatar, currency, monthlyIncome } = req.body;
    const db = await connectDB();
    const update: Document = {};
    if (name) update.name = name;
    if (avatar) update.avatar = avatar;
    if (currency) update.currency = currency;
    if (monthlyIncome !== undefined) update.monthlyIncome = Number(monthlyIncome);

    await db
      .collection("users")
      .updateOne({ _id: req.user!._id }, { $set: update });
    const updated = await db.collection("users").findOne({ _id: req.user!._id });
    res.json(publicUser(updated!));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Profile update failed" });
  }
});

router.post("/google", async (req: Request, res: Response) => {
  try {
    const { email, name, avatar } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const db = await connectDB();
    let user: Document | null = await db.collection("users").findOne({ email: email.toLowerCase() });

    if (!user) {
      const newUser: Document = {
        email: email.toLowerCase(),
        name,
        avatar: avatar || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`,
        currency: "BDT",
        role: "user",
        monthlyIncome: 0,
        passwordHash: "",
        provider: "google",
        createdAt: new Date(),
      };
      const result = await db.collection("users").insertOne(newUser);
      newUser._id = result.insertedId;
      user = newUser;
    }

    res.json({ token: signUser(user!), user: publicUser(user!) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Google login failed" });
  }
});

export default router;