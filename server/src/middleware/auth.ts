import { Request, Response, NextFunction } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import { PrismaClient, Role } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET as string;
const prisma = new PrismaClient();

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
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: (process.env.JWT_EXPIRES_IN || "8h") as SignOptions["expiresIn"],
  });
}

export function verifySessionToken(token: string | undefined): AuthPayload | null {
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

// Checks the cookie and re-reads the user (Lab 4 HARD-02): a deactivated account stops working at
// once (401) and the role comes from the database, not from a possibly stale token.
async function authenticate(req: Request, res: Response, allowPendingPasswordChange: boolean, next: NextFunction) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  const payload = verifySessionToken(token);
  if (!payload) return res.status(401).json({ error: "Invalid or expired session" });
  try {
    // Several routers can share one path prefix (/api/staff); load the user once per request.
    const cached = res.locals.sessionUser as { id: number; isActive: boolean; mustChangePassword: boolean; role: Role } | undefined;
    const user = cached && cached.id === payload.userId ? cached : await prisma.user.findUnique({ where: { id: payload.userId } });
    res.locals.sessionUser = user ?? undefined;
    if (!user || !user.isActive) return res.status(401).json({ error: "Not authenticated" });
    if (user.mustChangePassword && !allowPendingPasswordChange) {
      return res.status(403).json({ error: "You must change your password first.", code: "PASSWORD_CHANGE_REQUIRED" });
    }
    req.auth = { userId: user.id, role: user.role };
    next();
  } catch (err) {
    console.error("Session check failed:", err);
    res.status(500).json({ error: "Something went wrong.", code: "INTERNAL" });
  }
}

// Every API route except the session/password endpoints: blocks users who must change their password.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  return authenticate(req, res, false, next);
}

// /api/auth/me and /api/auth/change-password: reachable while a password change is pending.
export function requireSession(req: Request, res: Response, next: NextFunction) {
  return authenticate(req, res, true, next);
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ error: "Not authenticated" });
    if (!roles.includes(req.auth.role)) return res.status(403).json({ error: "Forbidden", code: "FORBIDDEN" });
    next();
  };
}