import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

router.get("/categories", async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(categories);
  } catch (error) {
    console.error("Failed to load categories:", error);
    res.status(500).json({ status: "error", message: "Unable to load categories from the database." });
  }
});

export default router;
