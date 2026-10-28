import { Prisma, Priority, TicketStatus } from "@prisma/client";

// "Open Ticket" set (L4-BR-18).
export const OPEN_STATUSES: TicketStatus[] = [
  TicketStatus.NEW,
  TicketStatus.OPEN,
  TicketStatus.IN_PROGRESS,
  TicketStatus.WAITING_FOR_REQUESTER,
  TicketStatus.REOPENED,
];
export const RESOLVED_STATUSES: TicketStatus[] = [TicketStatus.RESOLVED, TicketStatus.CLOSED];
export const TERMINAL_STATUSES: TicketStatus[] = [TicketStatus.CLOSED, TicketStatus.CANCELLED];

// Rolling "recent" window used by dashboards and drill-downs (L4-BR-19).
export const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function recentCutoff(now: Date = new Date()) {
  return new Date(now.getTime() - RECENT_WINDOW_MS);
}

export const STATUS_GROUPS = ["open", "resolvedRecent"] as const;
export type StatusGroup = (typeof STATUS_GROUPS)[number];

export function isStatusGroup(value: unknown): value is StatusGroup {
  return typeof value === "string" && (STATUS_GROUPS as readonly string[]).includes(value);
}

export function statusGroupWhere(group: StatusGroup, now: Date = new Date()): Prisma.TicketWhereInput {
  if (group === "open") return { currentStatus: { in: OPEN_STATUSES } };
  return { currentStatus: { in: RESOLVED_STATUSES }, updatedAt: { gte: recentCutoff(now) } };
}

export function isPriority(value: unknown): value is Priority {
  return typeof value === "string" && (Object.values(Priority) as string[]).includes(value);
}

// Effective priority = itPriority, or requestedPriority when IT has not set one (spec CL-01).
export function effectivePriorityWhere(priority: Priority): Prisma.TicketWhereInput {
  return { OR: [{ itPriority: priority }, { itPriority: null, requestedPriority: priority }] };
}
