import { Request } from "express";
import jwt from "jsonwebtoken";
import { Document } from "mongodb";
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

export function signUser(user: Document): string {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );
}

export function publicUser(user: Document): Document {
  const { passwordHash, ...safe } = user;
  return safe;
}

export function oid(id: string | string[]): InstanceType<typeof ObjectId> {
  const value = Array.isArray(id) ? id[0] : id;
  if (!ObjectId.isValid(value)) throw new Error("Invalid ObjectId");
  return new ObjectId(value);
}

export function pageOptions(req: Request) {
  const page = Math.max(parseInt((req.query.page as string) || "1", 10), 1);
  const limit = Math.min(
    Math.max(parseInt((req.query.limit as string) || "10", 10), 1),
    100
  );
  return { page, limit, skip: (page - 1) * limit };
}

/** Returns ISO YYYY-MM string for the current month */
export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}