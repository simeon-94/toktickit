import { describe, it, expect, beforeAll } from "vitest";
import { createTestUser, loginAgent } from "../helpers/testAuth";

describe("Attachments", () => {
  let agent: Awaited<ReturnType<typeof loginAgent>>;

  beforeAll(async () => {
    await createTestUser("attachments-test@example.com");
    agent = await loginAgent("attachments-test@example.com");
  });

  async function createTicketWithAttachment() {
    const ticketRes = await agent.post("/api/tickets").send({
      categoryId: 1,
      relatedSystemId: 1,
      summary: "Ticket with attachment for removal test",
      description: "Description long enough to pass validation.",
      requestedPriority: "LOW",
    });
    const ticketId = ticketRes.body.id;

    

    const uploadRes = await agent
      .post(`/api/tickets/${ticketId}/attachments`)
      .attach("file", Buffer.from("fake jpg content"), {
        filename: "photo.jpg",
        contentType: "image/jpeg",
      });

    

    return { ticketId, attachmentId: uploadRes.body.id };
  }

  describe("POST /api/tickets/:id/attachments", () => {
    it("rejects a file type that isn't JPG, PNG, WEBP, or PDF", async () => {
      const ticketRes = await agent.post("/api/tickets").send({
        categoryId: 1,
        relatedSystemId: 1,
        summary: "Ticket for attachment test",
        description: "This is a valid description, long enough to pass validation.",
        requestedPriority: "LOW",
      });

      const ticketId = ticketRes.body.id;

      const res = await agent
        .post(`/api/tickets/${ticketId}/attachments`)
        .attach("file", Buffer.from("fake binary content"), {
          filename: "malware.exe",
          contentType: "application/x-msdownload",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/not allowed/i);
    });
  });

  describe("Attachment removal and download", () => {
    it("soft-removes an attachment and still returns its metadata", async () => {
      const { attachmentId } = await createTicketWithAttachment();

      const res = await agent.delete(`/api/attachments/${attachmentId}`);

      expect(res.status).toBe(200);
      expect(res.body.isRemoved).toBe(true);
      expect(res.body.removedAt).toBeTruthy();
    });

    it("blocks downloading an attachment after it has been removed", async () => {
      const { attachmentId } = await createTicketWithAttachment();

      await agent.delete(`/api/attachments/${attachmentId}`);

      const res = await agent.get(`/api/attachments/${attachmentId}/download`);

      expect(res.status).toBe(404);
    });
  });
});