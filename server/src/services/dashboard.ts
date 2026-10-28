import { ActionStatus, Prisma, PrismaClient, Priority, Role, TicketStatus } from "@prisma/client";
import {
  OPEN_STATUSES,
  RESOLVED_STATUSES,
  TERMINAL_STATUSES,
  effectivePriorityWhere,
  recentCutoff,
} from "../utils/statusGroups";

// Dashboard metrics (api-spec.md sections 8-9). Computed from the database on every request.
// Shared by the API routes and scripts/verify-dashboard.ts.

const LIST_LIMIT = 5;

export const ACTION_VIEWS = ["myPlanned", "openFollowUps"] as const;
export type ActionView = (typeof ACTION_VIEWS)[number];

export function isActionView(value: unknown): value is ActionView {
  return typeof value === "string" && (ACTION_VIEWS as readonly string[]).includes(value);
}

// Filters behind the two action-based cards (spec CL-02); the drill-down list uses the same where.
export function actionViewWhere(view: ActionView, userId: number): Prisma.ActionTakenWhereInput {
  if (view === "myPlanned") {
    return { status: ActionStatus.PLANNED, assigneeId: userId, ticket: { currentStatus: { notIn: TERMINAL_STATUSES } } };
  }
  return { status: ActionStatus.COMPLETED, followUpRequired: true, ticket: { currentStatus: { in: OPEN_STATUSES } } };
}

export function actionViewOrder(view: ActionView): Prisma.ActionTakenOrderByWithRelationInput[] {
  return view === "myPlanned" ? [{ actionAt: "asc" }, { id: "asc" }] : [{ actionAt: "desc" }, { id: "desc" }];
}

function requesterItem(t: { id: number; ticketNumber: string; summary: string; currentStatus: TicketStatus; updatedAt: Date }) {
  return { id: t.id, ticketNumber: t.ticketNumber, summary: t.summary, currentStatus: t.currentStatus, updatedAt: t.updatedAt };
}

export async function requesterDashboard(prisma: PrismaClient, userId: number, now: Date = new Date()) {
  const own = { requesterId: userId };
  const open: Prisma.TicketWhereInput = { ...own, currentStatus: { in: OPEN_STATUSES } };
  const waiting: Prisma.TicketWhereInput = { ...own, currentStatus: TicketStatus.WAITING_FOR_REQUESTER };
  const resolvedRecent: Prisma.TicketWhereInput = {
    ...own,
    currentStatus: { in: RESOLVED_STATUSES },
    updatedAt: { gte: recentCutoff(now) },
  };
  const order: Prisma.TicketOrderByWithRelationInput[] = [{ updatedAt: "desc" }, { id: "desc" }];

  const [openTickets, waitingForRequester, recentlyResolvedCount, needsAttention, recentlyUpdated, recentlyResolved] =
    await Promise.all([
      prisma.ticket.count({ where: open }),
      prisma.ticket.count({ where: waiting }),
      prisma.ticket.count({ where: resolvedRecent }),
      prisma.ticket.findMany({ where: waiting, orderBy: [{ updatedAt: "asc" }, { id: "asc" }], take: LIST_LIMIT }),
      prisma.ticket.findMany({ where: own, orderBy: order, take: LIST_LIMIT }),
      prisma.ticket.findMany({ where: resolvedRecent, orderBy: order, take: LIST_LIMIT }),
    ]);

  return {
    generatedAt: now.toISOString(),
    counts: { openTickets, waitingForRequester, recentlyResolved: recentlyResolvedCount },
    needsAttention: needsAttention.map(requesterItem),
    recentlyUpdated: recentlyUpdated.map(requesterItem),
    recentlyResolved: recentlyResolved.map(requesterItem),
  };
}

type TicketWithOwner = Prisma.TicketGetPayload<{ include: { ticketOwner: true } }>;

function staffItem(t: TicketWithOwner) {
  return {
    id: t.id,
    ticketNumber: t.ticketNumber,
    summary: t.summary,
    currentStatus: t.currentStatus,
    itPriority: t.itPriority,
    ticketOwnerName: t.ticketOwner ? t.ticketOwner.name : null,
    updatedAt: t.updatedAt,
  };
}

type ActionWithTicket = Prisma.ActionTakenGetPayload<{ include: { ticket: true; assignee: true } }>;

export function actionListItem(a: ActionWithTicket) {
  return {
    id: a.id,
    ticketId: a.ticketId,
    ticketNumber: a.ticket.ticketNumber,
    description: a.description,
    actionAt: a.actionAt,
    status: a.status,
  };
}

function followUpItem(a: ActionWithTicket) {
  return { ...actionListItem(a), followUpNote: a.followUpNote, assigneeName: a.assignee.name };
}

export async function staffDashboard(prisma: PrismaClient, userId: number, role: Role, now: Date = new Date()) {
  const open: Prisma.TicketWhereInput = { currentStatus: { in: OPEN_STATUSES } };
  const urgent: Prisma.TicketWhereInput = { ...open, itPriority: Priority.HIGH };

  const [unassignedOpen, ownedByMeOpen, urgentOpen, openFollowUps, myPlannedActions, statusGroups, priorityCounts] =
    await Promise.all([
      prisma.ticket.count({ where: { ...open, ticketOwnerId: null } }),
      prisma.ticket.count({ where: { ...open, ticketOwnerId: userId } }),
      prisma.ticket.count({ where: urgent }),
      prisma.actionTaken.count({ where: actionViewWhere("openFollowUps", userId) }),
      prisma.actionTaken.count({ where: actionViewWhere("myPlanned", userId) }),
      prisma.ticket.groupBy({ by: ["currentStatus"], _count: { _all: true } }),
      Promise.all(
        Object.values(Priority).map((p) => prisma.ticket.count({ where: { AND: [open, effectivePriorityWhere(p)] } }))
      ),
    ]);

  const byStatus = Object.fromEntries(Object.values(TicketStatus).map((s) => [s, 0])) as Record<TicketStatus, number>;
  for (const g of statusGroups) byStatus[g.currentStatus] = g._count._all;
  const byItPriority = Object.fromEntries(Object.values(Priority).map((p, i) => [p, priorityCounts[i]])) as Record<
    Priority,
    number
  >;

  const actionInclude = { ticket: true, assignee: true } as const;
  const [urgentList, recentList, myActions, followUps] = await Promise.all([
    prisma.ticket.findMany({ where: urgent, orderBy: [{ updatedAt: "asc" }, { id: "asc" }], take: LIST_LIMIT, include: { ticketOwner: true } }),
    prisma.ticket.findMany({
      where: { updatedAt: { gte: recentCutoff(now) } },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: LIST_LIMIT,
      include: { ticketOwner: true },
    }),
    prisma.actionTaken.findMany({
      where: actionViewWhere("myPlanned", userId),
      orderBy: actionViewOrder("myPlanned"),
      take: LIST_LIMIT,
      include: actionInclude,
    }),
    prisma.actionTaken.findMany({
      where: actionViewWhere("openFollowUps", userId),
      orderBy: actionViewOrder("openFollowUps"),
      take: LIST_LIMIT,
      include: actionInclude,
    }),
  ]);

  const result: Record<string, unknown> = {
    generatedAt: now.toISOString(),
    counts: { unassignedOpen, ownedByMeOpen, urgentOpen, openFollowUps, myPlannedActions, byStatus, byItPriority },
    urgent: urgentList.map(staffItem),
    recentlyUpdated: recentList.map(staffItem),
    myActions: myActions.map(actionListItem),
    followUps: followUps.map(followUpItem),
  };

  if (role === Role.ADMINISTRATOR) {
    const [active, inactive, roles] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    ]);
    const byRole = Object.fromEntries(Object.values(Role).map((r) => [r, 0])) as Record<Role, number>;
    for (const g of roles) byRole[g.role] = g._count._all;
    result.userCounts = { active, inactive, byRole };
  }

  return result;
}

export async function actionViewPage(prisma: PrismaClient, view: ActionView, userId: number, page: number, pageSize: number) {
  const where = actionViewWhere(view, userId);
  const [items, total] = await Promise.all([
    prisma.actionTaken.findMany({
      where,
      orderBy: actionViewOrder(view),
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { ticket: true, assignee: true },
    }),
    prisma.actionTaken.count({ where }),
  ]);
  return { items: items.map(followUpItem), total, page, pageSize };
}
