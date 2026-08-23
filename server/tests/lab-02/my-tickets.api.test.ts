import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

async function createTicket(overrides: Partial<Record<string, unknown>> = {}) {
  const res = await request(app)
    .post("/api/tickets")
    .send({
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      summary: "Default summary for test",
      description: "Default description long enough to pass validation.",
      requestedPriority: "MEDIUM",
      ...overrides,
    });
  return res.body;
}

describe("GET /api/tickets", () => {
  it("never returns another requester's tickets", async () => {
    await createTicket({ requesterId: 1, summary: "Belongs to requester 1" });
    await createTicket({ requesterId: 2, summary: "Belongs to requester 2" });

    const res = await request(app).get("/api/tickets?requesterId=2");

    expect(res.status).toBe(200);
    for (const ticket of res.body.items) {
      expect(ticket.summary).not.toBe("Belongs to requester 1");
    }
  });

  it("combines category and priority filters", async () => {
    await createTicket({
      requesterId: 1,
      categoryId: 1,
      requestedPriority: "HIGH",
      summary: "Matches both filters",
    });
    await createTicket({
      requesterId: 1,
      categoryId: 1,
      requestedPriority: "LOW",
      summary: "Matches category only",
    });

    const res = await request(app).get(
      "/api/tickets?requesterId=1&category=1&priority=HIGH"
    );

    expect(res.status).toBe(200);
    const summaries = res.body.items.map((t: { summary: string }) => t.summary);
    expect(summaries).toContain("Matches both filters");
    expect(summaries).not.toContain("Matches category only");
  });
});