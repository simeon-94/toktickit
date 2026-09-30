import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import StaffTicketDetail from "./StaffTicketDetail";

function baseTicket(overrides: any = {}) {
  return {
    id: 63,
    ticketNumber: "TKT-2026-000063",
    summary: "Laptop battery drains quickly",
    description: "Battery drains fast even when idle.",
    categoryName: "Hardware",
    relatedSystemName: "Corporate Laptop",
    requestedPriority: "MEDIUM",
    itPriority: "MEDIUM",
    currentStatus: "IN_PROGRESS",
    requesterName: "Jennifer Anderson",
    ticketOwnerId: null,
    ticketOwnerName: null,
    requesterIndicatedResolved: false,
    createdAt: "2026-05-12T09:14:00.000Z",
    updatedAt: "2026-05-12T09:14:00.000Z",
    ...overrides,
  };
}

function createServer(initialTicket: any) {
  const ticket = { ...initialTicket };
  const comments: any[] = [];
  const notes: any[] = [];
  const attachments: any[] = [];
  const staffUsers = [
    { id: 10, name: "Michael Brown", role: "IT_STAFF" },
    { id: 11, name: "Priya Nair", role: "IT_STAFF" },
  ];

  function respond(body: any, ok = true) {
    return Promise.resolve({ ok, json: () => Promise.resolve(body) });
  }

  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init?: RequestInit) => {
      const method = init?.method || "GET";

      if (url.includes("/attachments")) return respond(attachments);

      if (url.includes("/comments") && method === "GET") return respond(comments);
      if (url.includes("/comments") && method === "POST") {
        const body = JSON.parse(init!.body as string);
        if (!body.content || !body.content.trim()) return respond({ error: "Comment cannot be empty." }, false);
        const comment = { id: comments.length + 1, content: body.content, createdAt: new Date().toISOString(), authorName: "Michael Brown" };
        comments.push(comment);
        return respond(comment);
      }

      if (url.includes("/notes") && method === "GET") return respond(notes);
      if (url.includes("/notes") && method === "POST") {
        const body = JSON.parse(init!.body as string);
        if (!body.content || !body.content.trim()) return respond({ error: "Note cannot be empty." }, false);
        const note = { id: notes.length + 1, content: body.content, createdAt: new Date().toISOString(), authorName: "Michael Brown" };
        notes.push(note);
        return respond(note);
      }

      if (url.includes("/owner") && method === "PATCH") {
        const body = JSON.parse(init!.body as string);
        ticket.ticketOwnerId = body.ticketOwnerId;
        ticket.ticketOwnerName = staffUsers.find((u) => u.id === body.ticketOwnerId)?.name ?? null;
        return respond({ id: ticket.id, ticketOwnerId: ticket.ticketOwnerId, ticketOwnerName: ticket.ticketOwnerName });
      }
      if (url.includes("/priority") && method === "PATCH") {
        const body = JSON.parse(init!.body as string);
        ticket.itPriority = body.itPriority;
        return respond({ id: ticket.id, itPriority: ticket.itPriority });
      }
      if (url.includes("/status") && method === "PATCH") {
        const body = JSON.parse(init!.body as string);
        ticket.currentStatus = body.currentStatus;
        return respond({ id: ticket.id, currentStatus: ticket.currentStatus });
      }

      if (url.includes("/api/staff/users")) return respond(staffUsers);

      if (url.includes(`/api/tickets/${ticket.id}`) && method === "GET") return respond(ticket);

      return Promise.reject(new Error("Unknown request: " + method + " " + url));
    }) as unknown as typeof fetch
  );
}

describe("StaffTicketDetail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("BR-04: Public Comments and Internal Notes render as visually distinct panels", async () => {
    createServer(baseTicket());
    render(<StaffTicketDetail ticketId={63} onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByTestId("staff-ticket-detail")).toBeInTheDocument();
    });
    expect(screen.getByTestId("public-comments-panel")).toBeInTheDocument();
    expect(screen.getByTestId("internal-notes-panel")).toBeInTheDocument();
  });

  it("AC-08: claiming a ticket updates the Ticket Owner select", async () => {
    createServer(baseTicket());
    render(<StaffTicketDetail ticketId={63} onBack={() => {}} />);
    await waitFor(() => expect(screen.getByTestId("staff-ticket-detail")).toBeInTheDocument());

    fireEvent.change(screen.getByTestId("staff-owner-select"), { target: { value: "10" } });

    await waitFor(() => {
      expect((screen.getByTestId("staff-owner-select") as HTMLSelectElement).value).toBe("10");
    });
  });

  it("IT Priority can be changed independently of Requested Priority", async () => {
    createServer(baseTicket());
    render(<StaffTicketDetail ticketId={63} onBack={() => {}} />);
    await waitFor(() => expect(screen.getByTestId("staff-ticket-detail")).toBeInTheDocument());

    fireEvent.change(screen.getByTestId("staff-priority-select"), { target: { value: "HIGH" } });

    await waitFor(() => {
      expect((screen.getByTestId("staff-priority-select") as HTMLSelectElement).value).toBe("HIGH");
    });
    expect(screen.getByText("MEDIUM")).toBeInTheDocument();
  });

  it("a permitted status change updates the Current Status badge", async () => {
    createServer(baseTicket());
    render(<StaffTicketDetail ticketId={63} onBack={() => {}} />);
    await waitFor(() => expect(screen.getByTestId("staff-ticket-detail")).toBeInTheDocument());

    fireEvent.change(screen.getByTestId("staff-status-select"), { target: { value: "RESOLVED" } });

    await waitFor(() => {
      expect((screen.getByTestId("staff-status-select") as HTMLSelectElement).value).toBe("RESOLVED");
    });
  });

  it("posting a Public Comment shows it in the Public Comments panel", async () => {
    createServer(baseTicket());
    render(<StaffTicketDetail ticketId={63} onBack={() => {}} />);
    await waitFor(() => expect(screen.getByTestId("staff-ticket-detail")).toBeInTheDocument());

    fireEvent.change(screen.getByTestId("staff-comment-input"), { target: { value: "We are investigating your device." } });
    fireEvent.click(screen.getByTestId("staff-comment-submit"));

    await waitFor(() => {
      expect(
        within(screen.getByTestId("public-comments-panel")).getAllByText("We are investigating your device.").length
      ).toBeGreaterThanOrEqual(1);
    });
    expect(
      within(screen.getByTestId("internal-notes-panel")).queryAllByText("We are investigating your device.")
    ).toHaveLength(0);
  });

  it("posting an Internal Note appears only in the Internal Notes panel, never in Public Comments", async () => {
    createServer(baseTicket());
    render(<StaffTicketDetail ticketId={63} onBack={() => {}} />);
    await waitFor(() => expect(screen.getByTestId("staff-ticket-detail")).toBeInTheDocument());

    fireEvent.change(screen.getByTestId("staff-note-input"), { target: { value: "Waiting on vendor RMA." } });
    fireEvent.click(screen.getByTestId("staff-note-submit"));

    await waitFor(() => {
      expect(
        within(screen.getByTestId("internal-notes-panel")).getAllByText("Waiting on vendor RMA.").length
      ).toBeGreaterThanOrEqual(1);
    });
    expect(
      within(screen.getByTestId("public-comments-panel")).queryAllByText("Waiting on vendor RMA.")
    ).toHaveLength(0);
  });

  it("shows a safe failure message when the ticket fails to load", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) })) as unknown as typeof fetch
    );
    render(<StaffTicketDetail ticketId={63} onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByTestId("staff-ticket-detail-error")).toBeInTheDocument();
    });
  });
});