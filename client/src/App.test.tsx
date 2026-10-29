import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";

const FAKE_USER = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@example.com",
  role: "REQUESTER",
  mustChangePassword: false,
};

function renderAppSignedIn(extraFetch?: (url: string) => Promise<any> | undefined) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url.includes("/api/auth/me")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(FAKE_USER) });
      }
      if (extraFetch) {
        const result = extraFetch(url);
        if (result) return result;
      }
      return Promise.reject(new Error("Unknown URL: " + url));
    }) as unknown as typeof fetch
  );

  return render(
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

describe("App", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the TokTickIT heading", async () => {
    renderAppSignedIn();
    expect(
      await screen.findByRole("heading", { name: /TokTickIT IT Service Desk/i })
    ).toBeInTheDocument();
  });

  it("shows a loading state, then the system status and category list on success", async () => {
    renderAppSignedIn((url) => {
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
      return undefined;
    });

    fireEvent.click(await screen.findByTestId("nav-check-system")); // CHG-06: Lab 4 lands on the Dashboard
    await screen.findByTestId("check-system-btn");
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

  it("shows a useful error message when the API is unavailable", async () => {
    renderAppSignedIn((url) => {
      if (url.includes("/api/health") || url.includes("/api/categories")) {
        return Promise.resolve({ ok: false });
      }
      return undefined;
    });

    const user = userEvent.setup();
    await user.click(await screen.findByTestId("nav-check-system")); // CHG-06: Lab 4 lands on the Dashboard
    await screen.findByTestId("check-system-btn");
    await user.click(screen.getByTestId("check-system-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("error-state")).toBeInTheDocument();
    });

    expect(screen.getByTestId("error-message")).toHaveTextContent(
      "Unable to connect to TokTickIT API"
    );
  });
});