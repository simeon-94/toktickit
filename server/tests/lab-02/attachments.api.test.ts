import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("POST /api/tickets/:id/attachments", () => {
  it("rejects a file type that isn't JPG, PNG, WEBP, or PDF", async () => {
    const ticketRes = await request(app).post("/api/tickets").send({
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      summary: "Ticket for attachment test",
      description: "This is a valid description, long enough to pass validation.",
      requestedPriority: "LOW",
    });

    const ticketId = ticketRes.body.id;

    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .attach("file", Buffer.from("fake binary content"), {
        filename: "malware.exe",
        contentType: "application/x-msdownload",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not allowed/i);
  });
});