import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ChangePassword from "./ChangePassword";
import { AuthProvider } from "../context/AuthContext";

function renderChangePassword() {
  return render(
    <AuthProvider>
      <ChangePassword />
    </AuthProvider>
  );
}

function stubFetch(changePasswordImpl: () => { ok: boolean; json: () => Promise<any> }) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url.includes("/api/auth/me")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 1,
              name: "Jennifer Anderson",
              email: "jennifer.anderson@example.com",
              role: "REQUESTER",
              mustChangePassword: true,
            }),
        });
      }
      if (url.includes("/api/auth/change-password")) {
        return Promise.resolve(changePasswordImpl());
      }
      return Promise.reject(new Error("Unknown URL: " + url));
    }) as unknown as typeof fetch
  );
}

describe("ChangePassword", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the current/new/confirm password fields", async () => {
    stubFetch(() => ({ ok: true, json: () => Promise.resolve({}) }));
    renderChangePassword();

    await waitFor(() => {
      expect(screen.getByTestId("change-password-form")).toBeInTheDocument();
    });
    expect(screen.getByTestId("current-password")).toBeInTheDocument();
    expect(screen.getByTestId("new-password")).toBeInTheDocument();
    expect(screen.getByTestId("confirm-password")).toBeInTheDocument();
  });

  it("rejects a new password shorter than 8 characters without calling the API", async () => {
    const changePasswordSpy = vi.fn(() => ({ ok: true, json: () => Promise.resolve({}) }));
    stubFetch(changePasswordSpy);
    renderChangePassword();

    await waitFor(() => expect(screen.getByTestId("change-password-form")).toBeInTheDocument());

    fireEvent.change(screen.getByTestId("current-password"), { target: { value: "TempPass1!" } });
    fireEvent.change(screen.getByTestId("new-password"), { target: { value: "short1" } });
    fireEvent.change(screen.getByTestId("confirm-password"), { target: { value: "short1" } });
    fireEvent.click(screen.getByTestId("change-password-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("change-password-error")).toBeInTheDocument();
    });
    expect(screen.getByTestId("change-password-error").textContent).toContain("at least 8 characters");
    expect(changePasswordSpy).not.toHaveBeenCalled();
  });

  it("rejects a confirm password that does not match the new password", async () => {
    const changePasswordSpy = vi.fn(() => ({ ok: true, json: () => Promise.resolve({}) }));
    stubFetch(changePasswordSpy);
    renderChangePassword();

    await waitFor(() => expect(screen.getByTestId("change-password-form")).toBeInTheDocument());

    fireEvent.change(screen.getByTestId("current-password"), { target: { value: "TempPass1!" } });
    fireEvent.change(screen.getByTestId("new-password"), { target: { value: "NewPassword1!" } });
    fireEvent.change(screen.getByTestId("confirm-password"), { target: { value: "Different1!" } });
    fireEvent.click(screen.getByTestId("change-password-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("change-password-error")).toBeInTheDocument();
    });
    expect(screen.getByTestId("change-password-error").textContent).toContain("do not match");
    expect(changePasswordSpy).not.toHaveBeenCalled();
  });

  it("AC-04: a valid new password submits successfully and clears any previous error", async () => {
    stubFetch(() => ({ ok: true, json: () => Promise.resolve({}) }));
    renderChangePassword();

    await waitFor(() => expect(screen.getByTestId("change-password-form")).toBeInTheDocument());

    fireEvent.change(screen.getByTestId("current-password"), { target: { value: "TempPass1!" } });
    fireEvent.change(screen.getByTestId("new-password"), { target: { value: "NewPassword1!" } });
    fireEvent.change(screen.getByTestId("confirm-password"), { target: { value: "NewPassword1!" } });
    fireEvent.click(screen.getByTestId("change-password-submit"));

    await waitFor(() => {
      expect(screen.queryByTestId("change-password-error")).not.toBeInTheDocument();
    });
  });

  it("shows the server's error when the current password is wrong", async () => {
    stubFetch(() => ({
      ok: false,
      json: () => Promise.resolve({ error: "Current password is incorrect." }),
    }));
    renderChangePassword();

    await waitFor(() => expect(screen.getByTestId("change-password-form")).toBeInTheDocument());

    fireEvent.change(screen.getByTestId("current-password"), { target: { value: "WrongTemp1!" } });
    fireEvent.change(screen.getByTestId("new-password"), { target: { value: "NewPassword1!" } });
    fireEvent.change(screen.getByTestId("confirm-password"), { target: { value: "NewPassword1!" } });
    fireEvent.click(screen.getByTestId("change-password-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("change-password-error")).toBeInTheDocument();
    });
    expect(screen.getByTestId("change-password-error").textContent).toContain("Current password is incorrect.");
  });
});