import { Router } from "express";
import { PrismaClient, Role } from "@prisma/client";
import path from "path";
import { requireAuth } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

router.use(requireAuth);

function canAccessAttachment(ticketRequesterId: number, auth: { userId: number; role: Role }) {
  return ticketRequesterId === auth.userId || auth.role === Role.IT_STAFF || auth.role === Role.ADMINISTRATOR;
}

router.get("/:id/download", async (req, res) => {
  const attachmentId = Number(req.params.id);

  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { ticket: true },
  });

  if (!attachment || !canAccessAttachment(attachment.ticket.requesterId, req.auth!)) {
    return res.status(404).json({ error: "Attachment not found." });
  }

  if (attachment.isRemoved) {
    return res.status(404).json({ error: "This attachment has been removed and can no longer be downloaded." });
  }

  const filePath = path.join(__dirname, "../../uploads", attachment.storedFileName);
  res.download(filePath, attachment.fileName);
});

router.delete("/:id", async (req, res) => {
  const attachmentId = Number(req.params.id);

  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { ticket: true },
  });

  if (!attachment || attachment.ticket.requesterId !== req.auth!.userId) {
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