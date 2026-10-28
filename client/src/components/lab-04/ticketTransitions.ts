// Client copy of the L4-BR-12 transition matrix, used only to decide which options to offer.
// The server enforces the same matrix (server/src/utils/ticketWorkflow.ts); UI hiding is not authorization.
export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["OPEN", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  CANCELLED: [],
};

export function allowedTransitions(from: string): string[] {
  return ALLOWED_TRANSITIONS[from] ?? [];
}

// Plain-word reasons for a RESOLUTION_GATE 422 (ui-spec section 5).
export const GATE_REASON_TEXT: Record<string, string> = {
  NO_OWNER: "Assign a Ticket Owner",
  NO_COMPLETED_ACTION: "Complete at least one action",
  PLANNED_ACTIONS_PENDING: "Complete or cancel planned actions",
};
