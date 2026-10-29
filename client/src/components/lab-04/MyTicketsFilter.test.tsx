import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MyTickets from "../MyTickets";

// #69 (CL-07): the My Tickets status filter must send a valid TicketStatus value.
describe("My Tickets status filter (#69)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("HARD-09: choosing 'New' requests status=NEW, keeps the 'New' label and shows the list", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("/api/categories")) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 1 }),
      });
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<MyTickets onCreateTicket={() => {}} onOpenTicket={() => {}} />);
    const select = screen.getByTestId("my-tickets-filter-status") as HTMLSelectElement;
    const option = Array.from(select.options).find((o) => o.textContent === "New");
    expect(option?.value).toBe("NEW");

    fireEvent.change(select, { target: { value: "NEW" } });
    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((call) => call[0]);
      expect(urls.some((u) => u.includes("/api/tickets?") && u.includes("status=NEW"))).toBe(true);
    });
    expect(fetchMock.mock.calls.some((call) => call[0].includes("status=New"))).toBe(false);
    await waitFor(() => expect(screen.getByTestId("my-tickets-no-results")).toBeInTheDocument());
  });
});
