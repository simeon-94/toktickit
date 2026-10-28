import { Router, Request, Response, NextFunction } from "express";
import { ActionStatus, Prisma, PrismaClient, Role, TicketStatus } from "@prisma/client";
import { requireAuth } from "../middleware/auth";
import {
  parseExpectedVersion,
  validateActionInput,
  validateActionResult,
  validateClientRequestId,
} from "../utils/actionValidation";

// Actions Taken under a Ticket (api-spec.md sections 1-5). Mounted at /api/tickets/:id/actions.
// There is deliberately no DELETE route (L4-BR-09).
const router = Router({ mergeParams: true });
const prisma = new PrismaClient();

const TERMINAL_TICKET_STATUSES: TicketStatus[] = [TicketStatus.CLOSED, TicketStatus.CANCELLED];
const ACTION_INCLUDE = { performedBy: true, assignee: true } as const;

type ActionWithUsers = Prisma.ActionTakenGetPayload<{ include: typeof ACTION_INCLUDE }>;

function isStaffRole(role: Role) {
  return role === Role.IT_STAFF || role === Role.ADMINISTRATOR;
}

function sendError(res: Response, status: number, code: string, error: string, fields?: Record<string, string>) {
  return res.status(status).json(fields ? { error, code, fields } : { error, code });
}

function requireStaff(req: Request, res: Response, next: NextFunction) {
  if (!isStaffRole(req.auth!.role)) {
    return sendError(res, 403, "FORBIDDEN", "Only IT Staff and Administrators can change Actions Taken.");
  }
  next();
}

// Express 4 does not forward rejected promises, so async handlers are wrapped explicitly.
function handle(fn: (req: Request, res: Response) => Promise<unknown>) {
  return (req: Request, res: Response) => {
    fn(req, res).catch((err) => {
      console.error("Actions Taken request failed:", err);
      if (!res.headersSent) sendError(res, 500, "INTERNAL", "Something went wrong.");
    });
  };
}

function toActionDto(a: ActionWithUsers) {
  return {
    id: a.id,
    ticketId: a.ticketId,
    actionAt: a.actionAt,
    description: a.description,
    result: a.result,
    status: a.status,
    performedById: a.performedById,
    performedByName: a.performedBy.name,
    assigneeId: a.assigneeId,
    assigneeName: a.assignee.name,
    followUpRequired: a.followUpRequired,
    followUpNote: a.followUpNote,
    attachmentNotes: a.attachmentNotes,
    version: a.version,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

function parseId(value: string | undefined) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

async function findTicket(req: Request) {
  const ticketId = parseId(req.params.id);
  return ticketId ? prisma.ticket.findUnique({ where: { id: ticketId } }) : null;
}

async function findActionOnTicket(req: Request, ticketId: number) {
  const actionId = parseId(req.params.actionId);
  if (!actionId) return null;
  const action = await prisma.actionTaken.findUnique({ where: { id: actionId } });
  return action && action.ticketId === ticketId ? action : null;
}

async function isActiveStaff(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return !!user && user.isActive && isStaffRole(user.role);
}

const ASSIGNEE_ERROR = "Assignee must be an active IT Staff member or Administrator.";

// Applies a version-checked change to a PLANNED action and touches the parent Ticket (L4-BR-15/22).
// Returns the updated action, or the error to send when the row changed underneath us.
async function updatePlannedAction(
  ticketId: number,
  actionId: number,
  expectedVersion: number,
  data: Prisma.ActionTakenUncheckedUpdateManyInput
) {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.actionTaken.updateMany({
      where: { id: actionId, version: expectedVersion, status: ActionStatus.PLANNED },
      data: { ...data, version: { increment: 1 } },
    });
    if (count === 0) {
      const current = await tx.actionTaken.findUnique({ where: { id: actionId } });
      if (current && current.version !== expectedVersion) return { conflict: "STALE_UPDATE" as const };
      return { conflict: "ACTION_LOCKED" as const };
    }
    await tx.ticket.update({ where: { id: ticketId }, data: { updatedAt: new Date() } });
    const action = await tx.actionTaken.findUniqueOrThrow({ where: { id: actionId }, include: ACTION_INCLUDE });
    return { action };
  });
}

function sendConflict(res: Response, conflict: "STALE_UPDATE" | "ACTION_LOCKED") {
  if (conflict === "STALE_UPDATE") {
    return sendError(res, 409, "STALE_UPDATE", "This action was changed by someone else. Reload and try again.");
  }
  return sendError(res, 422, "ACTION_LOCKED", "Completed or cancelled actions cannot be changed.");
}

router.use(requireAuth);

router.get(
  "/",
  handle(async (req, res) => {
    const ticket = await findTicket(req);
    const auth = req.auth!;
    if (!ticket || (!isStaffRole(auth.role) && ticket.requesterId !== auth.userId)) {
      return sendError(res, 404, "NOT_FOUND", "Ticket not found.");
    }

    const actions = await prisma.actionTaken.findMany({
      where: { ticketId: ticket.id },
      orderBy: [{ actionAt: "desc" }, { id: "desc" }],
      include: ACTION_INCLUDE,
    });
    res.json({ items: actions.map(toActionDto) });
  })
);

router.post(
  "/",
  requireStaff,
  handle(async (req, res) => {
    const ticket = await findTicket(req);
    if (!ticket) return sendError(res, 404, "NOT_FOUND", "Ticket not found.");

    const { errors, value } = validateActionInput(req.body ?? {});
    const clientRequestIdError = validateClientRequestId(req.body?.clientRequestId);
    if (clientRequestIdError) errors.clientRequestId = clientRequestIdError;

    const userId = req.auth!.userId;
    const assigneeId = value.assigneeId ?? userId;
    if (!errors.assigneeId && !(await isActiveStaff(assigneeId))) errors.assigneeId = ASSIGNEE_ERROR;

    if (Object.keys(errors).length > 0) {
      return sendError(res, 400, "VALIDATION", "Please correct the highlighted fields.", errors);
    }

    const clientRequestId: string | null = req.body.clientRequestId ?? null;
    const findExisting = () =>
      prisma.actionTaken.findUnique({ where: { clientRequestId: clientRequestId! }, include: ACTION_INCLUDE });

    // Idempotent create (L4-BR-17): a repeat of the same request returns the stored action.
    if (clientRequestId) {
      const existing = await findExisting();
      if (existing) {
        if (existing.ticketId !== ticket.id) {
          return sendError(res, 400, "VALIDATION", "Please correct the highlighted fields.", {
            clientRequestId: "clientRequestId was already used for another Ticket.",
          });
        }
        return res.status(200).json(toActionDto(existing));
      }
    }

    if (TERMINAL_TICKET_STATUSES.includes(ticket.currentStatus)) {
      return sendError(res, 422, "TICKET_TERMINAL", "Actions cannot be added to a closed or cancelled Ticket.");
    }

    try {
      const created = await prisma.$transaction(async (tx) => {
        const action = await tx.actionTaken.create({
          data: {
            ticketId: ticket.id,
            actionAt: value.actionAt,
            description: value.description,
            performedById: userId,
            assigneeId,
            followUpRequired: value.followUpRequired,
            followUpNote: value.followUpNote,
            attachmentNotes: value.attachmentNotes,
            clientRequestId,
          },
          include: ACTION_INCLUDE,
        });
        await tx.ticket.update({ where: { id: ticket.id }, data: { updatedAt: new Date() } });
        return action;
      });
      res.status(201).json(toActionDto(created));
    } catch (err) {
      // A concurrent duplicate submit won the unique clientRequestId race: return its result.
      if (clientRequestId && err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const existing = await findExisting();
        if (existing && existing.ticketId === ticket.id) return res.status(200).json(toActionDto(existing));
      }
      throw err;
    }
  })
);

router.patch(
  "/:actionId",
  requireStaff,
  handle(async (req, res) => {
    const ticket = await findTicket(req);
    if (!ticket) return sendError(res, 404, "NOT_FOUND", "Ticket not found.");
    const action = await findActionOnTicket(req, ticket.id);
    if (!action) return sendError(res, 404, "NOT_FOUND", "Action not found.");

    const body = req.body ?? {};
    const expectedVersion = parseExpectedVersion(body.expectedVersion);
    if (expectedVersion === undefined) {
      return sendError(res, 400, "VALIDATION", "expectedVersion is required.", { expectedVersion: "required" });
    }

    const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);
    const merged = {
      description: has("description") ? body.description : action.description,
      actionAt: has("actionAt") ? body.actionAt : action.actionAt.toISOString(),
      assigneeId: has("assigneeId") ? body.assigneeId : action.assigneeId,
      followUpRequired: has("followUpRequired") ? body.followUpRequired : action.followUpRequired,
      followUpNote: has("followUpNote") ? body.followUpNote : action.followUpNote,
      attachmentNotes: has("attachmentNotes") ? body.attachmentNotes : action.attachmentNotes,
    };
    const { errors, value } = validateActionInput(merged);
    const assigneeId = value.assigneeId ?? action.assigneeId;
    // An existing assignee who was deactivated later stays valid (L4-BR-04); only a change is checked.
    if (!errors.assigneeId && assigneeId !== action.assigneeId && !(await isActiveStaff(assigneeId))) {
      errors.assigneeId = ASSIGNEE_ERROR;
    }
    if (Object.keys(errors).length > 0) {
      return sendError(res, 400, "VALIDATION", "Please correct the highlighted fields.", errors);
    }

    if (action.version !== expectedVersion) return sendConflict(res, "STALE_UPDATE");
    if (action.status !== ActionStatus.PLANNED) return sendConflict(res, "ACTION_LOCKED");

    const outcome = await updatePlannedAction(ticket.id, action.id, expectedVersion, {
      description: value.description,
      actionAt: value.actionAt,
      assigneeId,
      followUpRequired: value.followUpRequired,
      followUpNote: value.followUpNote,
      attachmentNotes: value.attachmentNotes,
    });
    if ("conflict" in outcome) return sendConflict(res, outcome.conflict!);
    res.json(toActionDto(outcome.action));
  })
);

router.post(
  "/:actionId/complete",
  requireStaff,
  handle(async (req, res) => {
    const ticket = await findTicket(req);
    if (!ticket) return sendError(res, 404, "NOT_FOUND", "Ticket not found.");
    const action = await findActionOnTicket(req, ticket.id);
    if (!action) return sendError(res, 404, "NOT_FOUND", "Action not found.");

    const expectedVersion = parseExpectedVersion(req.body?.expectedVersion);
    if (expectedVersion === undefined) {
      return sendError(res, 400, "VALIDATION", "expectedVersion is required.", { expectedVersion: "required" });
    }
    const resultError = validateActionResult(req.body?.result);
    if (resultError) return sendError(res, 400, "VALIDATION", "Please correct the highlighted fields.", { result: resultError });

    if (action.version !== expectedVersion) return sendConflict(res, "STALE_UPDATE");
    if (action.status !== ActionStatus.PLANNED) return sendConflict(res, "ACTION_LOCKED");

    const outcome = await updatePlannedAction(ticket.id, action.id, expectedVersion, {
      status: ActionStatus.COMPLETED,
      result: (req.body.result as string).trim(),
    });
    if ("conflict" in outcome) return sendConflict(res, outcome.conflict!);
    res.json(toActionDto(outcome.action));
  })
);

router.post(
  "/:actionId/cancel",
  requireStaff,
  handle(async (req, res) => {
    const ticket = await findTicket(req);
    if (!ticket) return sendError(res, 404, "NOT_FOUND", "Ticket not found.");
    const action = await findActionOnTicket(req, ticket.id);
    if (!action) return sendError(res, 404, "NOT_FOUND", "Action not found.");

    const expectedVersion = parseExpectedVersion(req.body?.expectedVersion);
    if (expectedVersion === undefined) {
      return sendError(res, 400, "VALIDATION", "expectedVersion is required.", { expectedVersion: "required" });
    }

    if (action.version !== expectedVersion) return sendConflict(res, "STALE_UPDATE");
    if (action.status !== ActionStatus.PLANNED) return sendConflict(res, "ACTION_LOCKED");

    const outcome = await updatePlannedAction(ticket.id, action.id, expectedVersion, { status: ActionStatus.CANCELLED });
    if ("conflict" in outcome) return sendConflict(res, outcome.conflict!);
    res.json(toActionDto(outcome.action));
  })
);

export default router;
