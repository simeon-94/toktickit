import { useEffect, useState, type FormEvent } from "react";
import { GATE_REASON_TEXT, allowedTransitions } from "./ticketTransitions";
import "./lab4.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const CONFLICT_MESSAGE = "This item was changed by someone else. Reload to see the latest version.";

export interface StatusUpdate {
  currentStatus: string;
  version: number;
  requesterIndicatedResolved: boolean;
}

interface Props {
  ticketId: number;
  currentStatus: string;
  version: number;
  onUpdated: (update: StatusUpdate) => void;
  onReload: () => void;
  // Staff Ticket Detail keeps its Lab 3 test id for this select (spec CL-04).
  selectTestId?: string;
}

// Status control for staff (ui-spec section 5): only permitted next statuses are offered and the
// change is sent with expectedVersion. The server still enforces the matrix and the gate.
function TicketWorkflow({ ticketId, currentStatus, version, onUpdated, onReload, selectTestId = "status-select" }: Props) {
  const [target, setTarget] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [gateReasons, setGateReasons] = useState<string[]>([]);
  const [conflict, setConflict] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setTarget(currentStatus);
  }, [currentStatus]);

  const options = allowedTransitions(currentStatus);

  function clearFeedback() {
    setError("");
    setGateReasons([]);
    setConflict(false);
    setSuccess("");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving || target === currentStatus) return;
    clearFeedback();
    setSaving(true);
    fetch(`${API_URL}/api/tickets/${ticketId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ currentStatus: target, expectedVersion: version }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (res.ok) {
          setSuccess(`Status changed to ${body.currentStatus}.`);
          onUpdated({
            currentStatus: body.currentStatus,
            version: body.version,
            requesterIndicatedResolved: body.requesterIndicatedResolved,
          });
          return;
        }
        if (res.status === 409) {
          setConflict(true);
        } else if (res.status === 422 && body.code === "RESOLUTION_GATE") {
          setError("This Ticket cannot be resolved yet:");
          setGateReasons(Array.isArray(body.reasons) ? body.reasons : []);
        } else if (res.status === 422 && body.code === "INVALID_TRANSITION") {
          setError(`That change is not allowed from ${currentStatus}.`);
        } else if (res.status === 403) {
          setError("You do not have permission to change the status.");
        } else {
          setError("Could not change the status. Please try again.");
        }
      })
      .catch(() => setError("Could not change the status. Please try again."))
      .finally(() => setSaving(false));
  }

  if (options.length === 0) {
    return (
      <div>
        <div className="form-label small">Current Status</div>
        <p className="small text-muted mb-0" data-testid="no-further-changes">
          No further changes: {currentStatus} is a final status.
        </p>
      </div>
    );
  }

  const selectId = `status-select-${ticketId}`;
  return (
    <form className="l4-controls" onSubmit={handleSubmit} noValidate>
      <label className="form-label small" htmlFor={selectId}>
        Current Status
      </label>
      <div className="d-flex flex-wrap gap-2">
        <select
          id={selectId}
          className="form-select form-select-sm"
          style={{ flex: "1 1 12rem", minWidth: 0 }}
          value={target}
          onChange={(e) => {
            setTarget(e.target.value);
            clearFeedback();
          }}
          disabled={saving}
          aria-describedby={error ? `status-error-${ticketId}` : undefined}
          data-testid={selectTestId}
        >
          <option value={currentStatus} disabled>
            {currentStatus}
          </option>
          {options.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-success btn-sm" disabled={saving || target === currentStatus} data-testid="status-submit">
          {saving ? "Saving..." : "Update status"}
        </button>
      </div>

      {success && (
        <div className="small text-success mt-1" role="status" data-testid="status-success">
          {success}
        </div>
      )}

      {error && (
        <div id={`status-error-${ticketId}`} className="alert alert-danger py-2 mt-2 mb-0" role="alert" data-testid="status-error">
          {error}
          {gateReasons.length > 0 && (
            <ul className="mb-0 mt-1" data-testid="status-gate-reasons">
              {gateReasons.map((r) => (
                <li key={r}>{GATE_REASON_TEXT[r] ?? r}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {conflict && (
        <div className="alert alert-warning d-flex flex-wrap align-items-center gap-2 py-2 mt-2 mb-0" role="alert" data-testid="conflict-banner">
          <span>{CONFLICT_MESSAGE}</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-dark"
            onClick={() => {
              setConflict(false);
              onReload();
            }}
            data-testid="conflict-reload"
          >
            Reload
          </button>
        </div>
      )}
    </form>
  );
}

export default TicketWorkflow;
