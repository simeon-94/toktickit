import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient, Role, Priority } from "@prisma/client";
import { createTestUser, loginAgent } from "../helpers/testAuth";

const prisma = new PrismaClient();

async function makeTicket(requesterId: number) {
  const category = await prisma.category.findFirst();
  const relatedSystem = await prisma.relatedSystem.findFirst();
  return prisma.ticket.create({
    data: {
      ticketNumber: `TEST-NOTES2-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      requesterId,
      categoryId: category!.id,
      relatedSystemId: relatedSystem!.id,
      summary: "Comments/Notes test ticket",
      description: "Created directly for comments-notes.api.test.ts",
      requestedPriority: Priority.LOW,
    },
  });
}

describe("Lab 3 — comments-notes.api", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("BR-04: a Requester can post and read Public Comments on their own ticket", async () => {
    const requester = await createTestUser("cn-requester1@example.com", Role.REQUESTER);
    const ticket = await makeTicket(requester.id);
    const agent = await loginAgent("cn-requester1@example.com");

    const postRes = await agent.post(`/api/tickets/${ticket.id}/comments`).send({ content: "Still happening, please help." });
    expect(postRes.status).toBe(201);
    expect(postRes.body.authorName).toBeTruthy();

    const getRes = await agent.get(`/api/tickets/${ticket.id}/comments`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.some((c: any) => c.content === "Still happening, please help.")).toBe(true);
  });

  it("BR-04: a Public Comment posted by IT Staff is visible to the Requester", async () => {
    const requester = await createTestUser("cn-requester2@example.com", Role.REQUESTER);
    await createTestUser("cn-staff2@example.com", Role.IT_STAFF);
    const ticket = await makeTicket(requester.id);
    const staffAgent = await loginAgent("cn-staff2@example.com");
    await staffAgent.post(`/api/tickets/${ticket.id}/comments`).send({ content: "We are investigating your device." });

    const requesterAgent = await loginAgent("cn-requester2@example.com");
    const res = await requesterAgent.get(`/api/tickets/${ticket.id}/comments`);
    expect(res.status).toBe(200);
    expect(res.body.some((c: any) => c.content === "We are investigating your device.")).toBe(true);
  });

  it("BR-13: an empty or whitespace-only comment is rejected", async () => {
    const requester = await createTestUser("cn-requester3@example.com", Role.REQUESTER);
    const ticket = await makeTicket(requester.id);
    const agent = await loginAgent("cn-requester3@example.com");

    const res = await agent.post(`/api/tickets/${ticket.id}/comments`).send({ content: "   " });
    expect(res.status).toBe(400);
  });

  it("BR-04: IT Staff can post and read Internal Notes; content never appears via the Public Comments endpoint", async () => {
    const requester = await createTestUser("cn-requester4@example.com", Role.REQUESTER);
    await createTestUser("cn-staff4@example.com", Role.IT_STAFF);
    const ticket = await makeTicket(requester.id);
    const agent = await loginAgent("cn-staff4@example.com");

    const postRes = await agent.post(`/api/tickets/${ticket.id}/notes`).send({ content: "Internal: waiting on vendor RMA." });
    expect(postRes.status).toBe(201);

    const getRes = await agent.get(`/api/tickets/${ticket.id}/notes`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.some((n: any) => n.content === "Internal: waiting on vendor RMA.")).toBe(true);

    const requesterAgent = await loginAgent("cn-requester4@example.com");
    const commentsRes = await requesterAgent.get(`/api/tickets/${ticket.id}/comments`);
    expect(commentsRes.body.some((c: any) => c.content === "Internal: waiting on vendor RMA.")).toBe(false);
  });

  it("BR-13: an empty Internal Note is rejected", async () => {
    const requester = await createTestUser("cn-requester5@example.com", Role.REQUESTER);
    await createTestUser("cn-staff5@example.com", Role.IT_STAFF);
    const ticket = await makeTicket(requester.id);
    const agent = await loginAgent("cn-staff5@example.com");

    const res = await agent.post(`/api/tickets/${ticket.id}/notes`).send({ content: "" });
    expect(res.status).toBe(400);
  });

  it("a Requester cannot post or read Internal Notes on their own ticket", async () => {
    const requester = await createTestUser("cn-requester6@example.com", Role.REQUESTER);
    const ticket = await makeTicket(requester.id);
    const agent = await loginAgent("cn-requester6@example.com");

    const getRes = await agent.get(`/api/tickets/${ticket.id}/notes`);
    const postRes = await agent.post(`/api/tickets/${ticket.id}/notes`).send({ content: "should be forbidden" });

    expect(getRes.status).toBe(403);
    expect(postRes.status).toBe(403);
  });
});