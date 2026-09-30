import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient, Role } from "@prisma/client";
import { createTestUser, loginAgent } from "../helpers/testAuth";

const prisma = new PrismaClient();

describe("Lab 3 — users-admin.api", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("AC-13: creating a user with a duplicate email is rejected", async () => {
    await createTestUser("admin-superuser1@example.com", Role.ADMINISTRATOR);
    await createTestUser("admin-dup-target@example.com", Role.REQUESTER);
    const agent = await loginAgent("admin-superuser1@example.com");

    const res = await agent.post("/api/admin/users").send({
      name: "Duplicate Attempt",
      email: "admin-dup-target@example.com",
      role: "REQUESTER",
    });

    expect(res.status).toBe(409);
  });

  it("AC-15: resetting a user's password forces mustChangePassword at next login", async () => {
    const admin = await createTestUser("admin-superuser2@example.com", Role.ADMINISTRATOR);
    const target = await createTestUser("admin-reset-target@example.com", Role.REQUESTER);
    const agent = await loginAgent("admin-superuser2@example.com");

    const res = await agent.post(`/api/admin/users/${target.id}/reset-password`).send({});
    expect(res.status).toBe(200);

    const updated = await prisma.user.findUnique({ where: { id: target.id } });
    expect(updated!.mustChangePassword).toBe(true);
    void admin;
  });

  it("AC-14 / BR-14: an Administrator cannot deactivate their own account", async () => {
    const admin = await createTestUser("admin-selfdeactivate@example.com", Role.ADMINISTRATOR);
    await createTestUser("admin-selfdeactivate-other@example.com", Role.ADMINISTRATOR);
    const agent = await loginAgent("admin-selfdeactivate@example.com");

    const res = await agent.patch(`/api/admin/users/${admin.id}`).send({ isActive: false });

    expect(res.status).toBe(409);
    const stillActive = await prisma.user.findUnique({ where: { id: admin.id } });
    expect(stillActive!.isActive).toBe(true);
  });

  it("BR-15: the last active Administrator cannot be deactivated or have their role changed", async () => {
    const lastAdmin = await createTestUser("admin-lastone@example.com", Role.ADMINISTRATOR);
    const otherAdmin = await createTestUser("admin-actingadmin@example.com", Role.ADMINISTRATOR);
    const agent = await loginAgent("admin-actingadmin@example.com");

    const deactivateRes = await agent.patch(`/api/admin/users/${lastAdmin.id}`).send({ isActive: false });
    expect(deactivateRes.status).toBe(200);

    await prisma.user.update({ where: { id: otherAdmin.id }, data: { isActive: false } });
    await prisma.user.update({ where: { id: lastAdmin.id }, data: { isActive: true } });

    // The server's last-admin rule counts every active Administrator in the
    // whole database, not just the ones this test created. Since this test
    // suite shares one database across files, other tests' Administrator
    // fixtures (admin-superuser1, admin-selfdeactivate, authz-admin, etc.)
    // may still be active at this point. Force every Administrator except
    // lastAdmin inactive right before the assertion so lastAdmin is
    // guaranteed to be the sole active Administrator when the check runs.
    await prisma.user.updateMany({
      where: { role: Role.ADMINISTRATOR, NOT: { id: lastAdmin.id } },
      data: { isActive: false },
    });
    const soleAdminAgent = await loginAgent("admin-lastone@example.com");

    const roleChangeRes = await soleAdminAgent.patch(`/api/admin/users/${lastAdmin.id}`).send({ role: "IT_STAFF" });
    expect(roleChangeRes.status).toBe(409);

    const stillAdmin = await prisma.user.findUnique({ where: { id: lastAdmin.id } });
    expect(stillAdmin!.role).toBe(Role.ADMINISTRATOR);
  });

  it("a non-Administrator cannot list, create, or edit users", async () => {
    await createTestUser("admin-notadmin@example.com", Role.REQUESTER);
    const target = await createTestUser("admin-notadmin-target@example.com", Role.REQUESTER);
    const agent = await loginAgent("admin-notadmin@example.com");

    const listRes = await agent.get("/api/admin/users");
    const createRes = await agent.post("/api/admin/users").send({ name: "X", email: "x@example.com", role: "REQUESTER" });
    const editRes = await agent.patch(`/api/admin/users/${target.id}`).send({ name: "Changed" });

    expect(listRes.status).toBe(403);
    expect(createRes.status).toBe(403);
    expect(editRes.status).toBe(403);
  });
});