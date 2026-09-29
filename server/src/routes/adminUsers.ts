import { Router } from "express";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

router.use(requireAuth, requireRole(Role.ADMINISTRATOR));

function generateTempPassword() {
  return crypto.randomBytes(6).toString("base64url") + "!1";
}

function serializeUser(u: {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
}) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    mustChangePassword: u.mustChangePassword,
    createdAt: u.createdAt,
  };
}

router.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
  res.json(users.map(serializeUser));
});

router.post("/", async (req, res) => {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const role = req.body.role;

  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "required, at least 2 characters";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "must be a valid email";
  if (!Object.values(Role).includes(role)) errors.role = "must be REQUESTER, IT_STAFF, or ADMINISTRATOR";

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "A user with this email already exists." });
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const user = await prisma.user.create({
    data: { name, email, role, passwordHash, mustChangePassword: true, isActive: true },
  });

  res.status(201).json({ ...serializeUser(user), tempPassword });
});

router.patch("/:id", async (req, res) => {
  const userId = Number(req.params.id);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const data: any = {};

  if (req.body.name !== undefined) {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    if (name.length < 2) {
      return res.status(400).json({ errors: { name: "required, at least 2 characters" } });
    }
    data.name = name;
  }

  if (req.body.role !== undefined) {
    if (!Object.values(Role).includes(req.body.role)) {
      return res.status(400).json({ errors: { role: "must be REQUESTER, IT_STAFF, or ADMINISTRATOR" } });
    }
    data.role = req.body.role;
  }

  if (req.body.isActive !== undefined) {
    data.isActive = Boolean(req.body.isActive);
  }

  const updated = await prisma.user.update({ where: { id: userId }, data });
  res.json(serializeUser(updated));
});

router.post("/:id/reset-password", async (req, res) => {
  const userId = Number(req.params.id);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: true },
  });

  res.json({ id: userId, tempPassword });
});

export default router;