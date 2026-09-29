import { useEffect, useState, type FormEvent } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

type Status = "loading" | "success" | "error";

function AdminUsers() {
  const [status, setStatus] = useState<Status>("loading");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("REQUESTER");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("REQUESTER");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const [tempPasswordNotice, setTempPasswordNotice] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  function loadUsers() {
    setStatus("loading");
    fetch(`${API_URL}/api/admin/users`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load users");
        return res.json();
      })
      .then((data: AdminUser[]) => {
        setUsers(data);
        setStatus("success");
      })
      .catch((error) => {
        console.error("Loading users failed:", error);
        setStatus("error");
      });
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const selectedUser = users.find((u) => u.id === selectedId) || null;

  function selectUser(user: AdminUser) {
    setSelectedId(user.id);
    setEditName(user.name);
    setEditRole(user.role);
    setEditIsActive(user.isActive);
    setEditError("");
    setTempPasswordNotice("");
  }

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    setCreateError("");

    if (newName.trim().length < 2) {
      setCreateError("Name must be at least 2 characters.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
      setCreateError("Enter a valid email.");
      return;
    }

    setCreating(true);
    fetch(`${API_URL}/api/admin/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: newName.trim(), email: newEmail.trim(), role: newRole }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Unable to create user.");
        }
        const created = await res.json();
        setTempPasswordNotice(`User created. Temporary password: ${created.tempPassword}`);
        setNewName("");
        setNewEmail("");
        setNewRole("REQUESTER");
        loadUsers();
      })
      .catch((error) => setCreateError(error.message))
      .finally(() => setCreating(false));
  }

  function handleSaveEdit(event: FormEvent) {
    event.preventDefault();
    if (!selectedUser) return;
    setEditError("");

    if (editName.trim().length < 2) {
      setEditError("Name must be at least 2 characters.");
      return;
    }

    setSavingEdit(true);
    fetch(`${API_URL}/api/admin/users/${selectedUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: editName.trim(), role: editRole, isActive: editIsActive }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Unable to update user.");
        }
        loadUsers();
      })
      .catch((error) => setEditError(error.message))
      .finally(() => setSavingEdit(false));
  }

  function handleResetPassword() {
    if (!selectedUser) return;
    setResettingPassword(true);
    setTempPasswordNotice("");
    fetch(`${API_URL}/api/admin/users/${selectedUser.id}/reset-password`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Unable to reset password.");
        }
        const data = await res.json();
        setTempPasswordNotice(`Password reset. New temporary password: ${data.tempPassword}`);
        loadUsers();
      })
      .catch((error) => setEditError(error.message))
      .finally(() => setResettingPassword(false));
  }

  return (
    <div data-testid="admin-users">
      <h2 className="h5 mb-3">User Management</h2>

      <div className="row">
        <div className="col-12 col-md-7 mb-4">
          {status === "loading" && <p data-testid="admin-users-loading">Loading users...</p>}
          {status === "error" && (
            <div className="alert alert-danger" data-testid="admin-users-error">
              Unable to load users right now.
            </div>
          )}
          {status === "success" && (
            <table className="table table-sm" data-testid="admin-users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Active</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    data-testid="admin-users-row"
                    onClick={() => selectUser(u)}
                    style={{ cursor: "pointer", backgroundColor: u.id === selectedId ? "#eaf6ef" : undefined }}
                  >
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className="badge bg-secondary">{u.role}</span>
                    </td>
                    <td>
                      {u.isActive ? (
                        <span className="badge bg-success">Active</span>
                      ) : (
                        <span className="badge bg-secondary">Inactive</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="col-12 col-md-5">
          {tempPasswordNotice && (
            <div className="alert alert-info py-2" data-testid="admin-users-temp-password">
              {tempPasswordNotice}
            </div>
          )}

          {selectedUser ? (
            <div className="border rounded p-3 mb-4" data-testid="admin-users-edit-panel">
              <h3 className="h6">Edit {selectedUser.email}</h3>
              <form onSubmit={handleSaveEdit}>
                <div className="mb-2">
                  <label className="form-label small">Name</label>
                  <input
                    className="form-control form-control-sm"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    data-testid="admin-edit-name"
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label small">Role</label>
                  <select
                    className="form-select form-select-sm"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    data-testid="admin-edit-role"
                  >
                    <option value="REQUESTER">REQUESTER</option>
                    <option value="IT_STAFF">IT_STAFF</option>
                    <option value="ADMINISTRATOR">ADMINISTRATOR</option>
                  </select>
                </div>
                <div className="form-check mb-2">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="edit-active"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    data-testid="admin-edit-active"
                  />
                  <label className="form-check-label small" htmlFor="edit-active">
                    Active
                  </label>
                </div>
                {editError && <div className="text-danger small mb-2">{editError}</div>}
                <button
                  type="submit"
                  className="btn btn-success btn-sm me-2"
                  disabled={savingEdit}
                  data-testid="admin-edit-save"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={handleResetPassword}
                  disabled={resettingPassword}
                  data-testid="admin-reset-password"
                >
                  {resettingPassword ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            </div>
          ) : (
            <p className="text-muted small">Select a user on the left to edit them.</p>
          )}

          <div className="border rounded p-3">
            <h3 className="h6">Create New User</h3>
            <form onSubmit={handleCreate}>
              <div className="mb-2">
                <label className="form-label small">Name</label>
                <input
                  className="form-control form-control-sm"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  data-testid="admin-create-name"
                />
              </div>
              <div className="mb-2">
                <label className="form-label small">Email</label>
                <input
                  type="email"
                  className="form-control form-control-sm"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  data-testid="admin-create-email"
                />
              </div>
              <div className="mb-2">
                <label className="form-label small">Role</label>
                <select
                  className="form-select form-select-sm"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  data-testid="admin-create-role"
                >
                  <option value="REQUESTER">REQUESTER</option>
                  <option value="IT_STAFF">IT_STAFF</option>
                  <option value="ADMINISTRATOR">ADMINISTRATOR</option>
                </select>
              </div>
              {createError && <div className="text-danger small mb-2">{createError}</div>}
              <button
                type="submit"
                className="btn btn-success btn-sm"
                disabled={creating}
                data-testid="admin-create-submit"
              >
                {creating ? "Creating..." : "Create User"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminUsers;