import { Router } from "express";
import { PrismaClient, Role } from "@prisma/client";
import { requireAuth, requireRole } from "../middleware/auth";
import { actionViewPage, isActionView, staffDashboard } from "../services/dashboard";

// IT Staff dashboard and its action drill-down (api-spec.md section 9, spec CL-02).
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

router.get("/actions", async (req, res) => {
  const view = req.query.view;
  if (!isActionView(view)) {
    return res.status(400).json({
      error: "view must be myPlanned or openFollowUps.",
      code: "VALIDATION",
      fields: { view: "must be myPlanned or openFollowUps" },
    });
  }

  let page = Number(req.query.page);
  if (!Number.isInteger(page) || page < 1) page = 1;
  let pageSize = Number(req.query.pageSize);
  if (!Number.isInteger(pageSize) || pageSize < 1) pageSize = 10;

  try {
    res.json(await actionViewPage(prisma, view, req.auth!.userId, page, pageSize));
  } catch (err) {
    console.error("Staff actions list failed:", err);
    res.status(500).json({ error: "Something went wrong.", code: "INTERNAL" });
  }
});

export default router;
