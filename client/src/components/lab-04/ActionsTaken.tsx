import { useEffect, useState, type FormEvent } from "react";
import "./lab4.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// Times are stored in UTC and shown in Asia/Bangkok (UTC+7, no DST) per L4-BR-19.
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const bangkokFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok",
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatBangkok(iso: string) {
  return bangkokFormat.format(new Date(iso));
}

function toBangkokInput(date: Date) {
  return new Date(date.getTime() + BANGKOK_OFFSET_MS).toISOString().slice(0, 16);
}

function fromBangkokInput(value: string) {
  const parsed = new Date(`${value}:00+07:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function newClientRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export type ActionStatus = "PLANNED" | "COMPLETED" | "CANCELLED";

export interface ActionItem {
  id: number;
  ticketId: number;
  actionAt: string;
  description: string;
  result: string | null;
  status: ActionStatus;
  performedById: number;
  performedByName: string;
  assigneeId: number;
  assigneeName: string;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface StaffUser {
  id: number;
  name: string;
  role: string;
}

interface Props {
  ticketId: number;
  mode: "staff" | "requester";
  currentUser?: { id: number; name: string };
  staffUsers?: StaffUser[];
}

const STATUS_BADGE: Record<ActionStatus, { label: string; className: string }> = {
  PLANNED: { label: "Planned", className: "bg-warning text-dark" },
  COMPLETED: { label: "Completed", className: "bg-success" },
  CANCELLED: { label: "Cancelled", className: "bg-secondary" },
};

interface FormState {
  actionAt: string;
  description: string;
  assigneeId: string;
  followUpRequired: boolean;
  followUpNote: string;
  attachmentNotes: string;
}

type Editing = { kind: "create"; clientRequestId: string } | { kind: "edit"; action: ActionItem };
type FieldErrors = Record<string, string>;

const CONFLICT_MESSAGE = "This item was changed by someone else. Reload to see the latest version.";

function validateForm(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  const description = form.description.trim();
  if (description.length < 3 || description.length > 1000) {
    errors.description = "Description is required (3-1000 characters).";
  }
  if (!form.actionAt || !fromBangkokInput(form.actionAt)) errors.actionAt = "Enter a valid date and time.";
  if (form.followUpRequired) {
    const note = form.followUpNote.trim();
    if (note.length < 3 || note.length > 500) errors.followUpNote = "Follow-up note is required (3-500 characters).";
  }
  if (form.attachmentNotes.trim().length > 500) errors.attachmentNotes = "Attachment notes must be at most 500 characters.";
  return errors;
}

// Turns a failed response into a user-safe message; never shows raw server text for 5xx.
async function describeFailure(res: Response, fallback: string) {
  const body = await res.json().catch(() => ({}));
  if (res.status === 403) return { message: "You do not have permission to change Actions Taken.", body };
  if (res.status === 404) return { message: "This Ticket or action no longer exists.", body };
  if (res.status === 409) return { message: CONFLICT_MESSAGE, body, conflict: true };
  if (res.status === 400 || res.status === 422) return { message: body.error || fallback, body };
  return { message: fallback, body };
}

function ActionsTaken({ ticketId, mode, currentUser, staffUsers = [] }: Props) {
  const isStaff = mode === "staff";
  const [loadState, setLoadState] = useState<"loading" | "success" | "error">("loading");
  const [items, setItems] = useState<ActionItem[]>([]);

  const [editing, setEditing] = useState<Editing | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [completingId, setCompletingId] = useState<number | null>(null);
  const [resultText, setResultText] = useState("");
  const [rowError, setRowError] = useState("");
  const [rowBusy, setRowBusy] = useState(false);

  const [conflict, setConflict] = useState(false);
  const [success, setSuccess] = useState("");

  function load() {
    setLoadState("loading");
    fetch(`${API_URL}/api/tickets/${ticketId}/actions`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        if (!Array.isArray(body?.items)) throw new Error("Unexpected response");
        setItems(body.items);
        setLoadState("success");
      })
      .catch(() => setLoadState("error"));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  function openCreate() {
    setEditing({ kind: "create", clientRequestId: newClientRequestId() });
    setForm({
      actionAt: toBangkokInput(new Date()),
      description: "",
      assigneeId: currentUser ? String(currentUser.id) : "",
      followUpRequired: false,
      followUpNote: "",
      attachmentNotes: "",
    });
    resetMessages();
  }

  function openEdit(action: ActionItem) {
    setEditing({ kind: "edit", action });
    setForm({
      actionAt: toBangkokInput(new Date(action.actionAt)),
      description: action.description,
      assigneeId: String(action.assigneeId),
      followUpRequired: action.followUpRequired,
      followUpNote: action.followUpNote ?? "",
      attachmentNotes: action.attachmentNotes ?? "",
    });
    resetMessages();
  }

  function closeForm() {
    setEditing(null);
    setForm(null);
    setFieldErrors({});
    setFormError("");
  }

  function resetMessages() {
    setFieldErrors({});
    setFormError("");
    setSuccess("");
    setConflict(false);
    setCompletingId(null);
    setRowError("");
  }

  function updateForm(patch: Partial<FormState>) {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form || !editing || submitting) return;
    const errors = validateForm(form);
    setFieldErrors(errors);
    setFormError("");
    if (Object.keys(errors).length > 0) return;

    const payload: Record<string, unknown> = {
      actionAt: fromBangkokInput(form.actionAt),
      description: form.description.trim(),
      followUpRequired: form.followUpRequired,
      followUpNote: form.followUpRequired ? form.followUpNote.trim() : null,
      attachmentNotes: form.attachmentNotes.trim() || null,
    };
    if (form.assigneeId) payload.assigneeId = Number(form.assigneeId);

    let url = `${API_URL}/api/tickets/${ticketId}/actions`;
    let method = "POST";
    if (editing.kind === "create") {
      payload.clientRequestId = editing.clientRequestId;
    } else {
      url = `${url}/${editing.action.id}`;
      method = "PATCH";
      payload.expectedVersion = editing.action.version;
    }

    setSubmitting(true);
    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        if (res.ok) {
          closeForm();
          setConflict(false);
          setSuccess(editing.kind === "create" ? "Action added." : "Action updated.");
          load();
          return;
        }
        const failure = await describeFailure(res, "Could not save the action. Your entries are kept; please try again.");
        if (failure.conflict) {
          setConflict(true);
          return;
        }
        if (failure.body?.fields) setFieldErrors(failure.body.fields);
        setFormError(failure.body?.fields ? "Please correct the highlighted fields." : failure.message);
      })
      .catch(() => setFormError("Could not save the action. Your entries are kept; please try again."))
      .finally(() => setSubmitting(false));
  }

  function rowRequest(action: ActionItem, path: "complete" | "cancel", body: Record<string, unknown>, done: string) {
    setRowBusy(true);
    setRowError("");
    fetch(`${API_URL}/api/tickets/${ticketId}/actions/${action.id}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (res.ok) {
          setCompletingId(null);
          setResultText("");
          setSuccess(done);
          load();
          return;
        }
        const failure = await describeFailure(res, "Could not update the action. Please try again.");
        if (failure.conflict) setConflict(true);
        else if (failure.body?.fields?.result) setFieldErrors({ result: failure.body.fields.result });
        else setRowError(failure.message);
      })
      .catch(() => setRowError("Could not update the action. Please try again."))
      .finally(() => setRowBusy(false));
  }

  function handleComplete(action: ActionItem) {
    const result = resultText.trim();
    if (result.length < 1 || result.length > 1000) {
      setFieldErrors({ result: "Result is required to complete an action (1-1000 characters)." });
      return;
    }
    setFieldErrors({});
    rowRequest(action, "complete", { expectedVersion: action.version, result }, "Action completed.");
  }

  function handleCancelAction(action: ActionItem) {
    resetMessages();
    rowRequest(action, "cancel", { expectedVersion: action.version }, "Action cancelled.");
  }

  function reloadAfterConflict() {
    setConflict(false);
    load();
  }

  function fieldProps(field: string) {
    const errorId = `action-${ticketId}-${field}-error`;
    return {
      id: `action-${ticketId}-${field}`,
      "aria-invalid": fieldErrors[field] ? true : undefined,
      "aria-describedby": fieldErrors[field] ? errorId : undefined,
    };
  }

  function fieldError(field: string) {
    if (!fieldErrors[field]) return null;
    return (
      <div id={`action-${ticketId}-${field}-error`} className="text-danger small mt-1" role="alert" data-testid={`action-error-${field}`}>
        {fieldErrors[field]}
      </div>
    );
  }

  return (
    <section className="l4-panel p-3 mb-4" data-testid="actions-panel" aria-labelledby={`actions-heading-${ticketId}`}>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <h3 className="h6 mb-0" id={`actions-heading-${ticketId}`}>
          Actions Taken
        </h3>
        <span className="l4-shared-label">Visible to Requester</span>
        {isStaff && !editing && loadState === "success" && (
          <button type="button" className="btn btn-outline-success btn-sm ms-auto" onClick={openCreate} data-testid="action-add-btn">
            Add action
          </button>
        )}
      </div>

      {conflict && (
        <div className="alert alert-warning d-flex flex-wrap align-items-center gap-2 py-2" role="alert" data-testid="conflict-banner">
          <span>{CONFLICT_MESSAGE}</span>
          <button type="button" className="btn btn-sm btn-outline-dark" onClick={reloadAfterConflict} data-testid="conflict-reload">
            Reload
          </button>
        </div>
      )}

      {success && (
        <div className="alert alert-success d-flex align-items-center justify-content-between gap-2 py-2" role="status" data-testid="actions-success">
          <span>{success}</span>
          <button type="button" className="btn-close" aria-label="Dismiss" onClick={() => setSuccess("")} />
        </div>
      )}

      {isStaff && editing && form && (
        <form className="border rounded p-3 mb-3" onSubmit={handleSubmit} noValidate data-testid="action-form">
          <h4 className="h6">{editing.kind === "create" ? "Add action" : "Edit action"}</h4>
          <p className="small text-muted mb-2">
            Performed by: {editing.kind === "edit" ? editing.action.performedByName : currentUser?.name ?? "you"}
          </p>
          <div className="row g-2">
            <div className="col-12 col-md-4">
              <label className="form-label small" htmlFor={`action-${ticketId}-actionAt`}>
                Action date/time (Bangkok)
              </label>
              <input
                type="datetime-local"
                className="form-control form-control-sm"
                value={form.actionAt}
                onChange={(e) => updateForm({ actionAt: e.target.value })}
                data-testid="action-at"
                {...fieldProps("actionAt")}
              />
              {fieldError("actionAt")}
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label small" htmlFor={`action-${ticketId}-assigneeId`}>
                Assignee
              </label>
              <select
                className="form-select form-select-sm"
                value={form.assigneeId}
                onChange={(e) => updateForm({ assigneeId: e.target.value })}
                data-testid="action-assignee"
                {...fieldProps("assigneeId")}
              >
                {!form.assigneeId && <option value="">Me</option>}
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                    {currentUser && u.id === currentUser.id ? " (me)" : ""}
                  </option>
                ))}
              </select>
              {fieldError("assigneeId")}
            </div>
            <div className="col-12">
              <label className="form-label small" htmlFor={`action-${ticketId}-description`}>
                Description <span aria-hidden="true">*</span>
              </label>
              <textarea
                className="form-control form-control-sm"
                rows={2}
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                required
                data-testid="action-description"
                {...fieldProps("description")}
              />
              {fieldError("description")}
            </div>
            <div className="col-12">
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={form.followUpRequired}
                  onChange={(e) => updateForm({ followUpRequired: e.target.checked })}
                  data-testid="action-followup-required"
                  {...fieldProps("followUpRequired")}
                />
                <label className="form-check-label small" htmlFor={`action-${ticketId}-followUpRequired`}>
                  Follow-up required?
                </label>
              </div>
            </div>
            {form.followUpRequired && (
              <div className="col-12">
                <label className="form-label small" htmlFor={`action-${ticketId}-followUpNote`}>
                  Follow-up note <span aria-hidden="true">*</span>
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={form.followUpNote}
                  onChange={(e) => updateForm({ followUpNote: e.target.value })}
                  required
                  data-testid="action-followup-note"
                  {...fieldProps("followUpNote")}
                />
                {fieldError("followUpNote")}
              </div>
            )}
            <div className="col-12">
              <label className="form-label small" htmlFor={`action-${ticketId}-attachmentNotes`}>
                Attachment notes (optional)
              </label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={form.attachmentNotes}
                onChange={(e) => updateForm({ attachmentNotes: e.target.value })}
                data-testid="action-attachment-notes"
                {...fieldProps("attachmentNotes")}
              />
              {fieldError("attachmentNotes")}
            </div>
          </div>
          {formError && (
            <div className="alert alert-danger py-2 mt-2 mb-0" role="alert" data-testid="action-form-error">
              {formError}
            </div>
          )}
          <div className="d-flex flex-wrap gap-2 mt-3">
            <button type="submit" className="btn btn-success btn-sm" disabled={submitting} data-testid="action-submit">
              {submitting ? "Saving..." : editing.kind === "create" ? "Save action" : "Save changes"}
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={closeForm} disabled={submitting} data-testid="action-cancel-form">
              Close form
            </button>
          </div>
        </form>
      )}

      {loadState === "loading" && (
        <p className="text-muted small mb-0" role="status" data-testid="actions-loading">
          Loading actions...
        </p>
      )}

      {loadState === "error" && (
        <div className="alert alert-danger d-flex flex-wrap align-items-center gap-2 py-2 mb-0" data-testid="actions-error">
          <span>Could not load actions.</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={load} data-testid="actions-retry">
            Retry
          </button>
        </div>
      )}

      {loadState === "success" && items.length === 0 && (
        <p className="text-muted small mb-0" data-testid="actions-empty">
          No actions recorded yet.
        </p>
      )}

      {rowError && (
        <div className="alert alert-danger py-2" role="alert" data-testid="action-row-error">
          {rowError}
        </div>
      )}

      {loadState === "success" && items.length > 0 && (
        <div className="l4-table-wrap">
          <table className="l4-actions-table">
            <thead>
              <tr>
                <th scope="col">Date/time</th>
                <th scope="col">Description</th>
                <th scope="col">Result</th>
                <th scope="col">Performed by</th>
                <th scope="col">Assignee</th>
                <th scope="col">Status</th>
                <th scope="col">Follow-up</th>
                <th scope="col">Attachment notes</th>
                {isStaff && <th scope="col">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((a) => {
                const badge = STATUS_BADGE[a.status];
                const planned = a.status === "PLANNED";
                return (
                  <tr key={a.id} data-testid="action-row">
                    <td data-label="Date/time">{formatBangkok(a.actionAt)}</td>
                    <td data-label="Description" style={{ whiteSpace: "pre-wrap" }}>
                      {a.description}
                    </td>
                    <td data-label="Result">{a.result ?? <span className="text-muted">-</span>}</td>
                    <td data-label="Performed by">{a.performedByName}</td>
                    <td data-label="Assignee">{a.assigneeName}</td>
                    <td data-label="Status">
                      <span className={`badge ${badge.className}`} data-testid="action-status">
                        {badge.label}
                      </span>
                    </td>
                    <td data-label="Follow-up">{a.followUpRequired ? `Yes: ${a.followUpNote ?? ""}` : "No"}</td>
                    <td data-label="Attachment notes">{a.attachmentNotes ?? <span className="text-muted">-</span>}</td>
                    {isStaff && (
                      <td data-label="Actions">
                        {!planned && <span className="l4-locked">Locked</span>}
                        {planned && completingId !== a.id && (
                          <div className="d-flex flex-wrap gap-1">
                            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => openEdit(a)} disabled={rowBusy || !!editing} data-testid="action-edit-btn">
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-success btn-sm"
                              onClick={() => {
                                resetMessages();
                                setCompletingId(a.id);
                                setResultText("");
                              }}
                              disabled={rowBusy}
                              data-testid="action-complete-btn"
                            >
                              Complete
                            </button>
                            <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => handleCancelAction(a)} disabled={rowBusy} data-testid="action-cancel-btn">
                              Cancel action
                            </button>
                          </div>
                        )}
                        {planned && completingId === a.id && (
                          <div>
                            <label className="form-label small" htmlFor={`action-${ticketId}-result`}>
                              Result <span aria-hidden="true">*</span>
                            </label>
                            <textarea
                              className="form-control form-control-sm mb-1"
                              rows={2}
                              value={resultText}
                              onChange={(e) => setResultText(e.target.value)}
                              required
                              data-testid="action-result"
                              {...fieldProps("result")}
                            />
                            {fieldError("result")}
                            <div className="d-flex flex-wrap gap-1 mt-1">
                              <button type="button" className="btn btn-success btn-sm" onClick={() => handleComplete(a)} disabled={rowBusy} data-testid="action-complete-confirm">
                                {rowBusy ? "Saving..." : "Confirm"}
                              </button>
                              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setCompletingId(null)} disabled={rowBusy}>
                                Back
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default ActionsTaken;
