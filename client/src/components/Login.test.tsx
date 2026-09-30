import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Login from "./Login";
import { AuthProvider } from "../context/AuthContext";

function renderLogin() {
  return render(
    <AuthProvider>
      <Login />
    </AuthProvider>
  );
}

function stubFetch(loginImpl: () => { ok: boolean; status?: number; json: () => Promise<any> }) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url.includes("/api/auth/me")) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
      }
      if (url.includes("/api/auth/login")) {
        return Promise.resolve(loginImpl());
      }
      return Promise.reject(new Error("Unknown URL: " + url));
    }) as unknown as typeof fetch
  );
}

describe("Login", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the login form with email and password fields", async () => {
    stubFetch(() => ({ ok: true, json: () => Promise.resolve({}) }));
    renderLogin();

    await waitFor(() => {
      expect(screen.getByTestId("login-form")).toBeInTheDocument();
    });
    expect(screen.getByTestId("login-email")).toBeInTheDocument();
    expect(screen.getByTestId("login-password")).toBeInTheDocument();
  });

  it("AC-02: shows a generic error message on invalid credentials, without exposing account details", async () => {
    stubFetch(() => ({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: "Invalid email or password." }),
    }));
    renderLogin();

    fireEvent.change(screen.getByTestId("login-email"), { target: { value: "jennifer.anderson@example.com" } });
    fireEvent.change(screen.getByTestId("login-password"), { target: { value: "WrongPassword1!" } });
    fireEvent.click(screen.getByTestId("login-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("login-error")).toBeInTheDocument();
    });
    expect(screen.getByTestId("login-error").textContent).toContain("Invalid email or password.");
    expect(screen.getByTestId("login-error").textContent?.toLowerCase()).not.toContain("account");
  });

  it("shows a busy state on the submit button while the request is in flight", async () => {
    let resolveLogin: (value: any) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/api/auth/me")) {
          return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
        }
        if (url.includes("/api/auth/login")) {
          return new Promise((resolve) => {
            resolveLogin = resolve;
          });
        }
        return Promise.reject(new Error("Unknown URL: " + url));
      }) as unknown as typeof fetch
    );

    renderLogin();
    fireEvent.change(screen.getByTestId("login-email"), { target: { value: "jennifer.anderson@example.com" } });
    fireEvent.change(screen.getByTestId("login-password"), { target: { value: "TestPass123!" } });
    fireEvent.click(screen.getByTestId("login-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("login-submit")).toBeDisabled();
    });
    expect(screen.getByTestId("login-submit").textContent).toContain("Signing in...");

    resolveLogin({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 1,
          name: "Jennifer Anderson",
          email: "jennifer.anderson@example.com",
          role: "REQUESTER",
          mustChangePassword: false,
        }),
    });

    await waitFor(() => {
      expect(screen.getByTestId("login-submit")).not.toBeDisabled();
    });
  });

  it("a successful login clears any previous error", async () => {
    stubFetch(() => ({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 1,
          name: "Jennifer Anderson",
          email: "jennifer.anderson@example.com",
          role: "REQUESTER",
          mustChangePassword: false,
        }),
    }));
    renderLogin();

    fireEvent.change(screen.getByTestId("login-email"), { target: { value: "jennifer.anderson@example.com" } });
    fireEvent.change(screen.getByTestId("login-password"), { target: { value: "TestPass123!" } });
    fireEvent.click(screen.getByTestId("login-submit"));

    await waitFor(() => {
      expect(screen.queryByTestId("login-error")).not.toBeInTheDocument();
    });
  });
});