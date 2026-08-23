import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import path from "path";

const router = Router();
const prisma = new PrismaClient();

router.get("/:id/download", async (req, res) => {
  const requesterId = Number(req.query.requesterId);
  const attachmentId = Number(req.params.id);

  if (!requesterId) {
    return res.status(400).json({ error: "requesterId is required." });
  }

  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { ticket: true },
  });

  if (!attachment || attachment.ticket.requesterId !== requesterId) {
    return res.status(404).json({ error: "Attachment not found." });
  }

  if (attachment.isRemoved) {
    return res.status(404).json({ error: "This attachment has been removed and can no longer be downloaded." });
  }

  const filePath = path.join(__dirname, "../../uploads", attachment.storedFileName);
  res.download(filePath, attachment.fileName);
});

router.delete("/:id", async (req, res) => {
  const requesterId = Number(req.query.requesterId);
  const attachmentId = Number(req.params.id);

  if (!requesterId) {
    return res.status(400).json({ error: "requesterId is required." });
  }

  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { ticket: true },
  });

  if (!attachment || attachment.ticket.requesterId !== requesterId) {
    return res.status(404).json({ error: "Attachment not found." });
  }

  if (attachment.isRemoved) {
    return res.status(409).json({ error: "This attachment has already been removed." });
  }

  const updated = await prisma.attachment.update({
    where: { id: attachmentId },
    data: { isRemoved: true, removedAt: new Date() },
  });

  res.json({ id: updated.id, isRemoved: updated.isRemoved, removedAt: updated.removedAt });
});

export default router;