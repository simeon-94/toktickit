import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActionsTaken, { type ActionItem } from "./ActionsTaken";
import lab4Css from "./lab4.css?raw";

const ME = { id: 2, name: "Priya Nair" };
const STAFF = [
  { id: 2, name: "Priya Nair", role: "IT_STAFF" },
  { id: 3, name: "Tom Walker", role: "IT_STAFF" },
];

function action(overrides: Partial<ActionItem> = {}): ActionItem {
  return {
    id: 1,
    ticketId: 5,
    actionAt: "2026-10-20T08:30:00.000Z",
    description: "Checked VPN gateway logs",
    result: null,
    status: "PLANNED",
    performedById: 2,
    performedByName: "Priya Nair",
    assigneeId: 3,
    assigneeName: "Tom Walker",
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: null,
    version: 1,
    createdAt: "2026-10-20T08:30:00.000Z",
    updatedAt: "2026-10-20T08:30:00.000Z",
    ...overrides,
  };
}

function json(body: unknown, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response);
}

type Handler = (method: string, url: string, body: any) => Promise<Response> | undefined;

// Minimal fake API: GET returns the current list; other calls go to `handler` (or 200 by default).
function mockApi(initial: ActionItem[], handler?: Handler) {
  const items = [...initial];
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    const custom = handler?.(method, url, body);
    if (custom) return custom;
    if (method === "GET") return json({ items });
    return json({});
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, items };
}

function renderStaff() {
  return render(<ActionsTaken ticketId={5} mode="staff" currentUser={ME} staffUsers={STAFF} />);
}

function calls(fetchMock: ReturnType<typeof vi.fn>, method: string, urlPart: string) {
  return fetchMock.mock.calls.filter(([url, init]) => (init?.method ?? "GET") === method && String(url).includes(urlPart));
}

describe("ActionsTaken", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("UI-01: shows a loading state, then the list in the order received with text status badges", async () => {
    mockApi([
      action({ id: 2, description: "Newer action", status: "COMPLETED", result: "Fixed" }),
      action({ id: 1, description: "Older action" }),
    ]);
    renderStaff();
    expect(screen.getByTestId("actions-loading")).toHaveTextContent("Loading actions...");
    expect(screen.getByTestId("actions-loading")).toHaveAttribute("role", "status");

    const rows = await screen.findAllByTestId("action-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Newer action");
    expect(rows[1]).toHaveTextContent("Older action");
    expect(within(rows[0]).getByTestId("action-status")).toHaveTextContent("Completed");
    expect(within(rows[1]).getByTestId("action-status")).toHaveTextContent("Planned");
    expect(screen.getByTestId("actions-panel")).toHaveTextContent("Visible to Requester");
  });

  it("UI-01: shows the empty state", async () => {
    mockApi([]);
    renderStaff();
    expect(await screen.findByTestId("actions-empty")).toHaveTextContent("No actions recorded yet.");
  });

  it("UI-01: shows a safe error with Retry, and Retry reloads the list", async () => {
    let fail = true;
    mockApi([action()], (method) => (method === "GET" && fail ? json({ error: "boom", stack: "secret" }, 500) : undefined));
    renderStaff();
    const error = await screen.findByTestId("actions-error");
    expect(error).toHaveTextContent("Could not load actions.");
    expect(error).not.toHaveTextContent("secret");

    fail = false;
    await userEvent.click(screen.getByTestId("actions-retry"));
    expect(await screen.findAllByTestId("action-row")).toHaveLength(1);
  });

  it("UI-02: the create form defaults to me, toggles the follow-up note and validates inline with aria links", async () => {
    const { fetchMock } = mockApi([]);
    const user = userEvent.setup();
    renderStaff();
    await user.click(await screen.findByTestId("action-add-btn"));

    const form = screen.getByTestId("action-form");
    expect(form).toHaveTextContent("Performed by: Priya Nair");
    expect(screen.getByTestId("action-assignee")).toHaveValue("2");
    expect(screen.queryByTestId("action-followup-note")).not.toBeInTheDocument();

    await user.type(screen.getByTestId("action-description"), "ab");
    await user.click(screen.getByTestId("action-followup-required"));
    expect(screen.getByTestId("action-followup-note")).toBeInTheDocument();
    await user.click(screen.getByTestId("action-submit"));

    const descError = screen.getByTestId("action-error-description");
    expect(descError).toHaveAttribute("role", "alert");
    const description = screen.getByTestId("action-description");
    expect(description).toHaveAttribute("aria-invalid", "true");
    expect(description.getAttribute("aria-describedby")).toContain(descError.id);
    expect(screen.getByTestId("action-error-followUpNote")).toBeInTheDocument();
    expect(calls(fetchMock, "POST", "/actions")).toHaveLength(0);
  });

  it("UI-02: submit is disabled while pending (single request) and a new action appears after success", async () => {
    let release: () => void = () => {};
    const created = action({ id: 9, description: "Replaced the patch cable" });
    const { fetchMock, items } = mockApi([], (method) => {
      if (method !== "POST") return undefined;
      return new Promise<Response>((resolve) => {
        release = () => {
          items.unshift(created);
          resolve({ ok: true, status: 201, json: () => Promise.resolve(created) } as Response);
        };
      });
    });
    const user = userEvent.setup();
    renderStaff();
    await user.click(await screen.findByTestId("action-add-btn"));
    await user.type(screen.getByTestId("action-description"), "Replaced the patch cable");
    await user.click(screen.getByTestId("action-submit"));

    expect(screen.getByTestId("action-submit")).toBeDisabled();
    await user.click(screen.getByTestId("action-submit"));
    expect(calls(fetchMock, "POST", "/actions")).toHaveLength(1);

    const body = JSON.parse(calls(fetchMock, "POST", "/actions")[0][1].body);
    expect(body).toMatchObject({ description: "Replaced the patch cable", assigneeId: 2, followUpRequired: false });
    expect(typeof body.clientRequestId).toBe("string");
    expect(new Date(body.actionAt).toString()).not.toBe("Invalid Date");

    release();
    await waitFor(() => expect(screen.queryByTestId("action-form")).not.toBeInTheDocument());
    expect(await screen.findByText("Replaced the patch cable")).toBeInTheDocument();
    expect(screen.getByTestId("actions-success")).toHaveAttribute("role", "status");
  });

  it("UI-02: keeps typed data after a failure, maps server field errors, and retries with the same clientRequestId", async () => {
    let attempt = 0;
    const { fetchMock } = mockApi([], (method) => {
      if (method !== "POST") return undefined;
      attempt++;
      if (attempt === 1) return json({ error: "Something went wrong.", code: "INTERNAL" }, 500);
      return json({ error: "Please correct the highlighted fields.", code: "VALIDATION", fields: { assigneeId: "Assignee must be active." } }, 400);
    });
    const user = userEvent.setup();
    renderStaff();
    await user.click(await screen.findByTestId("action-add-btn"));
    await user.type(screen.getByTestId("action-description"), "Reset the switch port");
    await user.click(screen.getByTestId("action-submit"));

    expect(await screen.findByTestId("action-form-error")).toHaveTextContent("Could not save the action");
    expect(screen.getByTestId("action-description")).toHaveValue("Reset the switch port");

    await user.click(screen.getByTestId("action-submit"));
    expect(await screen.findByTestId("action-error-assigneeId")).toHaveTextContent("Assignee must be active.");
    expect(screen.getByTestId("action-description")).toHaveValue("Reset the switch port");

    const posts = calls(fetchMock, "POST", "/actions");
    expect(posts).toHaveLength(2);
    expect(JSON.parse(posts[0][1].body).clientRequestId).toBe(JSON.parse(posts[1][1].body).clientRequestId);
  });

  it("UI-03: edit is pre-filled and sends expectedVersion", async () => {
    const { fetchMock } = mockApi([action({ id: 4, version: 3, description: "Old text" })], (method) =>
      method === "PATCH" ? json(action({ id: 4, version: 4, description: "New text" })) : undefined
    );
    const user = userEvent.setup();
    renderStaff();
    await user.click(await screen.findByTestId("action-edit-btn"));
    const description = screen.getByTestId("action-description");
    expect(description).toHaveValue("Old text");
    expect(screen.getByTestId("action-assignee")).toHaveValue("3");
    await user.clear(description);
    await user.type(description, "New text");
    await user.click(screen.getByTestId("action-submit"));

    await waitFor(() => expect(calls(fetchMock, "PATCH", "/actions/4")).toHaveLength(1));
    expect(JSON.parse(calls(fetchMock, "PATCH", "/actions/4")[0][1].body)).toMatchObject({ expectedVersion: 3, description: "New text" });
  });

  it("UI-03: complete requires a result; cancel sends expectedVersion; locked rows have no buttons", async () => {
    const { fetchMock } = mockApi([
      action({ id: 6, version: 2 }),
      action({ id: 7, status: "COMPLETED", result: "Done" }),
      action({ id: 8, status: "CANCELLED" }),
    ]);
    const user = userEvent.setup();
    renderStaff();
    const rows = await screen.findAllByTestId("action-row");

    expect(within(rows[1]).queryByRole("button")).not.toBeInTheDocument();
    expect(within(rows[1]).getByText("Locked")).toBeInTheDocument();
    expect(within(rows[2]).queryByRole("button")).not.toBeInTheDocument();

    await user.click(within(rows[0]).getByTestId("action-complete-btn"));
    await user.click(screen.getByTestId("action-complete-confirm"));
    expect(screen.getByTestId("action-error-result")).toHaveAttribute("role", "alert");
    expect(calls(fetchMock, "POST", "/complete")).toHaveLength(0);

    await user.type(screen.getByTestId("action-result"), "Port reset, link is up");
    await user.click(screen.getByTestId("action-complete-confirm"));
    await waitFor(() => expect(calls(fetchMock, "POST", "/actions/6/complete")).toHaveLength(1));
    expect(JSON.parse(calls(fetchMock, "POST", "/actions/6/complete")[0][1].body)).toEqual({
      expectedVersion: 2,
      result: "Port reset, link is up",
    });

    await user.click(within((await screen.findAllByTestId("action-row"))[0]).getByTestId("action-cancel-btn"));
    await waitFor(() => expect(calls(fetchMock, "POST", "/actions/6/cancel")).toHaveLength(1));
    expect(JSON.parse(calls(fetchMock, "POST", "/actions/6/cancel")[0][1].body)).toEqual({ expectedVersion: 2 });
  });

  it("UI-03: a 409 shows the conflict banner; Reload refetches and keeps the draft", async () => {
    const { fetchMock } = mockApi([action({ id: 4, description: "Old text" })], (method) =>
      method === "PATCH" ? json({ error: "changed", code: "STALE_UPDATE" }, 409) : undefined
    );
    const user = userEvent.setup();
    renderStaff();
    await user.click(await screen.findByTestId("action-edit-btn"));
    await user.clear(screen.getByTestId("action-description"));
    await user.type(screen.getByTestId("action-description"), "My draft text");
    await user.click(screen.getByTestId("action-submit"));

    const banner = await screen.findByTestId("conflict-banner");
    expect(banner).toHaveTextContent("This item was changed by someone else. Reload to see the latest version.");
    const getsBefore = calls(fetchMock, "GET", "/actions").length;
    await user.click(screen.getByTestId("conflict-reload"));
    await waitFor(() => expect(calls(fetchMock, "GET", "/actions").length).toBe(getsBefore + 1));
    expect(screen.getByTestId("action-description")).toHaveValue("My draft text");
  });

  it("UI-03: a 403 shows a forbidden message", async () => {
    mockApi([], (method) => (method === "POST" ? json({ error: "Forbidden", code: "FORBIDDEN" }, 403) : undefined));
    const user = userEvent.setup();
    renderStaff();
    await user.click(await screen.findByTestId("action-add-btn"));
    await user.type(screen.getByTestId("action-description"), "Try to add");
    await user.click(screen.getByTestId("action-submit"));
    expect(await screen.findByTestId("action-form-error")).toHaveTextContent("You do not have permission");
  });

  it("UI-04 (AC-02): the Requester view is read-only", async () => {
    mockApi([action({ id: 1 }), action({ id: 2, status: "COMPLETED", result: "Done" })]);
    render(<ActionsTaken ticketId={5} mode="requester" />);
    const rows = await screen.findAllByTestId("action-row");
    expect(rows).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Actions Taken" })).toBeInTheDocument();
    expect(screen.queryByTestId("action-add-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("action-form")).not.toBeInTheDocument();
    expect(screen.queryByTestId("action-assignee")).not.toBeInTheDocument();
    expect(screen.getByTestId("actions-panel").querySelectorAll("button")).toHaveLength(0);
  });

  it("STYLE-01: badges carry text, times show in Asia/Bangkok, and focus-visible styles exist", async () => {
    mockApi([
      action({ id: 1, status: "PLANNED", actionAt: "2026-10-20T17:30:00.000Z" }),
      action({ id: 2, status: "COMPLETED", result: "ok" }),
      action({ id: 3, status: "CANCELLED", followUpRequired: true, followUpNote: "Call back" }),
    ]);
    renderStaff();
    const badges = await screen.findAllByTestId("action-status");
    expect(badges.map((b) => b.textContent)).toEqual(["Planned", "Completed", "Cancelled"]);
    // 17:30 UTC is 00:30 the next day in Bangkok (UTC+7).
    expect(screen.getAllByTestId("action-row")[0]).toHaveTextContent("21 Oct 2026");
    expect(screen.getAllByTestId("action-row")[2]).toHaveTextContent("Yes: Call back");
    expect(lab4Css).toMatch(/:focus-visible/);
  });
});
