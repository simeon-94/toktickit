import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StaffQueue from "../StaffQueue";
import MyTickets from "../MyTickets";

function json(body: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);
}

const ticket = {
  id: 42, ticketNumber: "TKT-42", summary: "Keyboard test", categoryName: "Hardware", relatedSystemName: "VPN",
  requestedPriority: "LOW", itPriority: null, currentStatus: "OPEN", requesterName: "Riley", ticketOwnerName: null,
  createdAt: "2026-10-20T08:00:00Z", updatedAt: "2026-10-20T08:00:00Z", version: 1,
};

describe("A11Y-02 (#55): list rows open with the keyboard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Ticket Queue rows are focusable and open on Enter", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string) => (String(url).includes("/api/categories") ? json([]) : json({ items: [ticket], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }))));
    const onOpenTicket = vi.fn();
    render(<StaffQueue onOpenTicket={onOpenTicket} />);
    const row = await screen.findByTestId("staff-queue-row");
    expect(row).toHaveAttribute("tabindex", "0");
    row.focus();
    await userEvent.keyboard("{Enter}");
    expect(onOpenTicket).toHaveBeenCalledWith(42);
  });

  it("My Tickets rows and cards are focusable and open on Enter or Space", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string) => (String(url).includes("/api/categories") ? json([]) : json({ items: [ticket], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }))));
    const onOpenTicket = vi.fn();
    render(<MyTickets onCreateTicket={() => {}} onOpenTicket={onOpenTicket} />);
    const row = await screen.findByTestId("my-tickets-row");
    expect(row).toHaveAttribute("tabindex", "0");
    row.focus();
    await userEvent.keyboard("{Enter}");
    const card = screen.getByTestId("my-tickets-card");
    expect(card).toHaveAttribute("tabindex", "0");
    card.focus();
    await userEvent.keyboard(" ");
    expect(onOpenTicket).toHaveBeenCalledTimes(2);
  });
});
