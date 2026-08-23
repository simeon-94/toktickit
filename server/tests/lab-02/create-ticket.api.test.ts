import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("POST /api/tickets", () => {
  it("creates a ticket with valid data and returns the generated ticket number", async () => {
    const res = await request(app).post("/api/tickets").send({
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      summary: "Test ticket from automated test",
      description: "This is a valid description, long enough to pass validation.",
      requestedPriority: "MEDIUM",
    });

    expect(res.status).toBe(201);
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(res.body.currentStatus).toBe("New");
  });

  it("rejects a ticket with an empty summary", async () => {
    const res = await request(app).post("/api/tickets").send({
      requesterId: 1,
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