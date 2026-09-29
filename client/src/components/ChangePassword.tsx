import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function ChangePassword() {
  const { changePassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to change password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 420 }}>
      <h1 className="h4 mb-2">Change Your Password</h1>
      <p className="text-muted small mb-4">
        This is a first login (or an administrator reset your password). You must set a new password before continuing.
      </p>
      <form onSubmit={handleSubmit} data-testid="change-password-form">
        <div className="mb-3">
          <label className="form-label" htmlFor="current-password">Current Password</label>
          <input
            id="current-password"
            type="password"
            className="form-control"
            data-testid="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="new-password">New Password</label>
          <input
            id="new-password"
            type="password"
            className="form-control"
            data-testid="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="confirm-password">Confirm New Password</label>
          <input
            id="confirm-password"
            type="password"
            className="form-control"
            data-testid="confirm-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        {error && (
          <div className="alert alert-danger" data-testid="change-password-error" role="alert">
            {error}
          </div>
        )}
        <button
          type="submit"
          className="btn btn-success w-100 mb-2"
          data-testid="change-password-submit"
          disabled={submitting}
        >
          {submitting ? "Saving..." : "Save New Password"}
        </button>
        <button type="button" className="btn btn-link w-100" onClick={() => logout()}>
          Cancel and sign out
        </button>
      </form>
    </div>
  );
}