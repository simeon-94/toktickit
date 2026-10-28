import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "crypto";
import { PrismaClient, Role, Priority, TicketStatus } from "@prisma/client";
import { createTestUser, loginAgent } from "../helpers/testAuth";

const prisma = new PrismaClient();

async function makeTicket(requesterId: number, overrides: any = {}) {
  const category = await prisma.category.findFirst();
  const relatedSystem = await prisma.relatedSystem.findFirst();
  return prisma.ticket.create({
    data: {
      ticketNumber: `TEST-L4ACT-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      requesterId,
      categoryId: category!.id,
      relatedSystemId: relatedSystem!.id,
      summary: overrides.summary ?? "Actions Taken test ticket",
      description: "Created directly for actions-taken.api.test.ts",
      requestedPriority: Priority.MEDIUM,
      currentStatus: overrides.currentStatus ?? TicketStatus.OPEN,
      ticketOwnerId: overrides.ticketOwnerId ?? null,
    },
  });
}

async function setup(suffix: string, ticketOverrides: any = {}) {
  const requester = await createTestUser(`l4act-req-${suffix}@example.com`, Role.REQUESTER);
  const staff = await createTestUser(`l4act-staff-${suffix}@example.com`, Role.IT_STAFF);
  const ticket = await makeTicket(requester.id, ticketOverrides);
  const staffAgent = await loginAgent(`l4act-staff-${suffix}@example.com`);
  return { requester, staff, ticket, staffAgent };
}

describe("Lab 4 — actions-taken.api", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("API-01 (AC-01): staff creates a valid action; performer = caller, assignee defaults to caller", async () => {
    const { requester, staff, ticket, staffAgent } = await setup("01");
    const before = await prisma.ticket.findUnique({ where: { id: ticket.id } });

    const res = await staffAgent.post(`/api/tickets/${ticket.id}/actions`).send({
      description: "Restarted the VPN concentrator",
      performedById: requester.id,
      status: "COMPLETED",
      result: "should be ignored",
    });

    expect(res.status).toBe(201);
    expect(res.body.ticketId).toBe(ticket.id);
    expect(res.body.performedById).toBe(staff.id);
    expect(res.body.performedByName).toBe(staff.name);
    expect(res.body.assigneeId).toBe(staff.id);
    expect(res.body.assigneeName).toBe(staff.name);
    expect(res.body.status).toBe("PLANNED");
    expect(res.body.result).toBeNull();
    expect(res.body.followUpRequired).toBe(false);
    expect(res.body.followUpNote).toBeNull();
    expect(res.body.version).toBe(1);

    const stored = await prisma.actionTaken.findUnique({ where: { id: res.body.id } });
    expect(stored!.ticketId).toBe(ticket.id);
    expect(stored!.performedById).toBe(staff.id);

    const after = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(after!.updatedAt.getTime()).toBeGreaterThan(before!.updatedAt.getTime());
  });

  it("API-02 (AC-03): invalid create payloads return 400 VALIDATION with field errors and store nothing", async () => {
    const { ticket, staffAgent } = await setup("02");

    const cases: Array<[any, string]> = [
      [{ description: "ab" }, "description"],
      [{ description: "Valid description", followUpRequired: true }, "followUpNote"],
      [{ description: "Valid description", attachmentNotes: "x".repeat(501) }, "attachmentNotes"],
      [{ description: "x".repeat(1001) }, "description"],
      [{ description: "Valid description", actionAt: "not-a-date" }, "actionAt"],
    ];

    for (const [body, field] of cases) {
      const res = await staffAgent.post(`/api/tickets/${ticket.id}/actions`).send(body);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION");
      expect(typeof res.body.error).toBe("string");
      expect(res.body.fields[field]).toBeDefined();
    }

    expect(await prisma.actionTaken.count({ where: { ticketId: ticket.id } })).toBe(0);
  });

  it("API-03 (AC-04): inactive or Requester-role assignee is rejected; active staff assignee is accepted", async () => {
    const { requester, ticket, staffAgent } = await setup("03");
    const inactive = await createTestUser("l4act-inactive-03@example.com", Role.IT_STAFF);
    await prisma.user.update({ where: { id: inactive.id }, data: { isActive: false } });
    const other = await createTestUser("l4act-other-03@example.com", Role.IT_STAFF);

    const r1 = await staffAgent.post(`/api/tickets/${ticket.id}/actions`).send({ description: "Check switch", assigneeId: inactive.id });
    expect(r1.status).toBe(400);
    expect(r1.body.fields.assigneeId).toBeDefined();

    const r2 = await staffAgent.post(`/api/tickets/${ticket.id}/actions`).send({ description: "Check switch", assigneeId: requester.id });
    expect(r2.status).toBe(400);
    expect(r2.body.fields.assigneeId).toBeDefined();

    const r3 = await staffAgent.post(`/api/tickets/${ticket.id}/actions`).send({ description: "Check switch", assigneeId: 99999999 });
    expect(r3.status).toBe(400);
    expect(r3.body.fields.assigneeId).toBeDefined();

    expect(await prisma.actionTaken.count({ where: { ticketId: ticket.id } })).toBe(0);

    const ok = await staffAgent.post(`/api/tickets/${ticket.id}/actions`).send({ description: "Check switch", assigneeId: other.id });
    expect(ok.status).toBe(201);
    expect(ok.body.assigneeId).toBe(other.id);

    const edit = await staffAgent
      .patch(`/api/tickets/${ticket.id}/actions/${ok.body.id}`)
      .send({ expectedVersion: 1, assigneeId: inactive.id });
    expect(edit.status).toBe(400);
    expect(edit.body.fields.assigneeId).toBeDefined();
  });

  it("API-04 (AC-05): PLANNED actions can be edited; COMPLETED/CANCELLED are locked (422 ACTION_LOCKED)", async () => {
    const { ticket, staffAgent } = await setup("04");
    const a = (await staffAgent.post(`/api/tickets/${ticket.id}/actions`).send({ description: "First draft" })).body;
    const b = (await staffAgent.post(`/api/tickets/${ticket.id}/actions`).send({ description: "Second draft" })).body;

    const edited = await staffAgent.patch(`/api/tickets/${ticket.id}/actions/${a.id}`).send({
      expectedVersion: 1,
      description: "Edited description",
      followUpRequired: true,
      followUpNote: "Confirm with requester",
    });
    expect(edited.status).toBe(200);
    expect(edited.body.description).toBe("Edited description");
    expect(edited.body.followUpNote).toBe("Confirm with requester");
    expect(edited.body.version).toBe(2);

    const missingVersion = await staffAgent.patch(`/api/tickets/${ticket.id}/actions/${a.id}`).send({ description: "No version" });
    expect(missingVersion.status).toBe(400);

    await staffAgent.post(`/api/tickets/${ticket.id}/actions/${a.id}/complete`).send({ expectedVersion: 2, result: "Done" });
    await staffAgent.post(`/api/tickets/${ticket.id}/actions/${b.id}/cancel`).send({ expectedVersion: 1 });

    const lockedA = await staffAgent.patch(`/api/tickets/${ticket.id}/actions/${a.id}`).send({ expectedVersion: 3, description: "Too late" });
    expect(lockedA.status).toBe(422);
    expect(lockedA.body.code).toBe("ACTION_LOCKED");

    const lockedB = await staffAgent.patch(`/api/tickets/${ticket.id}/actions/${b.id}`).send({ expectedVersion: 2, description: "Too late" });
    expect(lockedB.status).toBe(422);
    expect(lockedB.body.code).toBe("ACTION_LOCKED");

    const stored = await prisma.actionTaken.findUnique({ where: { id: a.id } });
    expect(stored!.description).toBe("Edited description");
  });

  it("API-05 (AC-06): complete requires a result; cancel sets CANCELLED; no DELETE endpoint", async () => {
    const { ticket, staffAgent } = await setup("05");
    const a = (await staffAgent.post(`/api/tickets/${ticket.id}/actions`).send({ description: "Replace toner" })).body;
    const b = (await staffAgent.post(`/api/tickets/${ticket.id}/actions`).send({ description: "Order spare" })).body;

    const noResult = await staffAgent.post(`/api/tickets/${ticket.id}/actions/${a.id}/complete`).send({ expectedVersion: 1 });
    expect(noResult.status).toBe(400);
    expect(noResult.body.fields.result).toBeDefined();

    const blankResult = await staffAgent.post(`/api/tickets/${ticket.id}/actions/${a.id}/complete`).send({ expectedVersion: 1, result: "   " });
    expect(blankResult.status).toBe(400);

    const completed = await staffAgent
      .post(`/api/tickets/${ticket.id}/actions/${a.id}/complete`)
      .send({ expectedVersion: 1, result: "Toner replaced, test page OK" });
    expect(completed.status).toBe(200);
    expect(completed.body.status).toBe("COMPLETED");
    expect(completed.body.result).toBe("Toner replaced, test page OK");
    expect(completed.body.version).toBe(2);

    const cancelled = await staffAgent.post(`/api/tickets/${ticket.id}/actions/${b.id}/cancel`).send({ expectedVersion: 1 });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.status).toBe("CANCELLED");

    const recomplete = await staffAgent.post(`/api/tickets/${ticket.id}/actions/${b.id}/complete`).send({ expectedVersion: 2, result: "x" });
    expect(recomplete.status).toBe(422);
    expect(recomplete.body.code).toBe("ACTION_LOCKED");

    const recancel = await staffAgent.post(`/api/tickets/${ticket.id}/actions/${a.id}/cancel`).send({ expectedVersion: 2 });
    expect(recancel.status).toBe(422);
    expect(recancel.body.code).toBe("ACTION_LOCKED");

    const del = await staffAgent.delete(`/api/tickets/${ticket.id}/actions/${a.id}`);
    expect([404, 405]).toContain(del.status);
    expect(await prisma.actionTaken.count({ where: { ticketId: ticket.id } })).toBe(2);
  });

  it("API-06 (AC-07): staff B acts on a Ticket owned by staff A; list is stable (actionAt desc, id desc)", async () => {
    const { ticket, staff: staffA, staffAgent: agentA } = await setup("06");
    await prisma.ticket.update({ where: { id: ticket.id }, data: { ticketOwnerId: staffA.id } });
    const staffB = await createTestUser("l4act-staffB-06@example.com", Role.IT_STAFF);
    const agentB = await loginAgent("l4act-staffB-06@example.com");

    const sameTime = "2026-10-20T08:00:00.000Z";
    const a1 = await agentA.post(`/api/tickets/${ticket.id}/actions`).send({ description: "A: older action", actionAt: "2026-10-19T08:00:00.000Z" });
    const b1 = await agentB.post(`/api/tickets/${ticket.id}/actions`).send({ description: "B: action one", actionAt: sameTime });
    const b2 = await agentB.post(`/api/tickets/${ticket.id}/actions`).send({ description: "B: action two", actionAt: sameTime });
    expect(a1.status).toBe(201);
    expect(b1.status).toBe(201);
    expect(b2.status).toBe(201);
    expect(b1.body.performedById).toBe(staffB.id);

    const list = await agentA.get(`/api/tickets/${ticket.id}/actions`);
    expect(list.status).toBe(200);
    expect(list.body.items.map((i: any) => i.id)).toEqual([b2.body.id, b1.body.id, a1.body.id]);
    const performers = new Set(list.body.items.map((i: any) => i.performedById));
    expect(performers).toEqual(new Set([staffA.id, staffB.id]));

    const again = await agentB.get(`/api/tickets/${ticket.id}/actions`);
    expect(again.body.items.map((i: any) => i.id)).toEqual(list.body.items.map((i: any) => i.id));
  });

  it("API-07 (AC-08): stale action updates return 409 STALE_UPDATE and leave data unchanged", async () => {
    const { ticket, staffAgent } = await setup("07");
    const a = (await staffAgent.post(`/api/tickets/${ticket.id}/actions`).send({ description: "Original text" })).body;

    const first = await staffAgent.patch(`/api/tickets/${ticket.id}/actions/${a.id}`).send({ expectedVersion: 1, description: "First writer" });
    expect(first.status).toBe(200);

    const stale = await staffAgent.patch(`/api/tickets/${ticket.id}/actions/${a.id}`).send({ expectedVersion: 1, description: "Second writer" });
    expect(stale.status).toBe(409);
    expect(stale.body.code).toBe("STALE_UPDATE");

    const staleComplete = await staffAgent.post(`/api/tickets/${ticket.id}/actions/${a.id}/complete`).send({ expectedVersion: 1, result: "x" });
    expect(staleComplete.status).toBe(409);
    const staleCancel = await staffAgent.post(`/api/tickets/${ticket.id}/actions/${a.id}/cancel`).send({ expectedVersion: 1 });
    expect(staleCancel.status).toBe(409);

    const stored = await prisma.actionTaken.findUnique({ where: { id: a.id } });
    expect(stored!.description).toBe("First writer");
    expect(stored!.status).toBe("PLANNED");
    expect(stored!.version).toBe(2);
  });

  it("API-08 (AC-09): the same clientRequestId creates exactly one action", async () => {
    const { ticket, requester, staffAgent } = await setup("08");
    const clientRequestId = randomUUID();

    const r1 = await staffAgent.post(`/api/tickets/${ticket.id}/actions`).send({ description: "Idempotent create", clientRequestId });
    const r2 = await staffAgent.post(`/api/tickets/${ticket.id}/actions`).send({ description: "Idempotent create", clientRequestId });
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(200);
    expect(r2.body.id).toBe(r1.body.id);
    expect(await prisma.actionTaken.count({ where: { ticketId: ticket.id } })).toBe(1);

    const otherTicket = await makeTicket(requester.id);
    const r3 = await staffAgent.post(`/api/tickets/${otherTicket.id}/actions`).send({ description: "Reused id", clientRequestId });
    expect(r3.status).toBe(400);
    expect(r3.body.fields.clientRequestId).toBeDefined();
    expect(await prisma.actionTaken.count({ where: { ticketId: otherTicket.id } })).toBe(0);
  });

  it("API-09 (AC-02): Requesters cannot write actions, can read their own Ticket's actions, get 404 on others", async () => {
    const { ticket, staffAgent } = await setup("09");
    const planned = (await staffAgent.post(`/api/tickets/${ticket.id}/actions`).send({ description: "Planned work" })).body;
    const done = (await staffAgent.post(`/api/tickets/${ticket.id}/actions`).send({ description: "Done work" })).body;
    await staffAgent.post(`/api/tickets/${ticket.id}/actions/${done.id}/complete`).send({ expectedVersion: 1, result: "OK" });
    const cancelled = (await staffAgent.post(`/api/tickets/${ticket.id}/actions`).send({ description: "Dropped work" })).body;
    await staffAgent.post(`/api/tickets/${ticket.id}/actions/${cancelled.id}/cancel`).send({ expectedVersion: 1 });

    const reqAgent = await loginAgent("l4act-req-09@example.com");
    expect((await reqAgent.post(`/api/tickets/${ticket.id}/actions`).send({ description: "Requester try" })).status).toBe(403);
    expect((await reqAgent.patch(`/api/tickets/${ticket.id}/actions/${planned.id}`).send({ expectedVersion: 1, description: "Hack" })).status).toBe(403);
    expect((await reqAgent.post(`/api/tickets/${ticket.id}/actions/${planned.id}/complete`).send({ expectedVersion: 1, result: "x" })).status).toBe(403);
    expect((await reqAgent.post(`/api/tickets/${ticket.id}/actions/${planned.id}/cancel`).send({ expectedVersion: 1 })).status).toBe(403);

    const own = await reqAgent.get(`/api/tickets/${ticket.id}/actions`);
    expect(own.status).toBe(200);
    expect(own.body.items.map((i: any) => i.status).sort()).toEqual(["CANCELLED", "COMPLETED", "PLANNED"]);

    await createTestUser("l4act-req2-09@example.com", Role.REQUESTER);
    const otherAgent = await loginAgent("l4act-req2-09@example.com");
    expect((await otherAgent.get(`/api/tickets/${ticket.id}/actions`)).status).toBe(404);
    expect((await staffAgent.get(`/api/tickets/99999999/actions`)).status).toBe(404);

    const otherTicket = await makeTicket((await prisma.user.findUnique({ where: { email: "l4act-req2-09@example.com" } }))!.id);
    expect((await staffAgent.patch(`/api/tickets/${otherTicket.id}/actions/${planned.id}`).send({ expectedVersion: 1, description: "Wrong ticket" })).status).toBe(404);

    expect((await prisma.actionTaken.findUnique({ where: { id: planned.id } }))!.status).toBe("PLANNED");
  });

  it("API-10 (L4-BR-11): actions cannot be created on CLOSED or CANCELLED Tickets", async () => {
    const { requester, staffAgent } = await setup("10");
    for (const currentStatus of [TicketStatus.CLOSED, TicketStatus.CANCELLED]) {
      const t = await makeTicket(requester.id, { currentStatus });
      const res = await staffAgent.post(`/api/tickets/${t.id}/actions`).send({ description: "Should not be stored" });
      expect(res.status).toBe(422);
      expect(res.body.code).toBe("TICKET_TERMINAL");
      expect(await prisma.actionTaken.count({ where: { ticketId: t.id } })).toBe(0);
    }
  });

  it("Ticket version is exposed on Ticket Detail and staff queue items (api-spec conventions)", async () => {
    const { ticket, staffAgent } = await setup("ver");
    const detail = await staffAgent.get(`/api/tickets/${ticket.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.version).toBe(1);

    const queue = await staffAgent.get(`/api/staff/tickets`).query({ search: ticket.ticketNumber });
    expect(queue.status).toBe(200);
    expect(queue.body.items[0].id).toBe(ticket.id);
    expect(queue.body.items[0].version).toBe(1);
  });
});
