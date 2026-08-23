import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

router.get("/", async (req, res) => {
  try {
    const requesters = await prisma.devRequester.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    });
    res.json(requesters);
  } catch (err) {
    res.status(500).json({ error: "Could not load development requesters" });
  }
});

export default router;