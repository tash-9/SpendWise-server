import express from "express";
import { connectDB, ObjectId } from "../config/db.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();
router.use(verifyToken);

const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

async function callAI(systemPrompt, userMessage) {
  const res = await fetch(GROQ_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error: ${err}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

async function buildUserContext(userId, db) {
  const month = new Date().toISOString().slice(0, 7);
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  const [user, expenses, budgets, goals] = await Promise.all([
    db.collection("users").findOne({ _id: userId }),
    db.collection("expenses").find({ userId: userId.toString(), date: { $gte: start, $lt: end } }).toArray(),
    db.collection("budgets").find({ userId: userId.toString(), month }).toArray(),
    db.collection("goals").find({ userId: userId.toString() }).toArray(),
  ]);

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = {};
  expenses.forEach((e) => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });

  return {
    user: { name: user.name, income: user.monthlyIncome || 0 },
    month,
    totalSpent,
    byCategory,
    budgets: budgets.map((b) => ({ category: b.category, limit: b.limit, spent: byCategory[b.category] || 0 })),
    goals: goals.map((g) => ({ title: g.title, target: g.targetAmount, saved: g.savedAmount, deadline: g.deadline })),
  };
}

router.post("/spending-coach", async (req, res) => {
  try {
    const db = await connectDB();
    const ctx = await buildUserContext(req.user._id, db);
    const system = `You are a personal spending coach AI integrated into SpendWise, a budget management app.
You have access to the user's real financial data for the current month.
Be specific, empathetic, and actionable. Keep responses under 200 words.
Use emojis sparingly for readability. Format key numbers clearly.`;
    const prompt = `User: ${ctx.user.name}
Monthly income: ${ctx.user.income}
Month: ${ctx.month}
Total spent: ${ctx.totalSpent}
Spending by category: ${JSON.stringify(ctx.byCategory)}
Budgets: ${JSON.stringify(ctx.budgets)}
Provide 3-4 specific, personalized insights about their spending this month. Point out what they did well and where they can improve.`;
    const analysis = await callAI(system, prompt);
    res.json({ analysis });
  } catch (err) {
    console.error("spending-coach error:", err.message);
    res.status(500).json({ message: "AI analysis failed" });
  }
});

router.post("/purchase-advisor", async (req, res) => {
  try {
    const { item, price } = req.body;
    if (!item || !price) return res.status(400).json({ message: "Item name and price are required" });
    const db = await connectDB();
    const ctx = await buildUserContext(req.user._id, db);
    const system = `You are a Purchase Advisor AI in SpendWise.
Analyze whether a user can afford a specific purchase given their current financial situation.
Be direct, honest, and helpful. Consider their savings goals and remaining budget.
Keep your response under 150 words. Be conversational.`;
    const prompt = `${ctx.user.name} wants to buy: "${item}" for ${price}
Current month spent: ${ctx.totalSpent} / Income: ${ctx.user.income}
Budget status: ${JSON.stringify(ctx.budgets)}
Savings goals: ${JSON.stringify(ctx.goals)}
Should they buy this now? Give a clear YES/WAIT/NO recommendation with 2-3 sentences of reasoning.`;
    const advice = await callAI(system, prompt);
    res.json({ advice });
  } catch (err) {
    console.error("purchase-advisor error:", err.message);
    res.status(500).json({ message: "Purchase advice failed" });
  }
});

router.post("/weekly-reflection", async (req, res) => {
  try {
    const db = await connectDB();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const [expenses, budgets] = await Promise.all([
      db.collection("expenses").find({ userId: req.user._id.toString(), date: { $gte: sevenDaysAgo } }).toArray(),
      db.collection("budgets").find({ userId: req.user._id.toString() }).toArray(),
    ]);
    const weekTotal = expenses.reduce((s, e) => s + e.amount, 0);
    const byCategory = {};
    expenses.forEach((e) => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
    const system = `You are a Weekly Reflection AI in SpendWise.
Generate a concise weekly financial recap with: ✅ wins, ⚠ warnings, 💡 insights.
Keep it friendly and specific. Under 180 words. Use actual numbers from the data.`;
    const prompt = `User: ${req.user.name}
Past 7 days of expenses: ${JSON.stringify(expenses.map((e) => ({ category: e.category, amount: e.amount, title: e.title })))}
Total spent this week: ${weekTotal}
Monthly budgets: ${JSON.stringify(budgets)}
Category breakdown: ${JSON.stringify(byCategory)}
Generate their weekly reflection report.`;
    const reflection = await callAI(system, prompt);
    res.json({ reflection });
  } catch (err) {
    console.error("weekly-reflection error:", err.message);
    res.status(500).json({ message: "Weekly reflection failed" });
  }
});

router.post("/goal-coach", async (req, res) => {
  try {
    const { goalId } = req.body;
    if (!goalId) return res.status(400).json({ message: "goalId is required" });
    const db = await connectDB();
    const goalDoc = await db.collection("goals").findOne({
      _id: new ObjectId(goalId),
      userId: req.user._id.toString(),
    });
    if (!goalDoc) return res.status(404).json({ message: "Goal not found" });
    const ctx = await buildUserContext(req.user._id, db);
    const system = `You are a Goal Coach AI in SpendWise.
Help the user create a concrete, achievable plan to reach their savings goal.
Be specific with monthly savings targets. Suggest which spending categories to reduce.
Keep response under 200 words. Use encouraging but realistic tone.`;
    const prompt = `Goal: "${goalDoc.title}"
Target: ${goalDoc.targetAmount} | Already saved: ${goalDoc.savedAmount}
Remaining: ${goalDoc.targetAmount - goalDoc.savedAmount}
Deadline: ${goalDoc.deadline || "No deadline set"}
User context:
Monthly income: ${ctx.user.income}
Current month spending: ${ctx.totalSpent}
Spending by category: ${JSON.stringify(ctx.byCategory)}
Create a personalized savings plan for this goal.`;
    const plan = await callAI(system, prompt);
    res.json({ plan });
  } catch (err) {
    console.error("goal-coach error:", err.message);
    res.status(500).json({ message: "Goal coaching failed" });
  }
});

router.post("/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ message: "Message is required" });
    const db = await connectDB();
    const ctx = await buildUserContext(req.user._id, db);
    const systemPrompt = `You are FinBot, ${req.user.name}'s personal financial assistant inside SpendWise.
You have real-time access to their financial data. Be conversational, specific, and helpful.
Answer questions about their spending, budgets, and goals using their actual data.
Keep responses concise (under 150 words) unless a detailed explanation is needed.
Current financial snapshot:
- Monthly income: ${ctx.user.income}
- Month: ${ctx.month}
- Total spent: ${ctx.totalSpent}
- By category: ${JSON.stringify(ctx.byCategory)}
- Budgets: ${JSON.stringify(ctx.budgets)}
- Goals: ${JSON.stringify(ctx.goals)}`;
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10).map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: message },
    ];
    const aiRes = await fetch(GROQ_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 1024, messages }),
    });
    if (!aiRes.ok) {
      const err = await aiRes.text();
      throw new Error(`Groq API error: ${err}`);
    }
    const data = await aiRes.json();
    const reply = data.choices[0].message.content;
    await db.collection("chatHistory").insertOne({
      userId: req.user._id.toString(),
      userMessage: message,
      aiReply: reply,
      createdAt: new Date(),
    });
    res.json({ reply });
  } catch (err) {
    console.error("chat error:", err.message);
    res.status(500).json({ message: "Chat failed" });
  }
});

// POST /api/ai/analyze-receipt — AI reads receipt image
router.post("/analyze-receipt", async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ message: "imageUrl is required" });

    const system = `You are a receipt analyzer. Extract expense information from receipt images.
Always respond with ONLY a valid JSON object, no extra text.
Extract: title (merchant/store name), amount (number only), category (one of: Food & Dining, Transport, Shopping, Entertainment, Health, Education, Bills & Utilities, Subscriptions, Travel, Other), date (YYYY-MM-DD format or today if not visible).`;

    const prompt = `Analyze this receipt image: ${imageUrl}
Return ONLY this JSON format:
{
  "title": "merchant name",
  "amount": 0,
  "category": "Food & Dining",
  "date": "2025-07-20",
  "notes": "brief description"
}`;

    const text = await callAI(system, prompt);
    const clean = text.replace(/```json|```/g, "").trim();
    const data = JSON.parse(clean);
    res.json(data);
  } catch (err) {
    console.error("analyze-receipt error:", err.message);
    res.status(500).json({ message: "Receipt analysis failed" });
  }
});

export default router;