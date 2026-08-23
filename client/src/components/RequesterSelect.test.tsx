import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import RequesterSelect from "./RequesterSelect";
import { RequesterProvider } from "../context/RequesterContext";

function mockFetchSuccess(requesters: any[]) {
  return vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(requesters),
    })
  ) as unknown as typeof fetch;
}

describe("RequesterSelect", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("only shows active requesters in the dropdown", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchSuccess([
        { id: 1, name: "Jennifer Anderson", email: "jennifer@example.com" },
        { id: 2, name: "Michael Brown", email: "michael@example.com" },
      ])
    );

    render(
      <RequesterProvider>
        <RequesterSelect />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("requester-dropdown")).toBeInTheDocument();
    });

    expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
    expect(screen.getByText("Michael Brown")).toBeInTheDocument();
    expect(screen.queryByText("Alex Turner")).not.toBeInTheDocument();
  });

  it("shows an empty state when there are no active requesters", async () => {
    vi.stubGlobal("fetch", mockFetchSuccess([]));

    render(
      <RequesterProvider>
        <RequesterSelect />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("requester-empty")).toBeInTheDocument();
    });
  });
});