import { Router } from "express";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { signToken, requireAuth } from "../middleware/auth";

const prisma = new PrismaClient();
const router = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: false, // set true once served over HTTPS
  maxAge: 8 * 60 * 60 * 1000, // 8h
};

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken({ userId: user.id, role: user.role });
  res.cookie("token", token, COOKIE_OPTIONS);
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  });
});

router.post("/logout", (_req, res) => {
  res.clearCookie("token", COOKIE_OPTIONS);
  res.status(204).send();
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  if (!user || !user.isActive) return res.status(401).json({ error: "Not authenticated" });
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  });
});

router.post("/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new password are required" });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }

  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return res.status(400).json({ error: "Current password is incorrect" });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  res.status(204).send();
});

export default router;