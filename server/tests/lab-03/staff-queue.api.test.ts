import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient, Role, Priority, TicketStatus } from "@prisma/client";
import { createTestUser, loginAgent } from "../helpers/testAuth";

const prisma = new PrismaClient();

async function makeTicket(overrides: any = {}) {
  const category = await prisma.category.findFirst();
  const relatedSystem = await prisma.relatedSystem.findFirst();
  const requester = await createTestUser(
    `queue-requester-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    Role.REQUESTER
  );
  return prisma.ticket.create({
    data: {
      ticketNumber: `TEST-QUEUE-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      requesterId: requester.id,
      categoryId: category!.id,
      relatedSystemId: relatedSystem!.id,
      summary: overrides.summary ?? "Queue test ticket",
      description: "Created directly for staff-queue.api.test.ts",
      requestedPriority: Priority.LOW,
      currentStatus: overrides.currentStatus ?? TicketStatus.NEW,
      ticketOwnerId: overrides.ticketOwnerId ?? null,
    },
  });
}

describe("Lab 3 — staff-queue.api", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("IT Staff can retrieve the queue with pagination metadata", async () => {
    await createTestUser("queue-staff1@example.com", Role.IT_STAFF);
    await makeTicket({ summary: "Printer offline again" });
    const agent = await loginAgent("queue-staff1@example.com");

    const res = await agent.get("/api/staff/tickets");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body).toHaveProperty("page");
    expect(res.body).toHaveProperty("pageSize");
    expect(res.body).toHaveProperty("totalItems");
    expect(res.body).toHaveProperty("totalPages");
  });

  it("search matches ticket summary text", async () => {
    await createTestUser("queue-staff2@example.com", Role.IT_STAFF);
    const unique = `UniqueSearchTerm${Date.now()}`;
    await makeTicket({ summary: `VPN broken - ${unique}` });
    const agent = await loginAgent("queue-staff2@example.com");

    const res = await agent.get(`/api/staff/tickets?search=${unique}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.every((t: any) => t.summary.includes(unique))).toBe(true);
  });

  it("unassigned=true returns only tickets with no Ticket Owner", async () => {
    await createTestUser("queue-staff3@example.com", Role.IT_STAFF);
    const owner = await createTestUser("queue-owner3@example.com", Role.IT_STAFF);
    const assigned = await makeTicket({
      summary: "Assigned ticket for unassigned filter test",
      ticketOwnerId: owner.id,
    });
    await makeTicket({ summary: "Unassigned ticket for unassigned filter test" });
    const agent = await loginAgent("queue-staff3@example.com");

    const res = await agent.get("/api/staff/tickets?unassigned=true");
    expect(res.status).toBe(200);
    expect(res.body.items.some((t: any) => t.id === assigned.id)).toBe(false);
  });

  it("status filter only returns tickets in that status", async () => {
    await createTestUser("queue-staff4@example.com", Role.IT_STAFF);
    await makeTicket({
      summary: "Resolved ticket for status filter test",
      currentStatus: TicketStatus.RESOLVED,
    });
    const agent = await loginAgent("queue-staff4@example.com");

    const res = await agent.get("/api/staff/tickets?status=RESOLVED");
    expect(res.status).toBe(200);
    expect(res.body.items.every((t: any) => t.currentStatus === "RESOLVED")).toBe(true);
  });

  it("GET /api/staff/users returns only active IT Staff and Administrator accounts", async () => {
    await createTestUser("queue-staff5@example.com", Role.IT_STAFF);
    await createTestUser("queue-adminlist@example.com", Role.ADMINISTRATOR);
    const agent = await loginAgent("queue-staff5@example.com");

    const res = await agent.get("/api/staff/users");
    expect(res.status).toBe(200);
    expect(res.body.every((u: any) => u.role === "IT_STAFF" || u.role === "ADMINISTRATOR")).toBe(true);
  });

  it("a Requester calling the Queue gets 403", async () => {
    await createTestUser("queue-requester-forbidden@example.com", Role.REQUESTER);
    const agent = await loginAgent("queue-requester-forbidden@example.com");

    const res = await agent.get("/api/staff/tickets");
    expect(res.status).toBe(403);
  });
});