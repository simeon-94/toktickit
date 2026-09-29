import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import TicketDetail from "./TicketDetail";

function renderTicketDetail() {
  return render(<TicketDetail ticketId={1} onBack={() => {}} />);
}

describe("TicketDetail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a removed attachment with its download button disabled", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/comments")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes("/attachments")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                {
                  id: 1,
                  fileName: "old-screenshot.png",
                  sizeBytes: 2048,
                  isRemoved: true,
                  uploadedAt: "2026-08-01T10:00:00.000Z",
                  removedAt: "2026-08-02T10:00:00.000Z",
                },
              ]),
          });
        }
        if (url.includes("/api/tickets/1")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                id: 1,
                ticketNumber: "TKT-2026-000001",
                summary: "Test ticket",
                description: "A description long enough.",
                categoryName: "Hardware",
                relatedSystemName: "Corporate Laptop",
                requestedPriority: "MEDIUM",
                itPriority: null,
                currentStatus: "New",
                createdAt: "2026-08-01T09:00:00.000Z",
                updatedAt: "2026-08-01T09:00:00.000Z",
              }),
          });
        }
        return Promise.reject(new Error("Unknown URL: " + url));
      }) as unknown as typeof fetch
    );

    renderTicketDetail();

    await waitFor(() => {
      expect(screen.getByTestId("attachment-removed-badge")).toBeInTheDocument();
    });

    expect(screen.getByTestId("attachment-download-disabled")).toBeDisabled();
  });
});