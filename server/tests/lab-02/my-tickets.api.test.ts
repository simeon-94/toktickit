import { describe, it, expect, beforeAll } from "vitest";
import { createTestUser, loginAgent } from "../helpers/testAuth";

describe("GET /api/tickets", () => {
  let agent1: Awaited<ReturnType<typeof loginAgent>>;
  let agent2: Awaited<ReturnType<typeof loginAgent>>;

  async function createTicket(
    agent: Awaited<ReturnType<typeof loginAgent>>,
    overrides: Partial<Record<string, unknown>> = {}
  ) {
    const res = await agent.post("/api/tickets").send({
      categoryId: 1,
      relatedSystemId: 1,
      summary: "Default summary for test",
      description: "Default description long enough to pass validation.",
      requestedPriority: "MEDIUM",
      ...overrides,
    });
    return res.body;
  }

  beforeAll(async () => {
    await createTestUser("my-tickets-test-1@example.com");
    await createTestUser("my-tickets-test-2@example.com");
    agent1 = await loginAgent("my-tickets-test-1@example.com");
    agent2 = await loginAgent("my-tickets-test-2@example.com");
  });

  it("never returns another requester's tickets", async () => {
    await createTicket(agent1, { summary: "Belongs to requester 1" });
    await createTicket(agent2, { summary: "Belongs to requester 2" });

    const res = await agent2.get("/api/tickets");

    expect(res.status).toBe(200);
    for (const ticket of res.body.items) {
      expect(ticket.summary).not.toBe("Belongs to requester 1");
    }
  });

  it("combines category and priority filters", async () => {
    await createTicket(agent1, {
      categoryId: 1,
      requestedPriority: "HIGH",
      summary: "Matches both filters",
    });
    await createTicket(agent1, {
      categoryId: 1,
      requestedPriority: "LOW",
      summary: "Matches category only",
    });

    const res = await agent1.get("/api/tickets?category=1&priority=HIGH");

    expect(res.status).toBe(200);
    const summaries = res.body.items.map((t: { summary: string }) => t.summary);
    expect(summaries).toContain("Matches both filters");
    expect(summaries).not.toContain("Matches category only");
  });
});