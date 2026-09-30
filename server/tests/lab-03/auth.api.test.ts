import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createTestUser, loginAgent } from "../helpers/testAuth";

const prisma = new PrismaClient();

describe("Lab 3 — auth.api", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("AC-01: valid active-user login returns authenticated identity and role", async () => {
    await createTestUser("auth-valid@example.com", Role.REQUESTER);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "auth-valid@example.com", password: "TestPass123!" });

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("auth-valid@example.com");
    expect(res.body.role).toBe("REQUESTER");
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("AC-02: wrong password returns a generic error, no account details", async () => {
    await createTestUser("auth-wrongpw@example.com", Role.REQUESTER);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "auth-wrongpw@example.com", password: "NotTheRightPassword1!" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeTruthy();
    expect(JSON.stringify(res.body).toLowerCase()).not.toContain("account");
  });

  it("AC-02: inactive account returns the same generic error as a wrong password", async () => {
    const passwordHash = await bcrypt.hash("TestPass123!", 10);
    await prisma.user.upsert({
      where: { email: "auth-inactive@example.com" },
      update: { passwordHash, isActive: false, role: Role.REQUESTER },
      create: {
        name: "Inactive Test",
        email: "auth-inactive@example.com",
        passwordHash,
        role: Role.REQUESTER,
        isActive: false,
        mustChangePassword: false,
      },
    });

    const wrongPwRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "auth-valid-compare@example.com", password: "wrong" });
    const inactiveRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "auth-inactive@example.com", password: "TestPass123!" });

    expect(inactiveRes.status).toBe(401);
    expect(inactiveRes.body.error).toBe(wrongPwRes.body.error);
  });

  it("AC-05: logout invalidates the session; a later request with the old cookie is rejected", async () => {
    await createTestUser("auth-logout@example.com", Role.REQUESTER);
    const agent = await loginAgent("auth-logout@example.com");

    const meBefore = await agent.get("/api/auth/me");
    expect(meBefore.status).toBe(200);

    const logoutRes = await agent.post("/api/auth/logout");
    expect(logoutRes.status).toBe(204);

    const meAfter = await agent.get("/api/auth/me");
    expect(meAfter.status).toBe(401);
  });

  it("GET /api/auth/me with no cookie at all returns 401", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});