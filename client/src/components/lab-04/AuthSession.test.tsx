import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthProvider, useAuth } from "../../context/AuthContext";

function Probe() {
  const { user, loading } = useAuth();
  if (loading) return <p>loading</p>;
  return <p data-testid="probe">{user ? `user:${user.name}` : "logged-out"}</p>;
}

describe("AuthProvider start-up session check (HARD-05)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("asks /api/auth/me?optional=1 and treats a 200 null as logged out (no 401 in the console)", async () => {
    const fetchMock = vi.fn((_url: string) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(null) } as Response));
    vi.stubGlobal("fetch", fetchMock);
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    expect(await screen.findByTestId("probe")).toHaveTextContent("logged-out");
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/auth/me?optional=1");
  });

  it("restores a signed-in user from the same call", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ id: 1, name: "Riley", email: "r@example.com", role: "REQUESTER", mustChangePassword: false }),
        } as Response)
      )
    );
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    expect(await screen.findByTestId("probe")).toHaveTextContent("user:Riley");
  });
});
