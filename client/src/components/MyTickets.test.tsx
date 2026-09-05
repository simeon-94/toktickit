import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MyTickets from "./MyTickets";
import { RequesterProvider } from "../context/RequesterContext";

const FAKE_REQUESTER = { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" };

function renderMyTickets() {
  localStorage.setItem("toktickit_selected_requester", JSON.stringify(FAKE_REQUESTER));
  return render(
    <RequesterProvider>
      <MyTickets onCreateTicket={() => {}} />
    </RequesterProvider>
  );
}

function emptyTicketsResponse() {
  return { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 1 };
}

describe("MyTickets", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("shows the empty state with a Create Ticket button when there are zero tickets", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/api/categories")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes("/api/tickets")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(emptyTicketsResponse()) });
        }
        return Promise.reject(new Error("Unknown URL: " + url));
      }) as unknown as typeof fetch
    );

    renderMyTickets();

    await waitFor(() => {
      expect(screen.getByTestId("my-tickets-empty")).toBeInTheDocument();
    });
  });

  it("shows a no-results state (not the empty state) when a search matches nothing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/api/categories")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes("/api/tickets")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(emptyTicketsResponse()) });
        }
        return Promise.reject(new Error("Unknown URL: " + url));
      }) as unknown as typeof fetch
    );

    renderMyTickets();

    fireEvent.change(screen.getByTestId("my-tickets-search"), {
      target: { value: "nothing matches this" },
    });

    await waitFor(
      () => {
        expect(screen.getByTestId("my-tickets-no-results")).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    expect(screen.queryByTestId("my-tickets-empty")).not.toBeInTheDocument();
  });
});