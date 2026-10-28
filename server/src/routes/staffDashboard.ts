import { Router } from "express";
import { PrismaClient, Role } from "@prisma/client";
import { requireAuth, requireRole } from "../middleware/auth";
import { staffDashboard } from "../services/dashboard";

// IT Staff dashboard (api-spec.md section 9).
const router = Router();
const prisma = new PrismaClient();

router.use(requireAuth, requireRole(Role.IT_STAFF, Role.ADMINISTRATOR));

router.get("/dashboard", async (req, res) => {
  try {
    res.json(await staffDashboard(prisma, req.auth!.userId, req.auth!.role));
  } catch (err) {
    console.error("Staff dashboard failed:", err);
    res.status(500).json({ error: "Something went wrong.", code: "INTERNAL" });
  }
});

export default router;
