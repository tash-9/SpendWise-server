import jwt from "jsonwebtoken";
import { ObjectId } from "../config/db.js";

export const EXPENSE_CATEGORIES = [
  "Food & Dining",
  "Transport",
  "Shopping",
  "Entertainment",
  "Health",
  "Education",
  "Bills & Utilities",
  "Subscriptions",
  "Travel",
  "Other",
];

export const PAYMENT_METHODS = [
  "Cash",
  "Card",
  "Mobile Banking",
  "Bank Transfer",
  "Other",
];

export function signUser(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function publicUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

export function oid(id) {
  if (!ObjectId.isValid(id)) throw new Error("Invalid ObjectId");
  return new ObjectId(id);
}

export function pageOptions(req) {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(
    Math.max(parseInt(req.query.limit || "10", 10), 1),
    100
  );
  return { page, limit, skip: (page - 1) * limit };
}

/** Returns ISO YYYY-MM string for the current month */
export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}
