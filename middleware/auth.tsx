import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Document, WithId } from "mongodb";
import { connectDB, ObjectId } from "../config/db.js";

interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: WithId<Document>;
    }
  }
}

export async function verifyToken(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token)
      return res.status(401).json({ message: "Authentication token missing" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
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

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role as string)) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }
    next();
  };
}