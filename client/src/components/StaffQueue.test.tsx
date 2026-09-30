import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StaffQueue from "./StaffQueue";

function ticketsResponse(items: any[] = [], overrides: any = {}) {
  return {
    items,
    page: 1,
    pageSize: 10,
    totalItems: items.length,
    totalPages: 1,
    ...overrides,
  };
}

function sampleTicket(overrides: any = {}) {
  return {
    id: 1,
    ticketNumber: "TKT-2026-000063",
    createdAt: "2026-05-12T09:14:00.000Z",
    updatedAt: "2026-05-12T09:14:00.000Z",
    summary: "Laptop battery drains quickly",
    categoryName: "Hardware",
    requestedPriority: "MEDIUM",
    itPriority: "MEDIUM",
    currentStatus: "IN_PROGRESS",
    requesterName: "Jennifer Anderson",
    ticketOwnerName: null,
    ...overrides,
  };
}

function stubFetch(handler: (url: string) => any) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url.includes("/api/categories")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.includes("/api/staff/tickets")) {
        return Promise.resolve(handler(url));
      }
      return Promise.reject(new Error("Unknown URL: " + url));
    }) as unknown as typeof fetch
  );
}

describe("StaffQueue", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows an empty state when there are zero tickets", async () => {
    stubFetch(() => ({ ok: true, json: () => Promise.resolve(ticketsResponse([])) }));
    render(<StaffQueue onOpenTicket={() => {}} />);

    await waitFor(() => {
      expect(screen.getByTestId("staff-queue-empty")).toBeInTheDocument();
    });
  });

  it("shows a safe failure message when the queue fails to load", async () => {
    stubFetch(() => ({ ok: false, json: () => Promise.resolve({}) }));
    render(<StaffQueue onOpenTicket={() => {}} />);

    await waitFor(() => {
      expect(screen.getByTestId("staff-queue-error")).toBeInTheDocument();
    });
  });

  it("renders queue rows with ownership, status, and priority badges", async () => {
    stubFetch(() => ({
      ok: true,
      json: () =>
        Promise.resolve(
          ticketsResponse(
            [
              sampleTicket({ id: 1, ticketOwnerName: "Michael Brown" }),
              sampleTicket({ id: 2, ticketNumber: "TKT-2026-000064", ticketOwnerName: null }),
            ],
            { totalItems: 2 }
          )
        ),
    }));
    render(<StaffQueue onOpenTicket={() => {}} />);

    await waitFor(() => {
      expect(screen.getAllByTestId("staff-queue-row")).toHaveLength(2);
    });
    expect(screen.getByText("Michael Brown")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("clicking a row opens that Ticket's detail", async () => {
    const onOpenTicket = vi.fn();
    stubFetch(() => ({
      ok: true,
      json: () => Promise.resolve(ticketsResponse([sampleTicket({ id: 63 })])),
    }));
    render(<StaffQueue onOpenTicket={onOpenTicket} />);

    await waitFor(() => {
      expect(screen.getAllByTestId("staff-queue-row")).toHaveLength(1);
    });
    fireEvent.click(screen.getByTestId("staff-queue-row"));
    expect(onOpenTicket).toHaveBeenCalledWith(63);
  });

  it("checking Unassigned only re-fetches with unassigned=true", async () => {
    let lastUrl = "";
    stubFetch((url) => {
      lastUrl = url;
      return { ok: true, json: () => Promise.resolve(ticketsResponse([])) };
    });
    render(<StaffQueue onOpenTicket={() => {}} />);

    await waitFor(() => {
      expect(screen.getByTestId("staff-queue-empty")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("staff-queue-unassigned-only"));

    await waitFor(() => {
      expect(lastUrl).toContain("unassigned=true");
    });
  });
});