import { TicketStatus } from "@prisma/client";

// Permitted Ticket status transitions (L4-BR-12). Anything not listed, including same-status
// changes and anything from CANCELLED, is rejected.
export const ALLOWED_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  NEW: [TicketStatus.OPEN, TicketStatus.CANCELLED],
  OPEN: [TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
  IN_PROGRESS: [TicketStatus.OPEN, TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
  WAITING_FOR_REQUESTER: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
  RESOLVED: [TicketStatus.CLOSED, TicketStatus.REOPENED],
  CLOSED: [TicketStatus.REOPENED],
  REOPENED: [TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
  CANCELLED: [],
};

export function allowedTransitions(from: TicketStatus): readonly TicketStatus[] {
  return ALLOWED_TRANSITIONS[from];
}

export function isTransitionAllowed(from: TicketStatus, to: TicketStatus) {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export type ResolutionGateReason = "NO_OWNER" | "NO_COMPLETED_ACTION" | "PLANNED_ACTIONS_PENDING";

// Resolution gate (L4-BR-13): reasons are returned in a fixed order; an empty array means the
// Ticket may move to RESOLVED.
export function resolutionGateReasons(input: {
  ticketOwnerId: number | null;
  completedActions: number;
  plannedActions: number;
}): ResolutionGateReason[] {
  const reasons: ResolutionGateReason[] = [];
  if (input.ticketOwnerId === null) reasons.push("NO_OWNER");
  if (input.completedActions < 1) reasons.push("NO_COMPLETED_ACTION");
  if (input.plannedActions > 0) reasons.push("PLANNED_ACTIONS_PENDING");
  return reasons;
}
