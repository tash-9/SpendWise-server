import jwt from "jsonwebtoken";
import { connectDB, ObjectId } from "../config/db.js";

/**
 * verifyToken — attaches req.user or returns 401.
 * Single source of truth for authentication; no duplicate middleware files.
 */
export async function verifyToken(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token)
      return res.status(401).json({ message: "Authentication token missing" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = await connectDB();
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(decoded.id) });
    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }
    next();
  };
}
