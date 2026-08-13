import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

function mockFetchSuccess() {
  return vi.fn((url: string) => {
    if (url.includes("/api/health")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: "ok", service: "TokTickIT API" }),
      });
    }
    if (url.includes("/api/categories")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve([
            { id: 1, name: "Account and Access" },
            { id: 2, name: "Hardware" },
            { id: 3, name: "Software" },
            { id: 4, name: "Network" },
          ]),
      });
    }
    return Promise.reject(new Error("Unknown URL"));
  }) as unknown as typeof fetch;
}

function mockFetchFailure() {
  return vi.fn(() => Promise.resolve({ ok: false })) as unknown as typeof fetch;
}

describe("App", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // UI-01: TokTickIT heading renders
  it("renders the TokTickIT heading", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /TokTickIT IT Service Desk/i })
    ).toBeInTheDocument();
  });

  // UI-02: Loading state changes to category list
  it("shows a loading state, then the system status and category list on success", async () => {
    vi.stubGlobal("fetch", mockFetchSuccess());

    render(<App />);
    fireEvent.click(screen.getByTestId("check-system-btn"));

    expect(screen.getByTestId("loading-state")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("system-status")).toHaveTextContent("Online");
    });

    expect(screen.getByTestId("category-list")).toHaveTextContent("Account and Access");
    expect(screen.getByTestId("category-list")).toHaveTextContent("Hardware");
    expect(screen.getByTestId("category-list")).toHaveTextContent("Software");
    expect(screen.getByTestId("category-list")).toHaveTextContent("Network");
  });

  // UI-03: API failure displays a useful error message
  it("shows a useful error message when the API is unavailable", async () => {
    vi.stubGlobal("fetch", mockFetchFailure());
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByTestId("check-system-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("error-state")).toBeInTheDocument();
    });

    expect(screen.getByTestId("error-message")).toHaveTextContent(
      "Unable to connect to TokTickIT API"
    );
  });
});