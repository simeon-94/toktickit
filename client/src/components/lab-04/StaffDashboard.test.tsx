import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StaffDashboard from "./StaffDashboard";
import App from "../../App";
import { AuthProvider } from "../../context/AuthContext";

const STATUSES = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];

function dashboard(overrides: Record<string, unknown> = {}) {
  return {
    generatedAt: "2026-10-28T10:00:00.000Z",
    counts: {
      unassignedOpen: 3,
      ownedByMeOpen: 2,
      urgentOpen: 1,
      openFollowUps: 4,
      myPlannedActions: 5,
      byStatus: { NEW: 1, OPEN: 2, IN_PROGRESS: 1, WAITING_FOR_REQUESTER: 0, RESOLVED: 6, CLOSED: 7, REOPENED: 0, CANCELLED: 1 },
      byItPriority: { HIGH: 1, MEDIUM: 3, LOW: 2 },
    },
    urgent: [{ id: 11, ticketNumber: "TKT-11", summary: "VPN down", currentStatus: "OPEN", itPriority: "HIGH", ticketOwnerName: null, updatedAt: "2026-10-27T10:00:00.000Z" }],
    recentlyUpdated: [{ id: 12, ticketNumber: "TKT-12", summary: "Printer jam", currentStatus: "IN_PROGRESS", itPriority: "LOW", ticketOwnerName: "Priya Nair", updatedAt: "2026-10-28T09:00:00.000Z" }],
    myActions: [{ id: 21, ticketId: 12, ticketNumber: "TKT-12", description: "Replace drum", actionAt: "2026-10-29T03:00:00.000Z", status: "PLANNED" }],
    followUps: [],
    ...overrides,
  };
}

function json(body: unknown, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response);
}

function stub(handler: (url: string) => Promise<Response>) {
  const fetchMock = vi.fn((url: string) => handler(String(url)));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderDashboard() {
  const onNavigate = vi.fn();
  const onOpenTicket = vi.fn();
  const onGoHome = vi.fn();
  render(<StaffDashboard onNavigate={onNavigate} onOpenTicket={onOpenTicket} onGoHome={onGoHome} />);
  return { onNavigate, onOpenTicket, onGoHome };
}

describe("StaffDashboard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("UI-07: shows a loading state, then cards that are accessible links with their drill-down", async () => {
    stub(() => json(dashboard()));
    const user = userEvent.setup();
    const { onNavigate } = renderDashboard();
    expect(screen.getByTestId("dash-loading")).toHaveAttribute("role", "status");
    expect(screen.getByTestId("dash-loading")).toHaveTextContent("Loading dashboard...");

    const cards: Array<[string, string, unknown]> = [
      ["dash-card-unassigned", "3", { view: "staffQueue", filters: { unassigned: "true", statusGroup: "open" }, label: "Unassigned open" }],
      ["dash-card-owned", "2", { view: "staffQueue", filters: { ownerId: "me", statusGroup: "open" }, label: "Owned by me (open)" }],
      ["dash-card-urgent", "1", { view: "staffQueue", filters: { itPriority: "HIGH", statusGroup: "open" }, label: "Urgent (High IT priority, open)" }],
      ["dash-card-planned-actions", "5", { view: "staffActions", actionView: "myPlanned", label: "My planned actions" }],
      ["dash-card-followups", "4", { view: "staffActions", actionView: "openFollowUps", label: "Open follow-ups" }],
    ];
    for (const [testId, value, target] of cards) {
      const card = await screen.findByTestId(testId);
      expect(card.tagName).toBe("A");
      expect(card).toHaveAttribute("href");
      expect(card).toHaveTextContent(value);
      expect(card).toHaveTextContent("View");
      await user.click(card);
      expect(onNavigate).toHaveBeenLastCalledWith(target);
    }
  });

  it("UI-07: status and IT priority breakdowns use text labels and drill down", async () => {
    stub(() => json(dashboard()));
    const user = userEvent.setup();
    const { onNavigate } = renderDashboard();
    for (const s of STATUSES) expect(await screen.findByTestId(`dash-status-row-${s}`)).toBeInTheDocument();

    const resolved = screen.getByTestId("dash-status-row-RESOLVED");
    expect(resolved).toHaveTextContent("RESOLVED");
    expect(resolved).toHaveTextContent("6");
    await user.click(within(resolved).getByRole("link"));
    expect(onNavigate).toHaveBeenLastCalledWith({ view: "staffQueue", filters: { status: "RESOLVED" }, label: "Status: RESOLVED" });

    const medium = screen.getByTestId("dash-priority-row-MEDIUM");
    expect(medium).toHaveTextContent("Medium");
    expect(medium).toHaveTextContent("3");
    await user.click(within(medium).getByRole("link"));
    expect(onNavigate).toHaveBeenLastCalledWith({
      view: "staffQueue",
      filters: { effectivePriority: "MEDIUM", statusGroup: "open" },
      label: "Priority Medium (open)",
    });
  });

  it("UI-07: list rows open the Ticket Detail", async () => {
    stub(() => json(dashboard()));
    const user = userEvent.setup();
    const { onOpenTicket } = renderDashboard();
    const urgent = await screen.findByTestId("dash-list-urgent");
    await user.click(within(urgent).getByRole("link", { name: /TKT-11/ }));
    expect(onOpenTicket).toHaveBeenLastCalledWith(11);
    await user.click(within(screen.getByTestId("dash-list-recent")).getByRole("link", { name: /TKT-12/ }));
    expect(onOpenTicket).toHaveBeenLastCalledWith(12);
    await user.click(within(screen.getByTestId("dash-list-my-actions")).getByRole("link", { name: /Replace drum/ }));
    expect(onOpenTicket).toHaveBeenLastCalledWith(12);
  });

  it("UI-07: empty state shows zeros and 'Nothing to show'", async () => {
    stub(() =>
      json(
        dashboard({
          counts: {
            unassignedOpen: 0, ownedByMeOpen: 0, urgentOpen: 0, openFollowUps: 0, myPlannedActions: 0,
            byStatus: Object.fromEntries(STATUSES.map((s) => [s, 0])),
            byItPriority: { HIGH: 0, MEDIUM: 0, LOW: 0 },
          },
          urgent: [], recentlyUpdated: [], myActions: [], followUps: [],
        })
      )
    );
    renderDashboard();
    expect(await screen.findByTestId("dash-card-unassigned")).toHaveTextContent("0");
    for (const id of ["dash-list-urgent", "dash-list-recent", "dash-list-my-actions"]) {
      expect(screen.getByTestId(id)).toHaveTextContent("Nothing to show");
    }
  });

  it("UI-07: forbidden shows the access message with a link to the user's own dashboard", async () => {
    stub(() => json({ error: "Forbidden", code: "FORBIDDEN" }, 403));
    const user = userEvent.setup();
    const { onGoHome } = renderDashboard();
    const forbidden = await screen.findByTestId("dash-forbidden");
    expect(forbidden).toHaveTextContent("You do not have access to this page");
    await user.click(within(forbidden).getByRole("link"));
    expect(onGoHome).toHaveBeenCalled();
  });

  it("UI-07: failure shows a safe message and Retry reloads", async () => {
    let fail = true;
    const fetchMock = stub(() => (fail ? json({ error: "db down", stack: "x" }, 500) : json(dashboard())));
    const user = userEvent.setup();
    renderDashboard();
    const error = await screen.findByTestId("dash-error");
    expect(error).toHaveTextContent("Could not load the dashboard.");
    expect(error).not.toHaveTextContent("db down");
    fail = false;
    await user.click(screen.getByTestId("dash-retry"));
    expect(await screen.findByTestId("staff-dashboard")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("UI-07: administrators see a Users card linking to user management; staff do not", async () => {
    stub(() => json(dashboard({ userCounts: { active: 9, inactive: 2, byRole: { REQUESTER: 6, IT_STAFF: 3, ADMINISTRATOR: 2 } } })));
    const user = userEvent.setup();
    const { onNavigate } = renderDashboard();
    const card = await screen.findByTestId("dash-users-card");
    expect(card).toHaveTextContent("9 active");
    expect(card).toHaveTextContent("2 inactive");
    expect(card).toHaveTextContent("IT Staff: 3");
    await user.click(card);
    expect(onNavigate).toHaveBeenLastCalledWith({ view: "adminUsers" });

    vi.unstubAllGlobals();
    stub(() => json(dashboard()));
    renderDashboard();
    await waitFor(() => expect(screen.getAllByTestId("staff-dashboard")).toHaveLength(2));
    expect(screen.getAllByTestId("dash-users-card")).toHaveLength(1);
  });
});

describe("Staff navigation (ui-spec section 1)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderApp(role: "IT_STAFF" | "ADMINISTRATOR") {
    const user = { id: 2, name: "Priya Nair", email: "priya@example.com", role, mustChangePassword: false };
    const fetchMock = stub((url) => {
      if (url.includes("/api/auth/me")) return json(user);
      if (url.includes("/api/staff/dashboard")) return json(dashboard());
      if (url.includes("/api/staff/actions")) {
        return json({ items: [{ id: 21, ticketId: 12, ticketNumber: "TKT-12", description: "Replace drum", actionAt: "2026-10-29T03:00:00.000Z", status: "PLANNED", followUpNote: null, assigneeName: "Priya Nair" }], total: 5, page: 1, pageSize: 10 });
      }
      if (url.includes("/api/staff/tickets")) return json({ items: [], page: 1, pageSize: 10, totalItems: 3, totalPages: 1 });
      if (url.includes("/api/categories")) return json([]);
      return json({}, 404);
    });
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
    return fetchMock;
  }

  it("UI-07: staff land on the Dashboard; the active nav item has aria-current and a non-colour cue", async () => {
    renderApp("IT_STAFF");
    expect(await screen.findByTestId("staff-dashboard")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getAllByRole("button").map((b) => b.textContent)).toEqual(["Dashboard", "Ticket Queue", "Change Password", "Check System"]);
    expect(screen.getByTestId("nav-dashboard")).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("nav-dashboard").className).toContain("l4-nav-active");
    expect(screen.queryByTestId("nav-admin-users")).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId("nav-staff-queue"));
    expect(screen.getByTestId("nav-staff-queue")).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("nav-dashboard")).not.toHaveAttribute("aria-current");
  });

  it("UI-07: administrators also get Users in the nav", async () => {
    renderApp("ADMINISTRATOR");
    await screen.findByTestId("staff-dashboard");
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Dashboard", "Ticket Queue", "Users", "Change Password", "Check System",
    ]);
  });

  it("UI-07 (AC-16): a card drills down to the queue with its filter and shows the list total", async () => {
    const fetchMock = renderApp("IT_STAFF");
    await userEvent.click(await screen.findByTestId("dash-card-unassigned"));
    const chip = await screen.findByTestId("drilldown-filter");
    expect(chip).toHaveTextContent("Unassigned open");
    await waitFor(() => expect(screen.getByTestId("drilldown-total")).toHaveTextContent("3"));
    const queueCall = fetchMock.mock.calls.map(([u]) => String(u)).find((u) => u.includes("/api/staff/tickets"))!;
    expect(queueCall).toContain("unassigned=true");
    expect(queueCall).toContain("statusGroup=open");
    expect(screen.getByTestId("nav-staff-queue")).toHaveAttribute("aria-current", "page");
  });

  it("UI-07 (AC-16): action cards drill down to the actions list with its total", async () => {
    const fetchMock = renderApp("IT_STAFF");
    await userEvent.click(await screen.findByTestId("dash-card-planned-actions"));
    expect(await screen.findByTestId("staff-actions-list")).toHaveTextContent("My planned actions");
    expect(screen.getByTestId("drilldown-total")).toHaveTextContent("5");
    expect(fetchMock.mock.calls.map(([u]) => String(u)).some((u) => u.includes("/api/staff/actions?view=myPlanned"))).toBe(true);
    expect(screen.getAllByTestId("staff-actions-row")).toHaveLength(1);
  });
});
