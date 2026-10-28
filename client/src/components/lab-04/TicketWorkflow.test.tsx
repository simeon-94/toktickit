import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TicketWorkflow from "./TicketWorkflow";
import StaffTicketDetail from "../StaffTicketDetail";

function json(body: unknown, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response);
}

function stubFetch(handler: (method: string, url: string, body: any) => Promise<Response>) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) =>
    handler(init?.method ?? "GET", String(url), init?.body ? JSON.parse(init.body as string) : undefined)
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function optionValues() {
  return Array.from((screen.getByTestId("status-select") as HTMLSelectElement).options).map((o) => ({
    value: o.value,
    disabled: o.disabled,
  }));
}

describe("TicketWorkflow", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("UI-05: offers only the current status (disabled) plus the permitted next statuses", () => {
    stubFetch(() => json({}));
    const { rerender } = render(<TicketWorkflow ticketId={7} currentStatus="IN_PROGRESS" version={3} onUpdated={() => {}} onReload={() => {}} />);
    expect(optionValues()).toEqual([
      { value: "IN_PROGRESS", disabled: true },
      { value: "OPEN", disabled: false },
      { value: "WAITING_FOR_REQUESTER", disabled: false },
      { value: "RESOLVED", disabled: false },
      { value: "CANCELLED", disabled: false },
    ]);
    expect(screen.getByTestId("status-submit")).toBeDisabled();

    rerender(<TicketWorkflow ticketId={7} currentStatus="RESOLVED" version={3} onUpdated={() => {}} onReload={() => {}} />);
    expect(optionValues().map((o) => o.value)).toEqual(["RESOLVED", "CLOSED", "REOPENED"]);

    rerender(<TicketWorkflow ticketId={7} currentStatus="CANCELLED" version={3} onUpdated={() => {}} onReload={() => {}} />);
    expect(screen.queryByTestId("status-select")).not.toBeInTheDocument();
    expect(screen.getByTestId("no-further-changes")).toHaveTextContent("No further changes");
  });

  it("UI-05: sends the chosen status with expectedVersion and reports the result", async () => {
    const onUpdated = vi.fn();
    const fetchMock = stubFetch((method) =>
      method === "PATCH" ? json({ id: 7, currentStatus: "WAITING_FOR_REQUESTER", version: 4, requesterIndicatedResolved: false }) : json({})
    );
    const user = userEvent.setup();
    render(<TicketWorkflow ticketId={7} currentStatus="IN_PROGRESS" version={3} onUpdated={onUpdated} onReload={() => {}} />);

    await user.selectOptions(screen.getByTestId("status-select"), "WAITING_FOR_REQUESTER");
    await user.click(screen.getByTestId("status-submit"));

    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith({ currentStatus: "WAITING_FOR_REQUESTER", version: 4, requesterIndicatedResolved: false }));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/tickets/7/status");
    expect(JSON.parse(init!.body as string)).toEqual({ currentStatus: "WAITING_FOR_REQUESTER", expectedVersion: 3 });
    expect(screen.getByTestId("status-success")).toHaveAttribute("role", "status");
  });

  it("UI-05: on Staff Ticket Detail the status badge and version refresh immediately after a change", async () => {
    const ticket = {
      id: 63, ticketNumber: "TKT-2026-000063", summary: "Laptop fan noise", description: "Fan is loud.",
      categoryName: "Hardware", relatedSystemName: "Corporate Laptop", requestedPriority: "LOW", itPriority: null,
      currentStatus: "IN_PROGRESS", requesterName: "Michael Brown", ticketOwnerId: 2, ticketOwnerName: "Priya Nair",
      requesterIndicatedResolved: false, version: 5, createdAt: "2026-10-20T08:00:00Z", updatedAt: "2026-10-20T08:00:00Z",
    };
    const patches: any[] = [];
    stubFetch((method, url, body) => {
      if (method === "PATCH" && url.includes("/status")) {
        patches.push(body);
        return json({ id: 63, currentStatus: body.currentStatus, version: 6, requesterIndicatedResolved: false });
      }
      if (url.includes("/actions")) return json({ items: [] });
      if (url.includes("/attachments") || url.includes("/comments") || url.includes("/notes")) return json([]);
      if (url.includes("/api/staff/users")) return json([{ id: 2, name: "Priya Nair", role: "IT_STAFF" }]);
      if (url.includes("/api/tickets/63")) return json(ticket);
      return json({}, 404);
    });
    const user = userEvent.setup();
    render(<StaffTicketDetail ticketId={63} onBack={() => {}} />);

    expect(await screen.findByTestId("ticket-status-badge")).toHaveTextContent("IN_PROGRESS");
    await user.selectOptions(screen.getByTestId("staff-status-select"), "OPEN");
    await user.click(screen.getByTestId("status-submit"));

    await waitFor(() => expect(screen.getByTestId("ticket-status-badge")).toHaveTextContent("OPEN"));
    expect(patches).toEqual([{ currentStatus: "OPEN", expectedVersion: 5 }]);
    // The next change uses the refreshed version.
    await user.selectOptions(screen.getByTestId("staff-status-select"), "IN_PROGRESS");
    await user.click(screen.getByTestId("status-submit"));
    await waitFor(() => expect(patches).toHaveLength(2));
    expect(patches[1]).toEqual({ currentStatus: "IN_PROGRESS", expectedVersion: 6 });
  });

  it("UI-06: a RESOLUTION_GATE 422 lists the reasons in plain words", async () => {
    stubFetch(() =>
      json({ error: "This Ticket cannot be resolved yet.", code: "RESOLUTION_GATE", reasons: ["NO_OWNER", "NO_COMPLETED_ACTION", "PLANNED_ACTIONS_PENDING"] }, 422)
    );
    const user = userEvent.setup();
    render(<TicketWorkflow ticketId={7} currentStatus="OPEN" version={1} onUpdated={() => {}} onReload={() => {}} />);
    await user.selectOptions(screen.getByTestId("status-select"), "RESOLVED");
    await user.click(screen.getByTestId("status-submit"));

    const reasons = await screen.findByTestId("status-gate-reasons");
    expect(within(reasons).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Assign a Ticket Owner",
      "Complete at least one action",
      "Complete or cancel planned actions",
    ]);
    expect(screen.getByTestId("status-error")).toHaveAttribute("role", "alert");
  });

  it("UI-06: INVALID_TRANSITION shows which status the change is not allowed from", async () => {
    stubFetch(() => json({ error: "x", code: "INVALID_TRANSITION", allowed: ["OPEN", "CANCELLED"] }, 422));
    const user = userEvent.setup();
    render(<TicketWorkflow ticketId={7} currentStatus="NEW" version={1} onUpdated={() => {}} onReload={() => {}} />);
    await user.selectOptions(screen.getByTestId("status-select"), "OPEN");
    await user.click(screen.getByTestId("status-submit"));
    expect(await screen.findByTestId("status-error")).toHaveTextContent("That change is not allowed from NEW");
  });

  it("UI-06: a 409 shows the conflict banner and Reload asks the page to refetch", async () => {
    const onReload = vi.fn();
    stubFetch(() => json({ error: "changed", code: "STALE_UPDATE" }, 409));
    const user = userEvent.setup();
    render(<TicketWorkflow ticketId={7} currentStatus="OPEN" version={1} onUpdated={() => {}} onReload={onReload} />);
    await user.selectOptions(screen.getByTestId("status-select"), "IN_PROGRESS");
    await user.click(screen.getByTestId("status-submit"));

    expect(await screen.findByTestId("conflict-banner")).toHaveTextContent("This item was changed by someone else. Reload to see the latest version.");
    await user.click(screen.getByTestId("conflict-reload"));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it("UI-06: other failures show a safe generic message without server internals", async () => {
    stubFetch(() => json({ error: "TypeError: cannot read x", stack: "at foo.ts:1" }, 500));
    const user = userEvent.setup();
    render(<TicketWorkflow ticketId={7} currentStatus="OPEN" version={1} onUpdated={() => {}} onReload={() => {}} />);
    await user.selectOptions(screen.getByTestId("status-select"), "IN_PROGRESS");
    await user.click(screen.getByTestId("status-submit"));
    const error = await screen.findByTestId("status-error");
    expect(error).toHaveTextContent("Could not change the status. Please try again.");
    expect(error).not.toHaveTextContent("TypeError");
  });
});
