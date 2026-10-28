import { useEffect, useState, type FormEvent } from "react";
import ActionsTaken from "./lab-04/ActionsTaken";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const STATUS_OPTIONS = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
];

interface TicketDetailData {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  categoryName: string;
  relatedSystemName: string;
  requestedPriority: string;
  itPriority: string | null;
  currentStatus: string;
  requesterName: string;
  ticketOwnerId: number | null;
  ticketOwnerName: string | null;
  requesterIndicatedResolved: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AttachmentItem {
  id: number;
  fileName: string;
  sizeBytes: number;
  isRemoved: boolean;
  uploadedAt: string;
  removedAt: string | null;
}

interface CommentItem {
  id: number;
  content: string;
  createdAt: string;
  authorName: string;
}

interface NoteItem {
  id: number;
  content: string;
  createdAt: string;
  authorName: string;
}

interface StaffUser {
  id: number;
  name: string;
  role: string;
}

type LoadStatus = "loading" | "success" | "error";

interface Props {
  ticketId: number;
  onBack: () => void;
  currentUser?: { id: number; name: string };
}

function StaffTicketDetail({ ticketId, onBack, currentUser }: Props) {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);

  const [savingOwner, setSavingOwner] = useState(false);
  const [savingPriority, setSavingPriority] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [actionError, setActionError] = useState("");

  const [newComment, setNewComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const [newNote, setNewNote] = useState("");
  const [noteError, setNoteError] = useState("");
  const [postingNote, setPostingNote] = useState(false);

  function loadAll() {
    setStatus("loading");
    Promise.all([
      fetch(`${API_URL}/api/tickets/${ticketId}`, { credentials: "include" }),
      fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, { credentials: "include" }),
      fetch(`${API_URL}/api/tickets/${ticketId}/comments`, { credentials: "include" }),
      fetch(`${API_URL}/api/tickets/${ticketId}/notes`, { credentials: "include" }),
      fetch(`${API_URL}/api/staff/users`, { credentials: "include" }),
    ])
      .then(async ([ticketRes, attachmentsRes, commentsRes, notesRes, usersRes]) => {
        if (!ticketRes.ok || !attachmentsRes.ok || !commentsRes.ok || !notesRes.ok || !usersRes.ok) {
          throw new Error("Failed to load ticket");
        }
        setTicket(await ticketRes.json());
        setAttachments(await attachmentsRes.json());
        setComments(await commentsRes.json());
        setNotes(await notesRes.json());
        setStaffUsers(await usersRes.json());
        setStatus("success");
      })
      .catch((error) => {
        console.error("Loading staff ticket detail failed:", error);
        setStatus("error");
      });
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  function handleOwnerChange(value: string) {
    setActionError("");
    setSavingOwner(true);
    const ticketOwnerId = value === "" ? null : Number(value);
    fetch(`${API_URL}/api/tickets/${ticketId}/owner`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ticketOwnerId }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Unable to update owner.");
        }
        loadAll();
      })
      .catch((error) => setActionError(error.message))
      .finally(() => setSavingOwner(false));
  }

  function handlePriorityChange(value: string) {
    setActionError("");
    setSavingPriority(true);
    fetch(`${API_URL}/api/tickets/${ticketId}/priority`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ itPriority: value }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Unable to update IT priority.");
        }
        loadAll();
      })
      .catch((error) => setActionError(error.message))
      .finally(() => setSavingPriority(false));
  }

  function handleStatusChange(value: string) {
    setActionError("");
    setSavingStatus(true);
    fetch(`${API_URL}/api/tickets/${ticketId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ currentStatus: value }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Unable to update status.");
        }
        loadAll();
      })
      .catch((error) => setActionError(error.message))
      .finally(() => setSavingStatus(false));
  }

  function handlePostComment(event: FormEvent) {
    event.preventDefault();
    const content = newComment.trim();
    setCommentError("");
    if (content.length < 1) {
      setCommentError("Comment cannot be empty.");
      return;
    }
    setPostingComment(true);
    fetch(`${API_URL}/api/tickets/${ticketId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Unable to post comment.");
        }
        const comment: CommentItem = await res.json();
        setComments((prev) => [...prev, comment]);
        setNewComment("");
      })
      .catch((error) => setCommentError(error.message))
      .finally(() => setPostingComment(false));
  }

  function handlePostNote(event: FormEvent) {
    event.preventDefault();
    const content = newNote.trim();
    setNoteError("");
    if (content.length < 1) {
      setNoteError("Note cannot be empty.");
      return;
    }
    setPostingNote(true);
    fetch(`${API_URL}/api/tickets/${ticketId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Unable to post note.");
        }
        const note: NoteItem = await res.json();
        setNotes((prev) => [...prev, note]);
        setNewNote("");
      })
      .catch((error) => setNoteError(error.message))
      .finally(() => setPostingNote(false));
  }

  if (status === "loading") {
    return <p data-testid="staff-ticket-detail-loading">Loading ticket...</p>;
  }

  if (status === "error" || !ticket) {
    return (
      <div className="alert alert-danger" data-testid="staff-ticket-detail-error">
        Unable to load this ticket right now.
        <button className="btn btn-link btn-sm" onClick={onBack}>
          Back to Ticket Queue
        </button>
      </div>
    );
  }

  return (
    <div data-testid="staff-ticket-detail">
      <button className="btn btn-link btn-sm px-0 mb-3" onClick={onBack}>
        &larr; Back to Ticket Queue
      </button>

      <h2 className="h5">
        {ticket.ticketNumber} — <span className="badge bg-success">{ticket.currentStatus}</span>
        {ticket.requesterIndicatedResolved && (
          <span className="badge bg-info ms-2">Requester marked resolved</span>
        )}
      </h2>

      <div className="row g-3 mb-3">
        <div className="col-6 col-md-3">
          <div className="small text-muted">Requester</div>
          <div>{ticket.requesterName}</div>
        </div>
        <div className="col-6 col-md-3">
          <div className="small text-muted">Category</div>
          <div>{ticket.categoryName}</div>
        </div>
        <div className="col-6 col-md-3">
          <div className="small text-muted">Related System</div>
          <div>{ticket.relatedSystemName}</div>
        </div>
        <div className="col-6 col-md-3">
          <div className="small text-muted">Requested Priority</div>
          <div>
            <span className="badge bg-secondary">{ticket.requestedPriority}</span>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="small text-muted">Created</div>
          <div>{new Date(ticket.createdAt).toLocaleString()}</div>
        </div>
        <div className="col-6 col-md-3">
          <div className="small text-muted">Last Updated</div>
          <div>{new Date(ticket.updatedAt).toLocaleString()}</div>
        </div>
      </div>

      <div className="mb-3">
        <div className="small text-muted">Summary</div>
        <div>{ticket.summary}</div>
      </div>

      <div className="mb-4">
        <div className="small text-muted">Description</div>
        <div style={{ whiteSpace: "pre-wrap" }}>{ticket.description}</div>
      </div>

      {actionError && (
        <div className="alert alert-danger py-2" data-testid="staff-action-error">
          {actionError}
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <label className="form-label small">Ticket Owner</label>
          <select
            className="form-select form-select-sm"
            value={ticket.ticketOwnerId ?? ""}
            onChange={(e) => handleOwnerChange(e.target.value)}
            disabled={savingOwner}
            data-testid="staff-owner-select"
          >
            <option value="">Unassigned</option>
            {staffUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
        </div>
        <div className="col-6 col-md-4">
          <label className="form-label small">IT Priority</label>
          <select
            className="form-select form-select-sm"
            value={ticket.itPriority ?? ""}
            onChange={(e) => handlePriorityChange(e.target.value)}
            disabled={savingPriority}
            data-testid="staff-priority-select"
          >
            <option value="">Not set</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div className="col-6 col-md-4">
          <label className="form-label small">Current Status</label>
          <select
            className="form-select form-select-sm"
            value={ticket.currentStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={savingStatus}
            data-testid="staff-status-select"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ActionsTaken ticketId={ticket.id} mode="staff" currentUser={currentUser} staffUsers={staffUsers} />

      <h3 className="h6">Attachments</h3>
      {attachments.length === 0 && <p className="text-muted small">No attachments.</p>}
      {attachments.length > 0 && (
        <ul className="list-group mb-4" data-testid="staff-ticket-attachments">
          {attachments.map((a) => (
            <li key={a.id} className="list-group-item d-flex justify-content-between align-items-center">
              <div>
                {a.fileName} ({Math.round(a.sizeBytes / 1024)} KB)
                {a.isRemoved && <span className="badge bg-secondary ms-2">Removed</span>}
              </div>
              {!a.isRemoved && (
                <button
                  type="button"
                  className="btn btn-outline-success btn-sm"
                  onClick={() => window.open(`${API_URL}/api/attachments/${a.id}/download`, "_blank")}
                >
                  Download
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="row">
        <div className="col-12 col-md-6 mb-4">
          <div className="p-3 rounded" style={{ backgroundColor: "#eaf6ef" }} data-testid="public-comments-panel">
            <h3 className="h6">Public Comments</h3>
            {comments.length === 0 && <p className="text-muted small">No comments yet.</p>}
            {comments.map((c) => (
              <div key={c.id} className="mb-2">
                <div className="small text-muted">
                  {c.authorName} — {new Date(c.createdAt).toLocaleString()}
                </div>
                <div style={{ whiteSpace: "pre-wrap" }}>{c.content}</div>
              </div>
            ))}
            <form onSubmit={handlePostComment} className="mt-2">
              <textarea
                className="form-control form-control-sm mb-2"
                rows={2}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                data-testid="staff-comment-input"
              />
              {commentError && <div className="text-danger small mb-2">{commentError}</div>}
              <button
                type="submit"
                className="btn btn-outline-success btn-sm"
                disabled={postingComment}
                data-testid="staff-comment-submit"
              >
                {postingComment ? "Posting..." : "Post Comment"}
              </button>
            </form>
          </div>
        </div>

        <div className="col-12 col-md-6 mb-4">
          <div className="p-3 rounded" style={{ backgroundColor: "#fdf3d9" }} data-testid="internal-notes-panel">
            <h3 className="h6">🔒 Internal Notes (staff only)</h3>
            {notes.length === 0 && <p className="text-muted small">No notes yet.</p>}
            {notes.map((n) => (
              <div key={n.id} className="mb-2">
                <div className="small text-muted">
                  {n.authorName} — {new Date(n.createdAt).toLocaleString()}
                </div>
                <div style={{ whiteSpace: "pre-wrap" }}>{n.content}</div>
              </div>
            ))}
            <form onSubmit={handlePostNote} className="mt-2">
              <textarea
                className="form-control form-control-sm mb-2"
                rows={2}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                data-testid="staff-note-input"
              />
              {noteError && <div className="text-danger small mb-2">{noteError}</div>}
              <button
                type="submit"
                className="btn btn-outline-warning btn-sm"
                disabled={postingNote}
                data-testid="staff-note-submit"
              >
                {postingNote ? "Posting..." : "Post Internal Note"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StaffTicketDetail;