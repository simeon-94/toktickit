import { describe, it, expect, beforeAll } from "vitest";
import { createTestUser, loginAgent } from "../helpers/testAuth";

describe("GET /api/tickets/:id", () => {
  let agent1: Awaited<ReturnType<typeof loginAgent>>;
  let agent2: Awaited<ReturnType<typeof loginAgent>>;

  async function createTicket(
    agent: Awaited<ReturnType<typeof loginAgent>>,
    summary: string
  ) {
    const res = await agent.post("/api/tickets").send({
      categoryId: 1,
      relatedSystemId: 1,
      summary,
      description: "Description long enough to pass validation.",
      requestedPriority: "MEDIUM",
    });
    return res.body;
  }

  beforeAll(async () => {
    await createTestUser("ticket-detail-test-1@example.com");
    await createTestUser("ticket-detail-test-2@example.com");
    agent1 = await loginAgent("ticket-detail-test-1@example.com");
    agent2 = await loginAgent("ticket-detail-test-2@example.com");
  });

  it("does not leak a ticket that belongs to another requester", async () => {
    const ticket = await createTicket(agent1, "Belongs to requester 1 only");

    const res = await agent2.get(`/api/tickets/${ticket.id}`);

    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain("Belongs to requester 1 only");
  });

  it("returns the full ticket when the requester owns it", async () => {
    const ticket = await createTicket(agent1, "Owned ticket detail test");

    const res = await agent1.get(`/api/tickets/${ticket.id}`);

    expect(res.status).toBe(200);
    expect(res.body.summary).toBe("Owned ticket detail test");
  });
});