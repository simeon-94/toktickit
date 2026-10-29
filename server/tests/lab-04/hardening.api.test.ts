import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import app from "../../src/app";
import { PrismaClient, Role, Priority, TicketStatus } from "@prisma/client";
import { createTestUser, loginAgent } from "../helpers/testAuth";
import { clientRequestConflictOutcome } from "../../src/utils/actionValidation";

const prisma = new PrismaClient();

async function makeTicket(requesterId: number) {
  const category = await prisma.category.findFirst();
  const relatedSystem = await prisma.relatedSystem.findFirst();
  return prisma.ticket.create({
    data: {
      ticketNumber: `TEST-L4HARD-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      requesterId,
      categoryId: category!.id,
      relatedSystemId: relatedSystem!.id,
      summary: "Hardening test ticket",
      description: "Created directly for hardening.api.test.ts",
      requestedPriority: Priority.LOW,
      currentStatus: TicketStatus.OPEN,
    },
  });
}

describe("Lab 4 — hardening.api (#55)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("HARD-02: a user who must change their password is blocked from the API until they do", async () => {
    const email = `l4hard-mustchange-${Date.now()}@example.com`;
    await createTestUser(email, Role.REQUESTER);
    const agent = await loginAgent(email);
    await prisma.user.update({ where: { email }, data: { mustChangePassword: true } });

    const blocked = await agent.get("/api/tickets");
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe("PASSWORD_CHANGE_REQUIRED");

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.mustChangePassword).toBe(true);

    const changed = await agent.post("/api/auth/change-password").send({ currentPassword: "TestPass123!", newPassword: "TestPass456!" });
    expect(changed.status).toBe(204);
    expect((await agent.get("/api/tickets")).status).toBe(200);
  });

  it("HARD-02: a token issued before deactivation stops working (401)", async () => {
    const email = `l4hard-deactivated-${Date.now()}@example.com`;
    await createTestUser(email, Role.IT_STAFF);
    const agent = await loginAgent(email);
    expect((await agent.get("/api/staff/tickets")).status).toBe(200);

    await prisma.user.update({ where: { email }, data: { isActive: false } });
    expect((await agent.get("/api/staff/tickets")).status).toBe(401);
  });

  it("HARD-03: a clientRequestId conflict maps to the same outcome as the pre-check", () => {
    expect(clientRequestConflictOutcome(7, 7)).toBe("existing");
    expect(clientRequestConflictOutcome(7, 8)).toBe("otherTicket");
    expect(clientRequestConflictOutcome(null, 8)).toBe("unknown");
  });

  it("HARD-03: concurrent reuse of one clientRequestId on two Tickets never returns 500", async () => {
    const requester = await createTestUser("l4hard-req@example.com", Role.REQUESTER);
    await createTestUser("l4hard-staff@example.com", Role.IT_STAFF);
    const agentA = await loginAgent("l4hard-staff@example.com");
    const agentB = await loginAgent("l4hard-staff@example.com");

    for (let round = 0; round < 15; round++) {
      const [t1, t2] = [await makeTicket(requester.id), await makeTicket(requester.id)];
      const clientRequestId = randomUUID();
      const [r1, r2] = await Promise.all([
        agentA.post(`/api/tickets/${t1.id}/actions`).send({ description: "Concurrent create one", clientRequestId }),
        agentB.post(`/api/tickets/${t2.id}/actions`).send({ description: "Concurrent create two", clientRequestId }),
      ]);
      expect([r1.status, r2.status].sort(), `round ${round}`).toEqual([201, 400]);
      const loser = r1.status === 400 ? r1 : r2;
      expect(loser.body.code).toBe("VALIDATION");
      expect(loser.body.fields.clientRequestId).toBeDefined();
      expect(await prisma.actionTaken.count({ where: { clientRequestId } })).toBe(1);
    }
  }, 60_000);

  it("HARD-05: /api/auth/me?optional=1 answers 200 null when logged out; plain /me keeps its 401", async () => {
    const optional = await request(app).get("/api/auth/me?optional=1");
    expect(optional.status).toBe(200);
    expect(optional.body).toBeNull();
    expect((await request(app).get("/api/auth/me")).status).toBe(401);

    const bad = await request(app).get("/api/auth/me?optional=1").set("Cookie", "token=not-a-jwt");
    expect(bad.status).toBe(200);
    expect(bad.body).toBeNull();
  });

  it("HARD-02: the seeded first-login flow still works (forced change, then access)", async () => {
    const email = `l4hard-firstlogin-${Date.now()}@example.com`;
    await prisma.user.create({
      data: { name: "First Login", email, role: Role.REQUESTER, passwordHash: await bcrypt.hash("Initial123!", 10), mustChangePassword: true },
    });
    const agent = request.agent(app);
    const login = await agent.post("/api/auth/login").send({ email, password: "Initial123!" });
    expect(login.status).toBe(200);
    expect(login.body.mustChangePassword).toBe(true);
    expect((await agent.get("/api/dashboard/requester")).status).toBe(403);
    expect((await agent.post("/api/auth/change-password").send({ currentPassword: "Initial123!", newPassword: "Changed456!" })).status).toBe(204);
    expect((await agent.get("/api/dashboard/requester")).status).toBe(200);
  });
});
