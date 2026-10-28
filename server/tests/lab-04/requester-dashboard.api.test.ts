import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { PrismaClient, Role, Priority, TicketStatus } from "@prisma/client";
import { createTestUser, loginAgent } from "../helpers/testAuth";

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;

async function makeTicket(requesterId: number, currentStatus: TicketStatus, daysAgo: number, summary: string) {
  const category = await prisma.category.findFirst();
  const relatedSystem = await prisma.relatedSystem.findFirst();
  const t = await prisma.ticket.create({
    data: {
      ticketNumber: `TEST-L4RD-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      requesterId,
      categoryId: category!.id,
      relatedSystemId: relatedSystem!.id,
      summary,
      description: "Created directly for requester-dashboard.api.test.ts",
      requestedPriority: Priority.MEDIUM,
      currentStatus,
    },
  });
  const updatedAt = new Date(Date.now() - daysAgo * DAY);
  await prisma.$executeRaw`UPDATE "Ticket" SET "updatedAt" = ${updatedAt} WHERE "id" = ${t.id}`;
  return { ...t, updatedAt };
}

const suffix = Date.now().toString(36);
const emailA = `l4rd-a-${suffix}@example.com`;
const emailB = `l4rd-b-${suffix}@example.com`;
const emailZero = `l4rd-zero-${suffix}@example.com`;
let ids: Record<string, number> = {};

describe("Lab 4 — requester-dashboard.api", () => {
  beforeAll(async () => {
    const a = await createTestUser(emailA, Role.REQUESTER);
    const b = await createTestUser(emailB, Role.REQUESTER);
    await createTestUser(emailZero, Role.REQUESTER);

    // Requester A: 5 open-set tickets (2 waiting), 1 resolved recently, 1 closed recently,
    // 1 resolved 8 days ago (outside the 7-day window), 1 cancelled.
    ids.new = (await makeTicket(a.id, TicketStatus.NEW, 1, "A new")).id;
    ids.open = (await makeTicket(a.id, TicketStatus.OPEN, 0.5, "A open")).id;
    ids.waitOld = (await makeTicket(a.id, TicketStatus.WAITING_FOR_REQUESTER, 6, "A waiting old")).id;
    ids.waitNew = (await makeTicket(a.id, TicketStatus.WAITING_FOR_REQUESTER, 2, "A waiting new")).id;
    ids.reopened = (await makeTicket(a.id, TicketStatus.REOPENED, 3, "A reopened")).id;
    ids.resolved = (await makeTicket(a.id, TicketStatus.RESOLVED, 1.5, "A resolved")).id;
    ids.closed = (await makeTicket(a.id, TicketStatus.CLOSED, 0.1, "A closed")).id;
    ids.resolvedOld = (await makeTicket(a.id, TicketStatus.RESOLVED, 8, "A resolved old")).id;
    ids.cancelled = (await makeTicket(a.id, TicketStatus.CANCELLED, 4, "A cancelled")).id;

    // Requester B's tickets must never appear in A's dashboard.
    await makeTicket(b.id, TicketStatus.OPEN, 0, "B open");
    await makeTicket(b.id, TicketStatus.WAITING_FOR_REQUESTER, 0, "B waiting");
    await makeTicket(b.id, TicketStatus.RESOLVED, 0, "B resolved");
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("API-11 (AC-13): counts and lists are scoped to the authenticated Requester", async () => {
    const agent = await loginAgent(emailA);
    const res = await agent.get("/api/dashboard/requester");
    expect(res.status).toBe(200);
    expect(typeof res.body.generatedAt).toBe("string");
    expect(res.body.counts).toEqual({ openTickets: 5, waitingForRequester: 2, recentlyResolved: 2 });

    expect(res.body.needsAttention.map((t: any) => t.id)).toEqual([ids.waitOld, ids.waitNew]);
    expect(res.body.recentlyUpdated.map((t: any) => t.id)).toEqual([ids.closed, ids.open, ids.new, ids.resolved, ids.waitNew]);
    expect(res.body.recentlyResolved.map((t: any) => t.id)).toEqual([ids.closed, ids.resolved]);

    const item = res.body.needsAttention[0];
    expect(Object.keys(item).sort()).toEqual(["currentStatus", "id", "summary", "ticketNumber", "updatedAt"]);
    const all = [...res.body.needsAttention, ...res.body.recentlyUpdated, ...res.body.recentlyResolved];
    expect(all.every((t: any) => !t.summary.startsWith("B "))).toBe(true);
  });

  it("API-11 (AC-13): a Requester with zero Tickets gets zeros and empty lists", async () => {
    const agent = await loginAgent(emailZero);
    const res = await agent.get("/api/dashboard/requester");
    expect(res.status).toBe(200);
    expect(res.body.counts).toEqual({ openTickets: 0, waitingForRequester: 0, recentlyResolved: 0 });
    expect(res.body.needsAttention).toEqual([]);
    expect(res.body.recentlyUpdated).toEqual([]);
    expect(res.body.recentlyResolved).toEqual([]);
  });

  it("API-12 (AC-13): staff and administrators get 403, anonymous gets 401", async () => {
    await createTestUser(`l4rd-staff-${suffix}@example.com`, Role.IT_STAFF);
    await createTestUser(`l4rd-admin-${suffix}@example.com`, Role.ADMINISTRATOR);
    expect((await (await loginAgent(`l4rd-staff-${suffix}@example.com`)).get("/api/dashboard/requester")).status).toBe(403);
    expect((await (await loginAgent(`l4rd-admin-${suffix}@example.com`)).get("/api/dashboard/requester")).status).toBe(403);
    expect((await request(app).get("/api/dashboard/requester")).status).toBe(401);
  });

  it("API-13 (AC-16): each card count equals the total of its My Tickets drill-down", async () => {
    const agent = await loginAgent(emailA);
    const { counts } = (await agent.get("/api/dashboard/requester")).body;

    const open = await agent.get("/api/tickets").query({ statusGroup: "open" });
    const waiting = await agent.get("/api/tickets").query({ status: "WAITING_FOR_REQUESTER" });
    const resolved = await agent.get("/api/tickets").query({ statusGroup: "resolvedRecent" });
    expect(open.body.totalItems).toBe(counts.openTickets);
    expect(waiting.body.totalItems).toBe(counts.waitingForRequester);
    expect(resolved.body.totalItems).toBe(counts.recentlyResolved);

    expect(resolved.body.items.map((t: any) => t.id).sort()).toEqual([ids.closed, ids.resolved].sort());
  });

  it("API-13: an unknown statusGroup on My Tickets returns 400", async () => {
    const agent = await loginAgent(emailA);
    const res = await agent.get("/api/tickets").query({ statusGroup: "everything" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION");
  });
});
