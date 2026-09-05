import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

async function createTicket(requesterId: number, summary: string) {
  const res = await request(app).post("/api/tickets").send({
    requesterId,
    categoryId: 1,
    relatedSystemId: 1,
    summary,
    description: "Description long enough to pass validation.",
    requestedPriority: "MEDIUM",
  });
  return res.body;
}

describe("GET /api/tickets/:id", () => {
  it("does not leak a ticket that belongs to another requester", async () => {
    const ticket = await createTicket(1, "Belongs to requester 1 only");

    const res = await request(app).get(`/api/tickets/${ticket.id}?requesterId=2`);

    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain("Belongs to requester 1 only");
  });

  it("returns the full ticket when the requester owns it", async () => {
    const ticket = await createTicket(1, "Owned ticket detail test");

    const res = await request(app).get(`/api/tickets/${ticket.id}?requesterId=1`);

    expect(res.status).toBe(200);
    expect(res.body.summary).toBe("Owned ticket detail test");
  });
});