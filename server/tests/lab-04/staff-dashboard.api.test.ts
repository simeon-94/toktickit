import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient, Role, Priority, TicketStatus, ActionStatus } from "@prisma/client";
import { createTestUser, loginAgent } from "../helpers/testAuth";

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;
const OPEN_SET = `('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED')`;
const STATUSES = Object.values(TicketStatus);
const PRIORITIES = Object.values(Priority);

const suffix = Date.now().toString(36);
const staffEmail = `l4sd-staff-${suffix}@example.com`;
const freshEmail = `l4sd-fresh-${suffix}@example.com`;
const adminEmail = `l4sd-admin-${suffix}@example.com`;
const reqEmail = `l4sd-req-${suffix}@example.com`;
let staffId: number;
let requesterId: number;
let oldTicketId: number;

async function makeTicket(overrides: {
  currentStatus: TicketStatus;
  requestedPriority?: Priority;
  itPriority?: Priority | null;
  ticketOwnerId?: number | null;
  daysAgo?: number;
}) {
  const category = await prisma.category.findFirst();
  const relatedSystem = await prisma.relatedSystem.findFirst();
  const t = await prisma.ticket.create({
    data: {
      ticketNumber: `TEST-L4SD-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      requesterId,
      categoryId: category!.id,
      relatedSystemId: relatedSystem!.id,
      summary: "Staff dashboard test ticket",
      description: "Created directly for staff-dashboard.api.test.ts",
      requestedPriority: overrides.requestedPriority ?? Priority.MEDIUM,
      itPriority: overrides.itPriority ?? null,
      currentStatus: overrides.currentStatus,
      ticketOwnerId: overrides.ticketOwnerId ?? null,
    },
  });
  if (overrides.daysAgo !== undefined) {
    const updatedAt = new Date(Date.now() - overrides.daysAgo * DAY);
    await prisma.$executeRaw`UPDATE "Ticket" SET "updatedAt" = ${updatedAt} WHERE "id" = ${t.id}`;
  }
  return t;
}

async function addAction(ticketId: number, status: ActionStatus, assigneeId: number, followUpRequired = false) {
  return prisma.actionTaken.create({
    data: {
      ticketId,
      actionAt: new Date(),
      description: `Dashboard ${status} action`,
      result: status === ActionStatus.COMPLETED ? "Done" : null,
      status,
      performedById: assigneeId,
      assigneeId,
      followUpRequired,
      followUpNote: followUpRequired ? "Check again next week" : null,
    },
  });
}

async function sqlCount(query: string, ...params: unknown[]) {
  const rows = await prisma.$queryRawUnsafe<{ n: number }[]>(`SELECT COUNT(*)::int AS n FROM ${query}`, ...params);
  return rows[0].n;
}

describe("Lab 4 — staff-dashboard.api", () => {
  beforeAll(async () => {
    staffId = (await createTestUser(staffEmail, Role.IT_STAFF)).id;
    requesterId = (await createTestUser(reqEmail, Role.REQUESTER)).id;
    await createTestUser(freshEmail, Role.IT_STAFF);
    await createTestUser(adminEmail, Role.ADMINISTRATOR);

    // Owned and unassigned open tickets, including null itPriority ones (counted by requestedPriority).
    const owned = await makeTicket({ currentStatus: TicketStatus.IN_PROGRESS, ticketOwnerId: staffId, itPriority: Priority.HIGH });
    await makeTicket({ currentStatus: TicketStatus.OPEN, ticketOwnerId: staffId, itPriority: null, requestedPriority: Priority.HIGH });
    await makeTicket({ currentStatus: TicketStatus.NEW, itPriority: null, requestedPriority: Priority.LOW });
    await makeTicket({ currentStatus: TicketStatus.REOPENED, itPriority: Priority.LOW, requestedPriority: Priority.HIGH });
    const closed = await makeTicket({ currentStatus: TicketStatus.CLOSED, ticketOwnerId: staffId, itPriority: Priority.HIGH });
    oldTicketId = (await makeTicket({ currentStatus: TicketStatus.OPEN, daysAgo: 9 })).id;

    await addAction(owned.id, ActionStatus.PLANNED, staffId);
    await addAction(owned.id, ActionStatus.PLANNED, staffId);
    await addAction(owned.id, ActionStatus.COMPLETED, staffId, true);
    await addAction(closed.id, ActionStatus.PLANNED, staffId); // terminal Ticket: not counted
    await addAction(closed.id, ActionStatus.COMPLETED, staffId, true); // not an open-set Ticket: not counted
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("API-14 (AC-14): every metric equals a direct SQL count (null itPriority counted as requestedPriority)", async () => {
    const agent = await loginAgent(staffEmail);
    const res = await agent.get("/api/staff/dashboard");
    expect(res.status).toBe(200);
    const c = res.body.counts;

    expect(c.unassignedOpen).toBe(await sqlCount(`"Ticket" WHERE "currentStatus"::text IN ${OPEN_SET} AND "ticketOwnerId" IS NULL`));
    expect(c.ownedByMeOpen).toBe(await sqlCount(`"Ticket" WHERE "currentStatus"::text IN ${OPEN_SET} AND "ticketOwnerId" = $1`, staffId));
    expect(c.ownedByMeOpen).toBe(2);
    expect(c.urgentOpen).toBe(await sqlCount(`"Ticket" WHERE "currentStatus"::text IN ${OPEN_SET} AND "itPriority" = 'HIGH'`));
    expect(c.openFollowUps).toBe(
      await sqlCount(
        `"ActionTaken" a JOIN "Ticket" t ON t."id" = a."ticketId" WHERE a."status" = 'COMPLETED' AND a."followUpRequired" AND t."currentStatus"::text IN ${OPEN_SET}`
      )
    );
    expect(c.myPlannedActions).toBe(
      await sqlCount(
        `"ActionTaken" a JOIN "Ticket" t ON t."id" = a."ticketId" WHERE a."status" = 'PLANNED' AND a."assigneeId" = $1 AND t."currentStatus"::text NOT IN ('CLOSED','CANCELLED')`,
        staffId
      )
    );
    expect(c.myPlannedActions).toBe(2);

    expect(Object.keys(c.byStatus).sort()).toEqual([...STATUSES].sort());
    for (const s of STATUSES) {
      expect(c.byStatus[s], s).toBe(await sqlCount(`"Ticket" WHERE "currentStatus"::text = $1`, s));
    }
    expect(Object.keys(c.byItPriority).sort()).toEqual([...PRIORITIES].sort());
    for (const p of PRIORITIES) {
      expect(c.byItPriority[p], p).toBe(
        await sqlCount(`"Ticket" WHERE "currentStatus"::text IN ${OPEN_SET} AND COALESCE("itPriority", "requestedPriority")::text = $1`, p)
      );
    }
    const nullItPriorityOpen = await sqlCount(`"Ticket" WHERE "currentStatus"::text IN ${OPEN_SET} AND "itPriority" IS NULL`);
    expect(nullItPriorityOpen).toBeGreaterThan(0);
  });

  it("API-14 (AC-14): lists follow the specified filters, order and cap of 5", async () => {
    const agent = await loginAgent(staffEmail);
    const body = (await agent.get("/api/staff/dashboard")).body;

    expect(body.urgent.length).toBeLessThanOrEqual(5);
    const urgentTimes = body.urgent.map((t: any) => new Date(t.updatedAt).getTime());
    expect(urgentTimes).toEqual([...urgentTimes].sort((a, b) => a - b));
    expect(body.urgent.every((t: any) => t.itPriority === "HIGH")).toBe(true);
    expect(Object.keys(body.urgent[0]).sort()).toEqual(
      ["currentStatus", "id", "itPriority", "summary", "ticketNumber", "ticketOwnerName", "updatedAt"].sort()
    );

    expect(body.myActions).toHaveLength(2);
    expect(body.myActions.every((a: any) => a.status === "PLANNED")).toBe(true);
    expect(Object.keys(body.myActions[0]).sort()).toEqual(["actionAt", "description", "id", "status", "ticketId", "ticketNumber"].sort());

    expect(body.followUps.length).toBeGreaterThan(0);
    expect(body.followUps.length).toBeLessThanOrEqual(5);
  });

  it("API-15 (AC-14): zero state for a new staff member and the 7-day recent window", async () => {
    const agent = await loginAgent(freshEmail);
    const body = (await agent.get("/api/staff/dashboard")).body;
    expect(body.counts.ownedByMeOpen).toBe(0);
    expect(body.counts.myPlannedActions).toBe(0);
    expect(body.myActions).toEqual([]);

    const cutoff = Date.now() - 7 * DAY;
    expect(body.recentlyUpdated.length).toBeLessThanOrEqual(5);
    expect(body.recentlyUpdated.every((t: any) => new Date(t.updatedAt).getTime() >= cutoff)).toBe(true);
    expect(body.recentlyUpdated.some((t: any) => t.id === oldTicketId)).toBe(false);
    const times = body.recentlyUpdated.map((t: any) => new Date(t.updatedAt).getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it("API-16 (AC-15): administrators get userCounts, staff do not, Requesters get 403", async () => {
    const admin = (await (await loginAgent(adminEmail)).get("/api/staff/dashboard")).body;
    expect(admin.userCounts).toEqual({
      active: await sqlCount(`"User" WHERE "isActive"`),
      inactive: await sqlCount(`"User" WHERE NOT "isActive"`),
      byRole: {
        REQUESTER: await sqlCount(`"User" WHERE "role" = 'REQUESTER'`),
        IT_STAFF: await sqlCount(`"User" WHERE "role" = 'IT_STAFF'`),
        ADMINISTRATOR: await sqlCount(`"User" WHERE "role" = 'ADMINISTRATOR'`),
      },
    });

    const staff = (await (await loginAgent(staffEmail)).get("/api/staff/dashboard")).body;
    expect(staff).not.toHaveProperty("userCounts");

    const reqRes = await (await loginAgent(reqEmail)).get("/api/staff/dashboard");
    expect(reqRes.status).toBe(403);
  });

  it("API-17 (AC-16): each card count equals its drill-down total (queue and actions lists)", async () => {
    const agent = await loginAgent(staffEmail);
    const { counts } = (await agent.get("/api/staff/dashboard")).body;
    const total = async (query: Record<string, string>) => {
      const res = await agent.get("/api/staff/tickets").query(query);
      expect(res.status).toBe(200);
      return res.body.totalItems;
    };

    expect(await total({ unassigned: "true", statusGroup: "open" })).toBe(counts.unassignedOpen);
    expect(await total({ ownerId: "me", statusGroup: "open" })).toBe(counts.ownedByMeOpen);
    expect(await total({ itPriority: "HIGH", statusGroup: "open" })).toBe(counts.urgentOpen);
    for (const p of PRIORITIES) expect(await total({ effectivePriority: p, statusGroup: "open" }), p).toBe(counts.byItPriority[p]);
    for (const s of STATUSES) expect(await total({ status: s }), s).toBe(counts.byStatus[s]);

    const planned = await agent.get("/api/staff/actions").query({ view: "myPlanned" });
    expect(planned.status).toBe(200);
    expect(planned.body.total).toBe(counts.myPlannedActions);
    const followUps = await agent.get("/api/staff/actions").query({ view: "openFollowUps" });
    expect(followUps.body.total).toBe(counts.openFollowUps);
  });

  it("API-17: the Lab 3 itPriority filter stays exact; new filters validate their values", async () => {
    const agent = await loginAgent(staffEmail);
    const exact = await agent.get("/api/staff/tickets").query({ itPriority: "HIGH", statusGroup: "open", pageSize: "100" });
    expect(exact.body.items.every((t: any) => t.itPriority === "HIGH")).toBe(true);

    expect((await agent.get("/api/staff/tickets").query({ statusGroup: "nope" })).status).toBe(400);
    expect((await agent.get("/api/staff/tickets").query({ effectivePriority: "URGENT" })).status).toBe(400);
    expect((await agent.get("/api/staff/actions").query({ view: "nope" })).status).toBe(400);
    expect((await (await loginAgent(reqEmail)).get("/api/staff/actions").query({ view: "myPlanned" })).status).toBe(403);
  });

  it("PERF-01 (AC-14): both dashboards respond in under 500 ms on seeded data", async () => {
    const staff = await loginAgent(staffEmail);
    const requester = await loginAgent(reqEmail);
    await staff.get("/api/staff/dashboard"); // warm-up (first query compiles plans)

    let start = performance.now();
    expect((await staff.get("/api/staff/dashboard")).status).toBe(200);
    const staffMs = performance.now() - start;

    start = performance.now();
    expect((await requester.get("/api/dashboard/requester")).status).toBe(200);
    const requesterMs = performance.now() - start;

    console.log(`PERF-01 staff dashboard ${staffMs.toFixed(1)} ms, requester dashboard ${requesterMs.toFixed(1)} ms`);
    expect(staffMs).toBeLessThan(500);
    expect(requesterMs).toBeLessThan(500);
  });
});
