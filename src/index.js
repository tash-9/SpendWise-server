import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "../config/db.js";
import authRoutes from "../routes/auth.js";
import expenseRoutes from "../routes/expenses.js";
import budgetRoutes from "../routes/budgets.js";
import goalRoutes from "../routes/goals.js";
import aiRoutes from "../routes/ai.js";
import statsRoutes from "../routes/stats.js";

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: [
  "http://localhost:5173",
  "https://spend-wise-client-pi.vercel.app",
  "https://spend-wise-client-git-main-tasfia-islam-raisha-s-projects.vercel.app",],
  credentials: true }));
app.use(express.json({ limit: "4mb" }));

// Health check
app.get("/", async (req, res) => {
  try {
    await connectDB();
    res.json({
      name: "SpendWise AI API",
      status: "healthy",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch {
    res.json({ name: "SpendWise AI API", status: "healthy", database: "disconnected" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/stats", statsRoutes);

app.use((req, res) => res.status(404).json({ message: "Route not found" }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

connectDB()
  .then(() => {
    app.listen(port, () =>
      console.log(`SpendWise AI API running on port ${port}`)
    );
  })
  .catch((err) => {
    console.error("Failed to connect to database:", err);
    process.exit(1);
  });
