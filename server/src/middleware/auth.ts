import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET as string;

export interface AuthPayload {
  userId: number;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "8h" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    req.auth = jwt.verify(token, JWT_SECRET) as AuthPayload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ error: "Not authenticated" });
    if (!roles.includes(req.auth.role)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}