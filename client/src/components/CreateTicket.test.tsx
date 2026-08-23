import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateTicket from "./CreateTicket";
import { RequesterProvider } from "../context/RequesterContext";

const FAKE_REQUESTER = { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" };

function renderCreateTicket() {
  localStorage.setItem("toktickit_selected_requester", JSON.stringify(FAKE_REQUESTER));
  return render(
    <RequesterProvider>
      <CreateTicket />
    </RequesterProvider>
  );
}

function mockFetchImpl({ createTicketOk = true } = {}) {
  return vi.fn((url: string, options?: RequestInit) => {
    if (url.includes("/api/categories")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ id: 1, name: "Hardware" }]),
      });
    }
    if (url.includes("/api/related-systems")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ id: 1, name: "Corporate Laptop" }]),
      });
    }
    if (url.includes("/api/tickets") && options?.method === "POST") {
      if (!createTicketOk) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      return Promise.resolve({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ id: 10, ticketNumber: "TKT-2026-000010" }),
      });
    }
    return Promise.reject(new Error("Unknown URL: " + url));
  }) as unknown as typeof fetch;
}

describe("CreateTicket", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("shows a field error and does not call the API when summary is empty", async () => {
    const fetchMock = mockFetchImpl();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderCreateTicket();

    await waitFor(() => {
      expect(screen.getByTestId("create-ticket-form")).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByTestId("create-ticket-category"), "1");
    await user.selectOptions(screen.getByTestId("create-ticket-related-system"), "1");
    await user.type(screen.getByTestId("create-ticket-description"), "A description long enough to pass.");

    const callsBeforeSubmit = fetchMock.mock.calls.length;
    await user.click(screen.getByTestId("create-ticket-submit"));

    expect(screen.getByText(/Summary must be between/i)).toBeInTheDocument();
    expect(fetchMock.mock.calls.length).toBe(callsBeforeSubmit);
  });

  it("shows the ticket number on successful submit", async () => {
    vi.stubGlobal("fetch", mockFetchImpl());
    const user = userEvent.setup();

    renderCreateTicket();

    await waitFor(() => {
      expect(screen.getByTestId("create-ticket-form")).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByTestId("create-ticket-category"), "1");
    await user.selectOptions(screen.getByTestId("create-ticket-related-system"), "1");
    await user.type(screen.getByTestId("create-ticket-summary"), "Laptop won't turn on");
    await user.type(screen.getByTestId("create-ticket-description"), "A description long enough to pass validation.");
    await user.click(screen.getByTestId("create-ticket-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("create-ticket-success")).toHaveTextContent("TKT-2026-000010");
    });
  });

  it("shows a safe error message and keeps form values when the API is down", async () => {
    vi.stubGlobal("fetch", mockFetchImpl({ createTicketOk: false }));
    const user = userEvent.setup();

    renderCreateTicket();

    await waitFor(() => {
      expect(screen.getByTestId("create-ticket-form")).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByTestId("create-ticket-category"), "1");
    await user.selectOptions(screen.getByTestId("create-ticket-related-system"), "1");
    await user.type(screen.getByTestId("create-ticket-summary"), "Laptop won't turn on");
    await user.type(screen.getByTestId("create-ticket-description"), "A description long enough to pass validation.");
    await user.click(screen.getByTestId("create-ticket-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("create-ticket-error")).toBeInTheDocument();
    });

    expect(screen.getByTestId("create-ticket-summary")).toHaveValue("Laptop won't turn on");
  });
});