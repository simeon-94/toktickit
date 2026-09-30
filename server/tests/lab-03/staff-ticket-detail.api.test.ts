import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient, Role, Priority, TicketStatus } from "@prisma/client";
import { createTestUser, loginAgent } from "../helpers/testAuth";

const prisma = new PrismaClient();

async function makeTicket(requesterId: number, overrides: any = {}) {
  const category = await prisma.category.findFirst();
  const relatedSystem = await prisma.relatedSystem.findFirst();
  return prisma.ticket.create({
    data: {
      ticketNumber: `TEST-DETAIL-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      requesterId,
      categoryId: category!.id,
      relatedSystemId: relatedSystem!.id,
      summary: overrides.summary ?? "Staff ticket detail test",
      description: "Created directly for staff-ticket-detail.api.test.ts",
      requestedPriority: Priority.LOW,
      currentStatus: overrides.currentStatus ?? TicketStatus.NEW,
      ticketOwnerId: overrides.ticketOwnerId ?? null,
    },
  });
}

describe("Lab 3 — staff-ticket-detail.api", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("IT Staff can retrieve any Ticket by id, not just their own", async () => {
    const requester = await createTestUser("detail-requester1@example.com", Role.REQUESTER);
    await createTestUser("detail-staff1@example.com", Role.IT_STAFF);
    const ticket = await makeTicket(requester.id, { summary: "Ticket a Staff member did not create" });
    const agent = await loginAgent("detail-staff1@example.com");

    const res = await agent.get(`/api/tickets/${ticket.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ticket.id);
  });

  it("AC-08: IT Staff can claim an unassigned ticket, becoming Ticket Owner", async () => {
    const requester = await createTestUser("detail-requester2@example.com", Role.REQUESTER);
    const staff = await createTestUser("detail-staff2@example.com", Role.IT_STAFF);
    const ticket = await makeTicket(requester.id, { summary: "Unassigned ticket to claim" });
    const agent = await loginAgent("detail-staff2@example.com");

    const res = await agent.patch(`/api/tickets/${ticket.id}/owner`).send({ ticketOwnerId: staff.id });
    expect(res.status).toBe(200);
    expect(res.body.ticketOwnerId).toBe(staff.id);
  });

  it("IT Staff can reassign ownership to another active staff member", async () => {
    const requester = await createTestUser("detail-requester3@example.com", Role.REQUESTER);
    const staffA = await createTestUser("detail-staffA3@example.com", Role.IT_STAFF);
    const staffB = await createTestUser("detail-staffB3@example.com", Role.IT_STAFF);
    const ticket = await makeTicket(requester.id, { ticketOwnerId: staffA.id });
    const agent = await loginAgent("detail-staffA3@example.com");

    const res = await agent.patch(`/api/tickets/${ticket.id}/owner`).send({ ticketOwnerId: staffB.id });
    expect(res.status).toBe(200);
    expect(res.body.ticketOwnerId).toBe(staffB.id);
  });

  it("assigning ownership to an inactive or non-staff user is rejected", async () => {
    const requester = await createTestUser("detail-requester4@example.com", Role.REQUESTER);
    await createTestUser("detail-staff4@example.com", Role.IT_STAFF);
    const notStaff = await createTestUser("detail-notstaff4@example.com", Role.REQUESTER);
    const ticket = await makeTicket(requester.id);
    const agent = await loginAgent("detail-staff4@example.com");

    const res = await agent.patch(`/api/tickets/${ticket.id}/owner`).send({ ticketOwnerId: notStaff.id });
    expect(res.status).toBe(400);
  });

  it("IT Priority can be changed by IT Staff, independent of Requested Priority", async () => {
    const requester = await createTestUser("detail-requester5@example.com", Role.REQUESTER);
    await createTestUser("detail-staff5@example.com", Role.IT_STAFF);
    const ticket = await makeTicket(requester.id);
    const agent = await loginAgent("detail-staff5@example.com");

    const res = await agent.patch(`/api/tickets/${ticket.id}/priority`).send({ itPriority: "HIGH" });
    expect(res.status).toBe(200);
    expect(res.body.itPriority).toBe("HIGH");

    const stored = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(stored!.requestedPriority).toBe(Priority.LOW);
  });

  it("a permitted status change is accepted", async () => {
    const requester = await createTestUser("detail-requester6@example.com", Role.REQUESTER);
    await createTestUser("detail-staff6@example.com", Role.IT_STAFF);
    const ticket = await makeTicket(requester.id, { currentStatus: TicketStatus.NEW });
    const agent = await loginAgent("detail-staff6@example.com");

    const res = await agent.patch(`/api/tickets/${ticket.id}/status`).send({ currentStatus: "OPEN" });
    expect(res.status).toBe(200);
    expect(res.body.currentStatus).toBe("OPEN");
  });

  it("an invalid status value is rejected", async () => {
    const requester = await createTestUser("detail-requester7@example.com", Role.REQUESTER);
    await createTestUser("detail-staff7@example.com", Role.IT_STAFF);
    const ticket = await makeTicket(requester.id);
    const agent = await loginAgent("detail-staff7@example.com");

    const res = await agent.patch(`/api/tickets/${ticket.id}/status`).send({ currentStatus: "NOT_A_REAL_STATUS" });
    expect(res.status).toBe(400);
  });

  it("a Requester cannot claim, reassign, change priority, or change status", async () => {
    const requester = await createTestUser("detail-requester8@example.com", Role.REQUESTER);
    const staff = await createTestUser("detail-staff8@example.com", Role.IT_STAFF);
    const ticket = await makeTicket(requester.id);
    const agent = await loginAgent("detail-requester8@example.com");

    const ownerRes = await agent.patch(`/api/tickets/${ticket.id}/owner`).send({ ticketOwnerId: staff.id });
    const priorityRes = await agent.patch(`/api/tickets/${ticket.id}/priority`).send({ itPriority: "HIGH" });
    const statusRes = await agent.patch(`/api/tickets/${ticket.id}/status`).send({ currentStatus: "OPEN" });

    expect(ownerRes.status).toBe(403);
    expect(priorityRes.status).toBe(403);
    expect(statusRes.status).toBe(403);
  });
});