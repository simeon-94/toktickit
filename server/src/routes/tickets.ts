import { Router } from "express";
import { PrismaClient, Priority } from "@prisma/client";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import { generateTicketNumber } from "../utils/ticketNumber";

const router = Router();
const prisma = new PrismaClient();

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_TICKET = 5;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, "../../uploads"));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new Error("INVALID_FILE_TYPE"));
      return;
    }
    cb(null, true);
  },
});

function validateTicketBody(body: any) {
  const errors: Record<string, string> = {};

  if (!body.requesterId || typeof body.requesterId !== "number") {
    errors.requesterId = "required";
  }
  if (!body.categoryId || typeof body.categoryId !== "number") {
    errors.categoryId = "required";
  }
  if (!body.relatedSystemId || typeof body.relatedSystemId !== "number") {
    errors.relatedSystemId = "required";
  }

  const summary = typeof body.summary === "string" ? body.summary.trim() : "";
  if (summary.length < 3 || summary.length > 150) {
    errors.summary = "required, 3-150 characters";
  }

  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (description.length < 10 || description.length > 2000) {
    errors.description = "required, 10-2000 characters";
  }

  const validPriorities = ["LOW", "MEDIUM", "HIGH"];
  if (!validPriorities.includes(body.requestedPriority)) {
    errors.requestedPriority = "must be LOW, MEDIUM, or HIGH";
  }

  return errors;
}

router.post("/", async (req, res) => {
  const errors = validateTicketBody(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const created = await prisma.ticket.create({
      data: {
        ticketNumber: `PENDING-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        requesterId: req.body.requesterId,
        categoryId: req.body.categoryId,
        relatedSystemId: req.body.relatedSystemId,
        summary: req.body.summary.trim(),
        description: req.body.description.trim(),
        requestedPriority: req.body.requestedPriority as Priority,
      },
    });

    const ticketNumber = generateTicketNumber(created.id);
    const ticket = await prisma.ticket.update({
      where: { id: created.id },
      data: { ticketNumber },
    });

    res.status(201).json(ticket);
  } catch (err) {
    console.error("Create ticket failed:", err);
    res.status(500).json({ error: "Unable to create ticket. Please try again." });
  }
});

router.post("/:id/attachments", (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      if (err.message === "INVALID_FILE_TYPE") {
        return res.status(400).json({ error: "File type not allowed. Only JPG, PNG, WEBP, and PDF are accepted." });
      }
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File is too large. Maximum size is 5MB." });
      }
      console.error("Upload failed:", err);
      return res.status(500).json({ error: "Unable to upload file. Please try again." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file was provided." });
    }

    const ticketId = Number(req.params.id);
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    const activeCount = await prisma.attachment.count({
      where: { ticketId, isRemoved: false },
    });
    if (activeCount >= MAX_ATTACHMENTS_PER_TICKET) {
      return res.status(409).json({ error: "This ticket already has the maximum of 5 attachments." });
    }

    const attachment = await prisma.attachment.create({
      data: {
        ticketId,
        fileName: req.file.originalname,
        storedFileName: req.file.filename,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
      },
    });

    res.status(201).json({
      id: attachment.id,
      fileName: attachment.fileName,
      sizeBytes: attachment.sizeBytes,
      uploadedAt: attachment.uploadedAt,
    });
  });
});

export default router;