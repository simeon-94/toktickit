import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminUsers from "./AdminUsers";

function baseUsers(): any[] {
  return [
    { id: 1, name: "Olivia Grant", email: "olivia.grant@example.com", role: "ADMINISTRATOR", isActive: true, mustChangePassword: false, createdAt: "2026-01-01T00:00:00.000Z" },
    { id: 2, name: "Jennifer Anderson", email: "jennifer.anderson@example.com", role: "REQUESTER", isActive: true, mustChangePassword: false, createdAt: "2026-01-02T00:00:00.000Z" },
  ];
}

function createServer(options: { patchError?: { status: number; error: string } } = {}) {
  let users = baseUsers();

  function respond(body: any, ok = true) {
    return Promise.resolve({ ok, json: () => Promise.resolve(body) });
  }

  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init?: RequestInit) => {
      const method = init?.method || "GET";

      if (url.endsWith("/api/admin/users") && method === "GET") {
        return respond(users);
      }
      if (url.endsWith("/api/admin/users") && method === "POST") {
        const body = JSON.parse(init!.body as string);
        if (users.some((u) => u.email === body.email)) {
          return respond({ error: "A user with this email already exists." }, false);
        }
        const created = {
          id: users.length + 1,
          name: body.name,
          email: body.email,
          role: body.role,
          isActive: true,
          mustChangePassword: true,
          createdAt: new Date().toISOString(),
        };
        users = [...users, created];
        return respond({ ...created, tempPassword: "Xk92jd!1" });
      }

      const patchMatch = url.match(/\/api\/admin\/users\/(\d+)$/);
      if (patchMatch && method === "PATCH") {
        if (options.patchError) {
          return respond({ error: options.patchError.error }, false);
        }
        const id = Number(patchMatch[1]);
        const body = JSON.parse(init!.body as string);
        users = users.map((u) => (u.id === id ? { ...u, ...body } : u));
        return respond(users.find((u) => u.id === id));
      }

      const resetMatch = url.match(/\/api\/admin\/users\/(\d+)\/reset-password$/);
      if (resetMatch && method === "POST") {
        return respond({ id: Number(resetMatch[1]), tempPassword: "NewTemp1!" });
      }

      return Promise.reject(new Error("Unknown request: " + method + " " + url));
    }) as unknown as typeof fetch
  );
}

describe("AdminUsers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the user list with Name, Email, Role, and Status", async () => {
    createServer();
    render(<AdminUsers />);

    await waitFor(() => {
      expect(screen.getAllByTestId("admin-users-row")).toHaveLength(2);
    });
    expect(screen.getByText("olivia.grant@example.com")).toBeInTheDocument();
  });

  it("AC-13: creating a user with a duplicate email shows an inline error", async () => {
    createServer();
    render(<AdminUsers />);
    await waitFor(() => expect(screen.getAllByTestId("admin-users-row")).toHaveLength(2));

    fireEvent.change(screen.getByTestId("admin-create-name"), { target: { value: "Duplicate Attempt" } });
    fireEvent.change(screen.getByTestId("admin-create-email"), { target: { value: "jennifer.anderson@example.com" } });
    fireEvent.click(screen.getByTestId("admin-create-submit"));

    await waitFor(() => {
      expect(screen.getByText("A user with this email already exists.")).toBeInTheDocument();
    });
  });

  it("selecting a user and saving changes updates the list", async () => {
    createServer();
    render(<AdminUsers />);
    await waitFor(() => expect(screen.getAllByTestId("admin-users-row")).toHaveLength(2));

    fireEvent.click(screen.getAllByTestId("admin-users-row")[1]);
    await waitFor(() => expect(screen.getByTestId("admin-users-edit-panel")).toBeInTheDocument());

    fireEvent.change(screen.getByTestId("admin-edit-name"), { target: { value: "Jennifer A. Anderson" } });
    fireEvent.click(screen.getByTestId("admin-edit-save"));

    await waitFor(() => {
      expect(screen.getByText("Jennifer A. Anderson")).toBeInTheDocument();
    });
  });

  it("AC-14: a blocked self-deactivation surfaces the server's error message", async () => {
    createServer({ patchError: { status: 409, error: "You cannot deactivate your own account." } });
    render(<AdminUsers />);
    await waitFor(() => expect(screen.getAllByTestId("admin-users-row")).toHaveLength(2));

    fireEvent.click(screen.getAllByTestId("admin-users-row")[0]);
    await waitFor(() => expect(screen.getByTestId("admin-users-edit-panel")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("admin-edit-active"));
    fireEvent.click(screen.getByTestId("admin-edit-save"));

    await waitFor(() => {
      expect(screen.getByText("You cannot deactivate your own account.")).toBeInTheDocument();
    });
  });

  it("AC-15: resetting a password shows the new temporary password", async () => {
    createServer();
    render(<AdminUsers />);
    await waitFor(() => expect(screen.getAllByTestId("admin-users-row")).toHaveLength(2));

    fireEvent.click(screen.getAllByTestId("admin-users-row")[0]);
    await waitFor(() => expect(screen.getByTestId("admin-users-edit-panel")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("admin-reset-password"));

    await waitFor(() => {
      expect(screen.getByTestId("admin-users-temp-password")).toHaveTextContent("NewTemp1!");
    });
  });

  it("shows a safe failure message when the user list fails to load", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) })) as unknown as typeof fetch
    );
    render(<AdminUsers />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-users-error")).toBeInTheDocument();
    });
  });
});