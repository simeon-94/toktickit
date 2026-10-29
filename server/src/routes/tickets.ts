import { Router } from "express";
import { ActionStatus, Prisma, PrismaClient, Priority, Role, TicketStatus } from "@prisma/client";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import { generateTicketNumber } from "../utils/ticketNumber";
import { requireAuth, requireRole } from "../middleware/auth";
import { parseExpectedVersion } from "../utils/actionValidation";
import { allowedTransitions, isTransitionAllowed, resolutionGateReasons } from "../utils/ticketWorkflow";
import { invalidEnumFilters, isStatusGroup, statusGroupWhere } from "../utils/statusGroups";

const router = Router();
const prisma = new PrismaClient();

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_TICKET = 5;

router.use(requireAuth);

function isStaffRole(role: Role) {
  return role === Role.IT_STAFF || role === Role.ADMINISTRATOR;
}

function canAccessTicket(ticketRequesterId: number, auth: { userId: number; role: Role }) {
  return ticketRequesterId === auth.userId || isStaffRole(auth.role);
}

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

const ORDER_BY_MAP: Record<string, any> = {
  createdAt_desc: { createdAt: "desc" },
  createdAt_asc: { createdAt: "asc" },
  summary_asc: { summary: "asc" },
  summary_desc: { summary: "desc" },
};

router.get("/", async (req, res) => {
  const requesterId = req.auth!.userId;

  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const categoryId = req.query.category ? Number(req.query.category) : undefined;
  const priority = typeof req.query.priority === "string" ? req.query.priority : undefined;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const sort = typeof req.query.sort === "string" ? req.query.sort : "createdAt_desc";

  let page = Number(req.query.page);
  if (!Number.isInteger(page) || page < 1) page = 1;

  let pageSize = Number(req.query.pageSize);
  if (!Number.isInteger(pageSize) || pageSize < 1) pageSize = 10;

  const where: any = { requesterId };

  if (search) {
    where.OR = [
      { ticketNumber: { contains: search, mode: "insensitive" } },
      { summary: { contains: search, mode: "insensitive" } },
    ];
  }
  const invalidFields = invalidEnumFilters({ status: status || undefined, priority: priority || undefined });
  if (Object.keys(invalidFields).length > 0) {
    return res.status(400).json({
      error: "status must be a ticket status and priority must be LOW, MEDIUM, or HIGH.",
      code: "VALIDATION",
      fields: invalidFields,
    });
  }

  if (categoryId) where.categoryId = categoryId;
  if (priority) where.requestedPriority = priority;
  if (status) where.currentStatus = status;

  // Lab 4 drill-down filter from the Requester dashboard (api-spec.md section 10).
  const statusGroup = req.query.statusGroup;
  if (statusGroup !== undefined) {
    if (!isStatusGroup(statusGroup)) {
      return res.status(400).json({
        error: "statusGroup must be open or resolvedRecent.",
        code: "VALIDATION",
        fields: { statusGroup: "invalid" },
      });
    }
    where.AND = [statusGroupWhere(statusGroup)];
  }

  const orderBy = ORDER_BY_MAP[sort] || ORDER_BY_MAP.createdAt_desc;

  const [items, totalItems] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { category: true, relatedSystem: true },
    }),
    prisma.ticket.count({ where }),
  ]);

  res.json({
    items: items.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      summary: t.summary,
      categoryName: t.category.name,
      relatedSystemName: t.relatedSystem.name,
      requestedPriority: t.requestedPriority,
      itPriority: t.itPriority,
      currentStatus: t.currentStatus,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
    page,
    pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize) || 1,
  });
});

router.get("/:id", async (req, res) => {
  const ticketId = Number(req.params.id);

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { category: true, relatedSystem: true, requester: true, ticketOwner: true },
  });

  if (!ticket || !canAccessTicket(ticket.requesterId, req.auth!)) {
    return res.status(404).json({ error: "Ticket not found." });
  }

  res.json({
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    summary: ticket.summary,
    description: ticket.description,
    categoryName: ticket.category.name,
    relatedSystemName: ticket.relatedSystem.name,
    requestedPriority: ticket.requestedPriority,
    itPriority: ticket.itPriority,
    currentStatus: ticket.currentStatus,
    requesterName: ticket.requester.name,
    ticketOwnerId: ticket.ticketOwnerId,
    ticketOwnerName: ticket.ticketOwner ? ticket.ticketOwner.name : null,
    requesterIndicatedResolved: ticket.requesterIndicatedResolved,
    version: ticket.version,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  });
});

router.get("/:id/attachments", async (req, res) => {
  const ticketId = Number(req.params.id);

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || !canAccessTicket(ticket.requesterId, req.auth!)) {
    return res.status(404).json({ error: "Ticket not found." });
  }

  const attachments = await prisma.attachment.findMany({
    where: { ticketId },
    orderBy: { uploadedAt: "asc" },
  });

  res.json(
    attachments.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      sizeBytes: a.sizeBytes,
      isRemoved: a.isRemoved,
      uploadedAt: a.uploadedAt,
      removedAt: a.removedAt,
    }))
  );
});

router.post("/", async (req, res) => {
  const errors = validateTicketBody(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const created = await prisma.ticket.create({
      data: {
        ticketNumber: `PENDING-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        requesterId: req.auth!.userId,
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
    if (!ticket || ticket.requesterId !== req.auth!.userId) {
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
        fileName: Buffer.from(req.file.originalname, "latin1").toString("utf8"),
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

router.get("/:id/comments", async (req, res) => {
  const ticketId = Number(req.params.id);

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || !canAccessTicket(ticket.requesterId, req.auth!)) {
    return res.status(404).json({ error: "Ticket not found." });
  }

  const comments = await prisma.publicComment.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
    include: { author: true },
  });

  res.json(
    comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      authorName: c.author.name,
    }))
  );
});

router.post("/:id/comments", async (req, res) => {
  const ticketId = Number(req.params.id);

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || !canAccessTicket(ticket.requesterId, req.auth!)) {
    return res.status(404).json({ error: "Ticket not found." });
  }

  const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
  if (content.length < 1 || content.length > 2000) {
    return res.status(400).json({ error: "Comment must be between 1 and 2000 characters." });
  }

  const comment = await prisma.publicComment.create({
    data: { ticketId, authorId: req.auth!.userId, content },
    include: { author: true },
  });

  res.status(201).json({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    authorName: comment.author.name,
  });
});

router.get("/:id/notes", requireRole(Role.IT_STAFF, Role.ADMINISTRATOR), async (req, res) => {
  const ticketId = Number(req.params.id);

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found." });
  }

  const notes = await prisma.internalNote.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
    include: { author: true },
  });

  res.json(
    notes.map((n) => ({
      id: n.id,
      content: n.content,
      createdAt: n.createdAt,
      authorName: n.author.name,
    }))
  );
});

router.post("/:id/notes", requireRole(Role.IT_STAFF, Role.ADMINISTRATOR), async (req, res) => {
  const ticketId = Number(req.params.id);

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found." });
  }

  const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
  if (content.length < 1 || content.length > 2000) {
    return res.status(400).json({ error: "Note must be between 1 and 2000 characters." });
  }

  const note = await prisma.internalNote.create({
    data: { ticketId, authorId: req.auth!.userId, content },
    include: { author: true },
  });

  res.status(201).json({
    id: note.id,
    content: note.content,
    createdAt: note.createdAt,
    authorName: note.author.name,
  });
});

const STALE_TICKET = {
  error: "This Ticket was changed by someone else. Reload and try again.",
  code: "STALE_UPDATE",
};

// Optional expectedVersion for owner/priority (L4-BR-15): undefined = not supplied, null = invalid.
function optionalExpectedVersion(body: any): number | undefined | null {
  if (!Object.prototype.hasOwnProperty.call(body, "expectedVersion")) return undefined;
  return parseExpectedVersion(body.expectedVersion) ?? null;
}

// Writes a Ticket change and bumps its version in one statement; when expectedVersion is given
// the write only happens if the stored version still matches. Returns null on a stale write.
async function versionedTicketUpdate(ticketId: number, expectedVersion: number | undefined, data: Prisma.TicketUpdateManyMutationInput & { ticketOwnerId?: number | null }) {
  const { count } = await prisma.ticket.updateMany({
    where: expectedVersion === undefined ? { id: ticketId } : { id: ticketId, version: expectedVersion },
    data: { ...data, version: { increment: 1 } },
  });
  if (count === 0) return null;
  return prisma.ticket.findUniqueOrThrow({ where: { id: ticketId }, include: { ticketOwner: true } });
}

router.patch("/:id/owner", requireRole(Role.IT_STAFF, Role.ADMINISTRATOR), async (req, res) => {
  const ticketId = Number(req.params.id);
  const ticket = Number.isInteger(ticketId) ? await prisma.ticket.findUnique({ where: { id: ticketId } }) : null;
  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found.", code: "NOT_FOUND" });
  }

  const ticketOwnerId = req.body.ticketOwnerId === null ? null : Number(req.body.ticketOwnerId);

  if (ticketOwnerId !== null) {
    const owner = Number.isInteger(ticketOwnerId) ? await prisma.user.findUnique({ where: { id: ticketOwnerId } }) : null;
    if (!owner || !isStaffRole(owner.role) || !owner.isActive) {
      return res.status(400).json({
        error: "ticketOwnerId must be an active IT Staff or Administrator user.",
        code: "VALIDATION",
        fields: { ticketOwnerId: "must be an active IT Staff or Administrator user" },
      });
    }
  }

  const expectedVersion = optionalExpectedVersion(req.body);
  if (expectedVersion === null) {
    return res.status(400).json({ error: "expectedVersion must be a positive integer.", code: "VALIDATION", fields: { expectedVersion: "invalid" } });
  }

  const updated = await versionedTicketUpdate(ticketId, expectedVersion, { ticketOwnerId });
  if (!updated) return res.status(409).json(STALE_TICKET);

  res.json({
    id: updated.id,
    ticketOwnerId: updated.ticketOwnerId,
    ticketOwnerName: updated.ticketOwner ? updated.ticketOwner.name : null,
    version: updated.version,
  });
});

router.patch("/:id/priority", requireRole(Role.IT_STAFF, Role.ADMINISTRATOR), async (req, res) => {
  const ticketId = Number(req.params.id);
  const ticket = Number.isInteger(ticketId) ? await prisma.ticket.findUnique({ where: { id: ticketId } }) : null;
  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found.", code: "NOT_FOUND" });
  }

  const validPriorities = ["LOW", "MEDIUM", "HIGH"];
  if (!validPriorities.includes(req.body.itPriority)) {
    return res.status(400).json({ error: "itPriority must be LOW, MEDIUM, or HIGH.", code: "VALIDATION", fields: { itPriority: "must be LOW, MEDIUM, or HIGH" } });
  }

  const expectedVersion = optionalExpectedVersion(req.body);
  if (expectedVersion === null) {
    return res.status(400).json({ error: "expectedVersion must be a positive integer.", code: "VALIDATION", fields: { expectedVersion: "invalid" } });
  }

  const updated = await versionedTicketUpdate(ticketId, expectedVersion, { itPriority: req.body.itPriority as Priority });
  if (!updated) return res.status(409).json(STALE_TICKET);

  res.json({ id: updated.id, itPriority: updated.itPriority, version: updated.version });
});

// Status change (api-spec section 6). Check order: role -> 404 -> 400 -> 409 -> 422 transition -> 422 gate.
router.patch("/:id/status", requireRole(Role.IT_STAFF, Role.ADMINISTRATOR), async (req, res) => {
  const ticketId = Number(req.params.id);
  const ticket = Number.isInteger(ticketId) ? await prisma.ticket.findUnique({ where: { id: ticketId } }) : null;
  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found.", code: "NOT_FOUND" });
  }

  const validStatuses = Object.values(TicketStatus);
  const fields: Record<string, string> = {};
  if (!validStatuses.includes(req.body.currentStatus)) {
    fields.currentStatus = `must be one of: ${validStatuses.join(", ")}`;
  }
  const expectedVersion = parseExpectedVersion(req.body.expectedVersion);
  if (expectedVersion === undefined) {
    fields.expectedVersion = "required";
  }
  if (fields.currentStatus) {
    return res.status(400).json({ error: `currentStatus ${fields.currentStatus}`, code: "VALIDATION", fields });
  }
  if (expectedVersion === undefined) {
    return res.status(400).json({ error: "expectedVersion is required.", code: "VALIDATION", fields });
  }

  if (ticket.version !== expectedVersion) return res.status(409).json(STALE_TICKET);

  const target = req.body.currentStatus as TicketStatus;
  if (!isTransitionAllowed(ticket.currentStatus, target)) {
    return res.status(422).json({
      error: `That change is not allowed from ${ticket.currentStatus}.`,
      code: "INVALID_TRANSITION",
      allowed: allowedTransitions(ticket.currentStatus),
    });
  }

  if (target === TicketStatus.RESOLVED) {
    const [completedActions, plannedActions] = await Promise.all([
      prisma.actionTaken.count({ where: { ticketId, status: ActionStatus.COMPLETED } }),
      prisma.actionTaken.count({ where: { ticketId, status: ActionStatus.PLANNED } }),
    ]);
    const reasons = resolutionGateReasons({ ticketOwnerId: ticket.ticketOwnerId, completedActions, plannedActions });
    if (reasons.length > 0) {
      return res.status(422).json({ error: "This Ticket cannot be resolved yet.", code: "RESOLUTION_GATE", reasons });
    }
  }

  const updated = await versionedTicketUpdate(ticketId, expectedVersion, {
    currentStatus: target,
    ...(target === TicketStatus.REOPENED ? { requesterIndicatedResolved: false } : {}),
  });
  if (!updated) return res.status(409).json(STALE_TICKET);

  res.json({
    id: updated.id,
    currentStatus: updated.currentStatus,
    version: updated.version,
    requesterIndicatedResolved: updated.requesterIndicatedResolved,
  });
});

router.post("/:id/indicate-resolved", async (req, res) => {
  const ticketId = Number(req.params.id);
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });

  if (!ticket || ticket.requesterId !== req.auth!.userId) {
    return res.status(404).json({ error: "Ticket not found." });
  }

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: { requesterIndicatedResolved: true },
  });

  res.json({ requesterIndicatedResolved: updated.requesterIndicatedResolved });
});

export default router;