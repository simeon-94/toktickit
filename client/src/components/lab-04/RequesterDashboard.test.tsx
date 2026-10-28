import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RequesterDashboard from "./RequesterDashboard";
import App from "../../App";
import { AuthProvider } from "../../context/AuthContext";

function item(id: number, currentStatus: string, summary: string) {
  return { id, ticketNumber: `TKT-${id}`, summary, currentStatus, updatedAt: "2026-10-27T10:00:00.000Z" };
}

function dashboard(overrides: Record<string, unknown> = {}) {
  return {
    generatedAt: "2026-10-28T10:00:00.000Z",
    counts: { openTickets: 4, waitingForRequester: 1, recentlyResolved: 2 },
    needsAttention: [item(3, "WAITING_FOR_REQUESTER", "Need your laptop serial")],
    recentlyUpdated: [item(5, "OPEN", "Monitor flickers"), item(3, "WAITING_FOR_REQUESTER", "Need your laptop serial")],
    recentlyResolved: [item(7, "RESOLVED", "Password reset")],
    ...overrides,
  };
}

function json(body: unknown, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response);
}

function stub(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => handler(String(url), init));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderDashboard() {
  const onNavigate = vi.fn();
  const onOpenTicket = vi.fn();
  const onGoHome = vi.fn();
  render(<RequesterDashboard onNavigate={onNavigate} onOpenTicket={onOpenTicket} onGoHome={onGoHome} />);
  return { onNavigate, onOpenTicket, onGoHome };
}

describe("RequesterDashboard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("UI-08: loading, then three cards that link to My Tickets with the matching filter", async () => {
    stub(() => json(dashboard()));
    const user = userEvent.setup();
    const { onNavigate } = renderDashboard();
    expect(screen.getByTestId("req-dash-loading")).toHaveAttribute("role", "status");

    const cards: Array<[string, string, unknown]> = [
      ["req-card-open", "4", { view: "myTickets", filters: { statusGroup: "open" }, label: "Open tickets" }],
      ["req-card-waiting", "1", { view: "myTickets", filters: { status: "WAITING_FOR_REQUESTER" }, label: "Waiting for you" }],
      ["req-card-resolved", "2", { view: "myTickets", filters: { statusGroup: "resolvedRecent" }, label: "Recently resolved (7 days)" }],
    ];
    for (const [testId, value, target] of cards) {
      const card = await screen.findByTestId(testId);
      expect(card.tagName).toBe("A");
      expect(card).toHaveTextContent(value);
      await user.click(card);
      expect(onNavigate).toHaveBeenLastCalledWith(target);
    }
  });

  it("UI-08: lists link to Ticket Detail and there is a View all tickets link (no full table)", async () => {
    stub(() => json(dashboard()));
    const user = userEvent.setup();
    const { onNavigate, onOpenTicket } = renderDashboard();
    const attention = await screen.findByTestId("req-list-attention");
    await user.click(within(attention).getByRole("link", { name: /TKT-3/ }));
    expect(onOpenTicket).toHaveBeenLastCalledWith(3);
    expect(within(screen.getByTestId("req-list-recent")).getAllByRole("link")).toHaveLength(2);
    await user.click(within(screen.getByTestId("req-list-resolved")).getByRole("link", { name: /TKT-7/ }));
    expect(onOpenTicket).toHaveBeenLastCalledWith(7);

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "View all tickets" }));
    expect(onNavigate).toHaveBeenLastCalledWith({ view: "myTickets" });
  });

  it("UI-08: a Requester with no tickets sees zeros, 'No tickets yet' and a Create a ticket button", async () => {
    stub(() =>
      json(dashboard({ counts: { openTickets: 0, waitingForRequester: 0, recentlyResolved: 0 }, needsAttention: [], recentlyUpdated: [], recentlyResolved: [] }))
    );
    const user = userEvent.setup();
    const { onNavigate } = renderDashboard();
    expect(await screen.findByTestId("req-card-open")).toHaveTextContent("0");
    expect(screen.getByTestId("req-dashboard")).toHaveTextContent("No tickets yet");
    await user.click(screen.getByRole("button", { name: "Create a ticket" }));
    expect(onNavigate).toHaveBeenLastCalledWith({ view: "createTicket" });
  });

  it("UI-08: forbidden and failure states", async () => {
    stub(() => json({ error: "Forbidden" }, 403));
    renderDashboard();
    expect(await screen.findByTestId("req-dash-forbidden")).toHaveTextContent("You do not have access to this page");
    vi.unstubAllGlobals();

    let fail = true;
    stub(() => (fail ? json({ error: "boom" }, 500) : json(dashboard())));
    const user = userEvent.setup();
    renderDashboard();
    expect(await screen.findByTestId("req-dash-error")).toHaveTextContent("Could not load the dashboard.");
    fail = false;
    await user.click(screen.getByTestId("req-dash-retry"));
    expect(await screen.findByTestId("req-dashboard")).toBeInTheDocument();
  });
});

describe("Requester navigation (ui-spec section 1)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderApp() {
    const me = { id: 1, name: "Jennifer Anderson", email: "jennifer@example.com", role: "REQUESTER", mustChangePassword: false };
    return stub((url, init) => {
      if (url.includes("/api/auth/me")) return json(me);
      if (url.includes("/api/auth/change-password") && init?.method === "POST") return json({ ok: true });
      if (url.includes("/api/dashboard/requester")) return json(dashboard());
      if (url.includes("/api/tickets")) return json({ items: [], page: 1, pageSize: 10, totalItems: 4, totalPages: 1 });
      if (url.includes("/api/categories")) return json([]);
      return json({}, 404);
    });
  }

  it("UI-08: Requesters land on the Dashboard with Dashboard, My Tickets, Create Ticket, Change Password in the nav", async () => {
    renderApp();
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
    expect(await screen.findByTestId("req-dashboard")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Dashboard", "My Tickets", "Create Ticket", "Change Password", "Check System",
    ]);
    expect(screen.getByTestId("nav-dashboard")).toHaveAttribute("aria-current", "page");
  });

  it("UI-08 (AC-16): the Open tickets card opens My Tickets filtered by statusGroup=open with its total", async () => {
    const fetchMock = renderApp();
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
    await userEvent.click(await screen.findByTestId("req-card-open"));
    expect(await screen.findByTestId("drilldown-filter")).toHaveTextContent("Open tickets");
    await waitFor(() => expect(screen.getByTestId("drilldown-total")).toHaveTextContent("4"));
    const listCall = fetchMock.mock.calls.map(([u]) => String(u)).find((u) => u.includes("/api/tickets?"))!;
    expect(listCall).toContain("statusGroup=open");
    expect(screen.getByTestId("nav-my-tickets")).toHaveAttribute("aria-current", "page");

    await userEvent.click(screen.getByTestId("drilldown-clear"));
    expect(screen.queryByTestId("drilldown-filter")).not.toBeInTheDocument();
  });

  it("ui-spec section 1: Change Password is reachable from the nav and confirms success", async () => {
    const fetchMock = renderApp();
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
    const user = userEvent.setup();
    await user.click(await screen.findByTestId("nav-change-password"));
    const form = screen.getByTestId("change-password-form");
    expect(screen.getByTestId("nav-change-password")).toHaveAttribute("aria-current", "page");
    expect(screen.queryByText(/This is a first login/)).not.toBeInTheDocument();

    await user.type(within(form).getByTestId("current-password"), "OldPass123!");
    await user.type(within(form).getByTestId("new-password"), "NewPass456!");
    await user.type(within(form).getByTestId("confirm-password"), "NewPass456!");
    await user.click(within(form).getByTestId("change-password-submit"));

    expect(await screen.findByTestId("change-password-success")).toHaveTextContent("Your password has been changed.");
    expect(fetchMock.mock.calls.some(([u, i]) => String(u).includes("/api/auth/change-password") && i?.method === "POST")).toBe(true);
  });
});
