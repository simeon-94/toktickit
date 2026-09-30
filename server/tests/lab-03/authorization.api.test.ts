import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { PrismaClient, Role } from "@prisma/client";
import { createTestUser, loginAgent } from "../helpers/testAuth";

const prisma = new PrismaClient();

describe("Lab 3 — authorization.api", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("AC-06: a client-supplied requesterId is ignored; ownership always comes from the authenticated user", async () => {
    const userA = await createTestUser("authz-userA@example.com", Role.REQUESTER);
    await createTestUser("authz-userB@example.com", Role.REQUESTER);
    const category = await prisma.category.findFirst();
    const relatedSystem = await prisma.relatedSystem.findFirst();

    const agentB = await loginAgent("authz-userB@example.com");
    const res = await agentB.post("/api/tickets").send({
      requesterId: userA.id,
      categoryId: category!.id,
      relatedSystemId: relatedSystem!.id,
      summary: "Ticket created while spoofing requesterId",
      description: "This ticket body includes a spoofed requesterId that must be ignored.",
      requestedPriority: "LOW",
    });

    expect(res.status).toBe(201);
    const created = await prisma.ticket.findUnique({ where: { id: res.body.id } });
    expect(created!.requesterId).not.toBe(userA.id);
  });

  it("AC-07: a Requester calling the Internal Notes endpoint is rejected without leaking note content", async () => {
    const owner = await createTestUser("authz-noteowner@example.com", Role.REQUESTER);
    const category = await prisma.category.findFirst();
    const relatedSystem = await prisma.relatedSystem.findFirst();
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TEST-NOTES-${Date.now()}`,
        requesterId: owner.id,
        categoryId: category!.id,
        relatedSystemId: relatedSystem!.id,
        summary: "Ticket for Internal Notes authorization test",
        description: "Used to confirm Requesters cannot read or write Internal Notes.",
        requestedPriority: "LOW",
      },
    });

    const agent = await loginAgent("authz-noteowner@example.com");

    const getRes = await agent.get(`/api/tickets/${ticket.id}/notes`);
    expect(getRes.status).toBe(403);
    expect(JSON.stringify(getRes.body).toLowerCase()).not.toContain("content");

    const postRes = await agent.post(`/api/tickets/${ticket.id}/notes`).send({ content: "should never be stored" });
    expect(postRes.status).toBe(403);

    const noteCount = await prisma.internalNote.count({ where: { ticketId: ticket.id } });
    expect(noteCount).toBe(0);
  });

  it("AC-12: a non-Administrator calling /api/admin/users gets 403", async () => {
    await createTestUser("authz-notadmin@example.com", Role.REQUESTER);
    const agent = await loginAgent("authz-notadmin@example.com");

    const res = await agent.get("/api/admin/users");
    expect(res.status).toBe(403);
  });

  it("a Requester calling the IT Staff Ticket Queue gets 403", async () => {
    await createTestUser("authz-notstaff@example.com", Role.REQUESTER);
    const agent = await loginAgent("authz-notstaff@example.com");

    const res = await agent.get("/api/staff/tickets");
    expect(res.status).toBe(403);
  });

  it("IT Staff and Administrator can both reach the Ticket Queue", async () => {
    await createTestUser("authz-staff@example.com", Role.IT_STAFF);
    await createTestUser("authz-admin@example.com", Role.ADMINISTRATOR);
    const staffAgent = await loginAgent("authz-staff@example.com");
    const adminAgent = await loginAgent("authz-admin@example.com");

    const staffRes = await staffAgent.get("/api/staff/tickets");
    const adminRes = await adminAgent.get("/api/staff/tickets");

    expect(staffRes.status).toBe(200);
    expect(adminRes.status).toBe(200);
  });
});