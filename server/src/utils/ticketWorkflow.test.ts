import { describe, it, expect } from "vitest";
import { TicketStatus } from "@prisma/client";
import { allowedTransitions, isTransitionAllowed, resolutionGateReasons } from "./ticketWorkflow";

// L4-BR-12 matrix, written out independently of the implementation.
const EXPECTED: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["OPEN", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  CANCELLED: [],
};

const ALL = Object.values(TicketStatus);

describe("Lab 4 — UNIT-01 transition matrix (L4-BR-12)", () => {
  it("returns true for exactly the 20 allowed pairs out of 64", () => {
    let allowed = 0;
    for (const from of ALL) {
      for (const to of ALL) {
        const expected = EXPECTED[from].includes(to);
        expect(isTransitionAllowed(from, to), `${from} -> ${to}`).toBe(expected);
        if (expected) allowed++;
      }
    }
    expect(ALL).toHaveLength(8);
    expect(allowed).toBe(20);
  });

  it("rejects every same-status pair and everything from CANCELLED", () => {
    for (const s of ALL) expect(isTransitionAllowed(s, s)).toBe(false);
    for (const to of ALL) expect(isTransitionAllowed(TicketStatus.CANCELLED, to)).toBe(false);
  });

  it("lists the allowed next statuses for each status", () => {
    for (const from of ALL) expect([...allowedTransitions(from)].sort()).toEqual([...EXPECTED[from]].sort());
  });
});

describe("Lab 4 — UNIT-02 resolution gate (L4-BR-13)", () => {
  it("passes with an owner, a completed action and no planned action", () => {
    expect(resolutionGateReasons({ ticketOwnerId: 3, completedActions: 1, plannedActions: 0 })).toEqual([]);
  });

  it("reports every failing condition in a stable order", () => {
    expect(resolutionGateReasons({ ticketOwnerId: null, completedActions: 1, plannedActions: 0 })).toEqual(["NO_OWNER"]);
    expect(resolutionGateReasons({ ticketOwnerId: 3, completedActions: 0, plannedActions: 0 })).toEqual(["NO_COMPLETED_ACTION"]);
    expect(resolutionGateReasons({ ticketOwnerId: 3, completedActions: 2, plannedActions: 1 })).toEqual(["PLANNED_ACTIONS_PENDING"]);
    expect(resolutionGateReasons({ ticketOwnerId: null, completedActions: 0, plannedActions: 2 })).toEqual([
      "NO_OWNER",
      "NO_COMPLETED_ACTION",
      "PLANNED_ACTIONS_PENDING",
    ]);
  });
});
