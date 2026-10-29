import { describe, it, expect, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import app from "../../src/app";
import { errorHandler } from "../../src/middleware/errors";
import { PrismaClient, Role, Priority, TicketStatus } from "@prisma/client";
import { createTestUser, loginAgent } from "../helpers/testAuth";

// #69 (CL-07): an invalid ticket list filter value used to throw inside the async handler; Express 4
// left the rejection unhandled and the API process exited. Requests time out quickly here so a
// regression shows up as a failed test instead of a hung run.
const prisma = new PrismaClient();
const TIMEOUT = 5000;

async function makeTicket(requesterId: number, status: TicketStatus, priority: Priority) {
  const category = await prisma.category.findFirst();
  const relatedSystem = await prisma.relatedSystem.findFirst();
  return prisma.ticket.create({
    data: {
      ticketNumber: `TEST-L4FILTER-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      requesterId,
      categoryId: category!.id,
      relatedSystemId: relatedSystem!.id,
      summary: "Filter validation test ticket",
      description: "Created directly for filter-validation.api.test.ts",
      requestedPriority: priority,
      itPriority: priority,
      currentStatus: status,
    },
  });
}

describe("Lab 4 — ticket list filter validation (#69)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("HARD-06: GET /api/tickets rejects an unknown status or priority with 400 VALIDATION", async () => {
    const email = `l4filter-req-${Date.now()}@example.com`;
    await createTestUser(email, Role.REQUESTER);
    const agent = await loginAgent(email);

    for (const [query, field] of [
      ["status=New", "status"],
      ["status=bogus", "status"],
      ["priority=urgent", "priority"],
      ["priority=High", "priority"],
    ]) {
      const res = await agent.get(`/api/tickets?${query}`).timeout(TIMEOUT);
      expect(res.status, query).toBe(400);
      expect(res.body.code, query).toBe("VALIDATION");
      expect(res.body.fields, query).toHaveProperty(field);
    }
    // The API is still up after the invalid requests.
    expect((await agent.get("/api/tickets").timeout(TIMEOUT)).status).toBe(200);
  });

  it("HARD-06: GET /api/tickets still filters by a valid status and priority", async () => {
    const email = `l4filter-req2-${Date.now()}@example.com`;
    const user = await createTestUser(email, Role.REQUESTER);
    const agent = await loginAgent(email);
    const fresh = await makeTicket(user.id, TicketStatus.NEW, Priority.HIGH);
    await makeTicket(user.id, TicketStatus.OPEN, Priority.LOW);

    const res = await agent.get("/api/tickets?status=NEW&priority=HIGH").timeout(TIMEOUT);
    expect(res.status).toBe(200);
    expect(res.body.items.map((t: { id: number }) => t.id)).toEqual([fresh.id]);
  });

  it("HARD-07: GET /api/staff/tickets rejects an unknown status, requestedPriority or itPriority with 400 VALIDATION", async () => {
    const email = `l4filter-staff-${Date.now()}@example.com`;
    await createTestUser(email, Role.IT_STAFF);
    const agent = await loginAgent(email);

    for (const [query, field] of [
      ["status=New", "status"],
      ["requestedPriority=urgent", "requestedPriority"],
      ["itPriority=x", "itPriority"],
    ]) {
      const res = await agent.get(`/api/staff/tickets?${query}`).timeout(TIMEOUT);
      expect(res.status, query).toBe(400);
      expect(res.body.code, query).toBe("VALIDATION");
      expect(res.body.fields, query).toHaveProperty(field);
    }
    const ok = await agent.get("/api/staff/tickets?status=NEW&requestedPriority=HIGH&itPriority=HIGH").timeout(TIMEOUT);
    expect(ok.status).toBe(200);
    expect(ok.body.items.every((t: { currentStatus: string }) => t.currentStatus === "NEW")).toBe(true);
  });

  it("HARD-08: a rejected async route handler returns the safe 500 INTERNAL instead of crashing", async () => {
    const probe = express();
    const router = express.Router();
    router.get("/boom", async () => {
      throw new Error("database exploded: secret detail");
    });
    probe.use(router);
    probe.use(errorHandler);

    const res = await request(probe).get("/boom").timeout(TIMEOUT);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Something went wrong.", code: "INTERNAL" });
    expect(JSON.stringify(res.body)).not.toContain("secret");
  });
});
