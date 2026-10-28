import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient, Role, Priority, TicketStatus, ActionStatus } from "@prisma/client";
import { createTestUser, loginAgent } from "../helpers/testAuth";

const prisma = new PrismaClient();

const MATRIX: Record<TicketStatus, TicketStatus[]> = {
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

let requesterId: number;
let staffId: number;
let staffAgent: Awaited<ReturnType<typeof loginAgent>>;

async function makeTicket(overrides: any = {}) {
  const category = await prisma.category.findFirst();
  const relatedSystem = await prisma.relatedSystem.findFirst();
  return prisma.ticket.create({
    data: {
      ticketNumber: `TEST-L4WF-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      requesterId,
      categoryId: category!.id,
      relatedSystemId: relatedSystem!.id,
      summary: "Workflow test ticket",
      description: "Created directly for ticket-workflow.api.test.ts",
      requestedPriority: Priority.MEDIUM,
      currentStatus: overrides.currentStatus ?? TicketStatus.OPEN,
      ticketOwnerId: overrides.ticketOwnerId === undefined ? staffId : overrides.ticketOwnerId,
      requesterIndicatedResolved: overrides.requesterIndicatedResolved ?? false,
    },
  });
}

async function addAction(ticketId: number, status: ActionStatus) {
  return prisma.actionTaken.create({
    data: {
      ticketId,
      actionAt: new Date(),
      description: `Workflow ${status} action`,
      result: status === ActionStatus.COMPLETED ? "Done" : null,
      status,
      performedById: staffId,
      assigneeId: staffId,
    },
  });
}

describe("Lab 4 — ticket-workflow.api", () => {
  beforeAll(async () => {
    requesterId = (await createTestUser("l4wf-req@example.com", Role.REQUESTER)).id;
    staffId = (await createTestUser("l4wf-staff@example.com", Role.IT_STAFF)).id;
    staffAgent = await loginAgent("l4wf-staff@example.com");
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("WF-01 (AC-10): every allowed transition succeeds for staff and bumps version", async () => {
    let checked = 0;
    for (const from of ALL) {
      for (const to of MATRIX[from]) {
        const ticket = await makeTicket({ currentStatus: from });
        if (to === TicketStatus.RESOLVED) await addAction(ticket.id, ActionStatus.COMPLETED);

        const res = await staffAgent.patch(`/api/tickets/${ticket.id}/status`).send({ currentStatus: to, expectedVersion: 1 });
        expect(res.status, `${from} -> ${to}`).toBe(200);
        expect(res.body).toMatchObject({ id: ticket.id, currentStatus: to, version: 2 });
        checked++;
      }
    }
    expect(checked).toBe(20);
  }, 120_000);

  it("WF-01 (AC-10): an Administrator can change status too", async () => {
    await createTestUser("l4wf-admin@example.com", Role.ADMINISTRATOR);
    const adminAgent = await loginAgent("l4wf-admin@example.com");
    const ticket = await makeTicket({ currentStatus: TicketStatus.NEW });
    const res = await adminAgent.patch(`/api/tickets/${ticket.id}/status`).send({ currentStatus: "OPEN", expectedVersion: 1 });
    expect(res.status).toBe(200);
  });

  it("WF-02 (AC-10): disallowed, same-status and from-CANCELLED transitions return 422 INVALID_TRANSITION with the allowed list", async () => {
    let checked = 0;
    for (const from of ALL) {
      const ticket = await makeTicket({ currentStatus: from });
      for (const to of ALL) {
        if (MATRIX[from].includes(to)) continue;
        const res = await staffAgent.patch(`/api/tickets/${ticket.id}/status`).send({ currentStatus: to, expectedVersion: 1 });
        expect(res.status, `${from} -> ${to}`).toBe(422);
        expect(res.body.code).toBe("INVALID_TRANSITION");
        expect([...res.body.allowed].sort()).toEqual([...MATRIX[from]].sort());
        checked++;
      }
      const stored = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(stored!.currentStatus).toBe(from);
      expect(stored!.version).toBe(1);
    }
    expect(checked).toBe(44);
  }, 120_000);

  it("WF-03 (AC-10): a Requester cannot change status (403)", async () => {
    const ticket = await makeTicket({ currentStatus: TicketStatus.NEW });
    const reqAgent = await loginAgent("l4wf-req@example.com");
    const res = await reqAgent.patch(`/api/tickets/${ticket.id}/status`).send({ currentStatus: "OPEN", expectedVersion: 1 });
    expect(res.status).toBe(403);
    expect((await prisma.ticket.findUnique({ where: { id: ticket.id } }))!.currentStatus).toBe(TicketStatus.NEW);
  });

  it("WF-04 (AC-11): the resolution gate blocks RESOLVED with the failing reasons", async () => {
    const cases: Array<{ owner: number | null; actions: ActionStatus[]; reasons: string[] }> = [
      { owner: null, actions: [ActionStatus.COMPLETED], reasons: ["NO_OWNER"] },
      { owner: staffId, actions: [], reasons: ["NO_COMPLETED_ACTION"] },
      { owner: staffId, actions: [ActionStatus.CANCELLED], reasons: ["NO_COMPLETED_ACTION"] },
      { owner: staffId, actions: [ActionStatus.COMPLETED, ActionStatus.PLANNED], reasons: ["PLANNED_ACTIONS_PENDING"] },
      { owner: null, actions: [ActionStatus.PLANNED], reasons: ["NO_OWNER", "NO_COMPLETED_ACTION", "PLANNED_ACTIONS_PENDING"] },
    ];
    for (const c of cases) {
      const ticket = await makeTicket({ currentStatus: TicketStatus.IN_PROGRESS, ticketOwnerId: c.owner });
      for (const a of c.actions) await addAction(ticket.id, a);

      const res = await staffAgent.patch(`/api/tickets/${ticket.id}/status`).send({ currentStatus: "RESOLVED", expectedVersion: 1 });
      expect(res.status).toBe(422);
      expect(res.body.code).toBe("RESOLUTION_GATE");
      expect(res.body.reasons).toEqual(c.reasons);
      const stored = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(stored!.currentStatus).toBe(TicketStatus.IN_PROGRESS);
      expect(stored!.version).toBe(1);
    }
  });

  it("WF-05 (AC-11): the gate passes when all conditions hold; the Requester's indicator alone never resolves", async () => {
    const ticket = await makeTicket({ currentStatus: TicketStatus.WAITING_FOR_REQUESTER });
    const reqAgent = await loginAgent("l4wf-req@example.com");

    const indicate = await reqAgent.post(`/api/tickets/${ticket.id}/indicate-resolved`);
    expect(indicate.status).toBe(200);
    let stored = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(stored!.requesterIndicatedResolved).toBe(true);
    expect(stored!.currentStatus).toBe(TicketStatus.WAITING_FOR_REQUESTER);

    await addAction(ticket.id, ActionStatus.COMPLETED);
    await addAction(ticket.id, ActionStatus.CANCELLED);
    const res = await staffAgent
      .patch(`/api/tickets/${ticket.id}/status`)
      .send({ currentStatus: "RESOLVED", expectedVersion: stored!.version });
    expect(res.status).toBe(200);
    expect(res.body.currentStatus).toBe("RESOLVED");
    stored = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(stored!.currentStatus).toBe(TicketStatus.RESOLVED);
  });

  it("WF-06 (AC-12): moving to REOPENED resets requesterIndicatedResolved", async () => {
    for (const from of [TicketStatus.RESOLVED, TicketStatus.CLOSED]) {
      const ticket = await makeTicket({ currentStatus: from, requesterIndicatedResolved: true });
      const res = await staffAgent.patch(`/api/tickets/${ticket.id}/status`).send({ currentStatus: "REOPENED", expectedVersion: 1 });
      expect(res.status).toBe(200);
      expect(res.body.requesterIndicatedResolved).toBe(false);
      expect((await prisma.ticket.findUnique({ where: { id: ticket.id } }))!.requesterIndicatedResolved).toBe(false);
    }
  });

  it("WF-07 (AC-08): a stale status update from a second user is rejected with 409 and not written", async () => {
    await createTestUser("l4wf-staff2@example.com", Role.IT_STAFF);
    const secondAgent = await loginAgent("l4wf-staff2@example.com");
    const ticket = await makeTicket({ currentStatus: TicketStatus.OPEN });

    const v1 = (await staffAgent.get(`/api/tickets/${ticket.id}`)).body.version;
    const v1b = (await secondAgent.get(`/api/tickets/${ticket.id}`)).body.version;
    expect(v1).toBe(1);
    expect(v1b).toBe(1);

    const first = await staffAgent.patch(`/api/tickets/${ticket.id}/status`).send({ currentStatus: "IN_PROGRESS", expectedVersion: v1 });
    expect(first.status).toBe(200);
    const second = await secondAgent
      .patch(`/api/tickets/${ticket.id}/status`)
      .send({ currentStatus: "WAITING_FOR_REQUESTER", expectedVersion: v1b });
    expect(second.status).toBe(409);
    expect(second.body.code).toBe("STALE_UPDATE");

    const stored = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(stored!.currentStatus).toBe(TicketStatus.IN_PROGRESS);
    expect(stored!.version).toBe(2);
  });

  it("WF-07 (L4-BR-15): owner and priority check expectedVersion only when supplied and always bump version", async () => {
    const ticket = await makeTicket({ currentStatus: TicketStatus.OPEN, ticketOwnerId: null });

    const owner = await staffAgent.patch(`/api/tickets/${ticket.id}/owner`).send({ ticketOwnerId: staffId });
    expect(owner.status).toBe(200);
    expect(owner.body.version).toBe(2);

    const priority = await staffAgent.patch(`/api/tickets/${ticket.id}/priority`).send({ itPriority: "HIGH", expectedVersion: 2 });
    expect(priority.status).toBe(200);
    expect(priority.body.version).toBe(3);

    const staleOwner = await staffAgent.patch(`/api/tickets/${ticket.id}/owner`).send({ ticketOwnerId: null, expectedVersion: 1 });
    expect(staleOwner.status).toBe(409);
    expect(staleOwner.body.code).toBe("STALE_UPDATE");
    const stalePriority = await staffAgent.patch(`/api/tickets/${ticket.id}/priority`).send({ itPriority: "LOW", expectedVersion: 2 });
    expect(stalePriority.status).toBe(409);

    const stored = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(stored!.ticketOwnerId).toBe(staffId);
    expect(stored!.itPriority).toBe(Priority.HIGH);
    expect(stored!.version).toBe(3);
  });

  it("WF-08 (AC-08): a status change without expectedVersion returns 400", async () => {
    const ticket = await makeTicket({ currentStatus: TicketStatus.NEW });
    for (const body of [{ currentStatus: "OPEN" }, { currentStatus: "OPEN", expectedVersion: "1" }, { currentStatus: "OPEN", expectedVersion: 0 }]) {
      const res = await staffAgent.patch(`/api/tickets/${ticket.id}/status`).send(body);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION");
    }
    expect((await prisma.ticket.findUnique({ where: { id: ticket.id } }))!.currentStatus).toBe(TicketStatus.NEW);
  });

  it("status change checks 404 before validation and validation before conflicts (api-spec section 6 order)", async () => {
    const missing = await staffAgent.patch(`/api/tickets/99999999/status`).send({ currentStatus: "OPEN" });
    expect(missing.status).toBe(404);

    const ticket = await makeTicket({ currentStatus: TicketStatus.NEW });
    const badValue = await staffAgent.patch(`/api/tickets/${ticket.id}/status`).send({ currentStatus: "NOPE", expectedVersion: 9 });
    expect(badValue.status).toBe(400);

    const staleAndInvalid = await staffAgent.patch(`/api/tickets/${ticket.id}/status`).send({ currentStatus: "CLOSED", expectedVersion: 9 });
    expect(staleAndInvalid.status).toBe(409);
  });
});
