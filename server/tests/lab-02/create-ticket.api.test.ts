import { describe, it, expect, beforeAll } from "vitest";
import { createTestUser, loginAgent } from "../helpers/testAuth";

describe("POST /api/tickets", () => {
  let agent: Awaited<ReturnType<typeof loginAgent>>;

  beforeAll(async () => {
    await createTestUser("create-ticket-test@example.com");
    agent = await loginAgent("create-ticket-test@example.com");
  });

  it("creates a ticket with valid data and returns the generated ticket number", async () => {
    const res = await agent.post("/api/tickets").send({
      categoryId: 1,
      relatedSystemId: 1,
      summary: "Test ticket from automated test",
      description: "This is a valid description, long enough to pass validation.",
      requestedPriority: "MEDIUM",
    });

    expect(res.status).toBe(201);
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(res.body.currentStatus).toBe("NEW");
  });

  it("rejects a ticket with an empty summary", async () => {
    const res = await agent.post("/api/tickets").send({
      categoryId: 1,
      relatedSystemId: 1,
      summary: "",
      description: "This is a valid description, long enough to pass validation.",
      requestedPriority: "MEDIUM",
    });

    expect(res.status).toBe(400);
    expect(res.body.errors.summary).toBeDefined();
  });
});