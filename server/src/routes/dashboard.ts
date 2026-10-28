import { Router } from "express";
import { PrismaClient, Role } from "@prisma/client";
import { requireAuth, requireRole } from "../middleware/auth";
import { requesterDashboard } from "../services/dashboard";

// Requester dashboard (api-spec.md section 8). Staff and administrators get 403 (L4-BR-20).
const router = Router();
const prisma = new PrismaClient();

router.use(requireAuth, requireRole(Role.REQUESTER));

router.get("/requester", async (req, res) => {
  try {
    res.json(await requesterDashboard(prisma, req.auth!.userId));
  } catch (err) {
    console.error("Requester dashboard failed:", err);
    res.status(500).json({ error: "Something went wrong.", code: "INTERNAL" });
  }
});

export default router;
