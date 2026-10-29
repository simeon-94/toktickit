import { Router } from "express";
import { Prisma, PrismaClient, Role } from "@prisma/client";
import { requireAuth, requireRole } from "../middleware/auth";
import { effectivePriorityWhere, invalidEnumFilters, isPriority, statusGroupWhere } from "../utils/statusGroups";

const router = Router();
const prisma = new PrismaClient();

router.use(requireAuth, requireRole(Role.IT_STAFF, Role.ADMINISTRATOR));

const ORDER_BY_MAP: Record<string, any> = {
  createdAt_desc: { createdAt: "desc" },
  createdAt_asc: { createdAt: "asc" },
  summary_asc: { summary: "asc" },
  summary_desc: { summary: "desc" },
  updatedAt_desc: { updatedAt: "desc" },
};

router.get("/tickets", async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const categoryId = req.query.category ? Number(req.query.category) : undefined;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const requestedPriority = typeof req.query.requestedPriority === "string" ? req.query.requestedPriority : undefined;
  const itPriority = typeof req.query.itPriority === "string" ? req.query.itPriority : undefined;
  const unassigned = req.query.unassigned === "true";
  const sort = typeof req.query.sort === "string" ? req.query.sort : "createdAt_desc";

  let page = Number(req.query.page);
  if (!Number.isInteger(page) || page < 1) page = 1;
  let pageSize = Number(req.query.pageSize);
  if (!Number.isInteger(pageSize) || pageSize < 1) pageSize = 10;

  const invalidFields = invalidEnumFilters({
    status: status || undefined,
    requestedPriority: requestedPriority || undefined,
    itPriority: itPriority || undefined,
  });
  if (Object.keys(invalidFields).length > 0) {
    return res.status(400).json({
      error: "status must be a ticket status; requestedPriority and itPriority must be LOW, MEDIUM, or HIGH.",
      code: "VALIDATION",
      fields: invalidFields,
    });
  }

  const where: any = {};
  if (search) {
    where.OR = [
      { ticketNumber: { contains: search, mode: "insensitive" } },
      { summary: { contains: search, mode: "insensitive" } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;
  if (status) where.currentStatus = status;
  if (requestedPriority) where.requestedPriority = requestedPriority;
  if (itPriority) where.itPriority = itPriority;
  if (unassigned) where.ticketOwnerId = null;

  // Lab 4 drill-down filters (api-spec.md section 10, spec CL-01); combinable with the above.
  const and: Prisma.TicketWhereInput[] = [];
  const ownerId = req.query.ownerId;
  if (ownerId !== undefined) {
    const id = ownerId === "me" ? req.auth!.userId : Number(ownerId);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "ownerId must be 'me' or a user id.", code: "VALIDATION", fields: { ownerId: "invalid" } });
    }
    and.push({ ticketOwnerId: id });
  }
  const statusGroup = req.query.statusGroup;
  if (statusGroup !== undefined) {
    if (statusGroup !== "open") {
      return res.status(400).json({ error: "statusGroup must be open.", code: "VALIDATION", fields: { statusGroup: "invalid" } });
    }
    and.push(statusGroupWhere(statusGroup));
  }
  const effectivePriority = req.query.effectivePriority;
  if (effectivePriority !== undefined) {
    if (!isPriority(effectivePriority)) {
      return res.status(400).json({
        error: "effectivePriority must be LOW, MEDIUM, or HIGH.",
        code: "VALIDATION",
        fields: { effectivePriority: "invalid" },
      });
    }
    and.push(effectivePriorityWhere(effectivePriority));
  }
  if (and.length > 0) where.AND = and;

  const orderBy = ORDER_BY_MAP[sort] || ORDER_BY_MAP.createdAt_desc;

  const [items, totalItems] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { category: true, requester: true, ticketOwner: true },
    }),
    prisma.ticket.count({ where }),
  ]);

  res.json({
    items: items.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      summary: t.summary,
      categoryName: t.category.name,
      requestedPriority: t.requestedPriority,
      itPriority: t.itPriority,
      currentStatus: t.currentStatus,
      requesterName: t.requester.name,
      ticketOwnerName: t.ticketOwner ? t.ticketOwner.name : null,
      version: t.version,
    })),
    page,
    pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize) || 1,
  });
});
router.get("/users", async (_req, res) => {
  const staffUsers = await prisma.user.findMany({
    where: { role: { in: [Role.IT_STAFF, Role.ADMINISTRATOR] }, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true },
  });
  res.json(staffUsers);
});


export default router;