import { useEffect, useState, type ChangeEvent } from "react";
import { useRequester } from "../context/RequesterContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

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

type LoadStatus = "loading" | "success" | "error";

interface Props {
  ticketId: number;
  onBack: () => void;
}

function TicketDetail({ ticketId, onBack }: Props) {
  const { requester } = useRequester();

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);

  const [removingId, setRemovingId] = useState<number | null>(null);
  const [removeError, setRemoveError] = useState("");

  function loadTicketAndAttachments() {
    if (!requester) return;
    setStatus("loading");

    Promise.all([
      fetch(`${API_URL}/api/tickets/${ticketId}?requesterId=${requester.id}`),
      fetch(`${API_URL}/api/tickets/${ticketId}/attachments?requesterId=${requester.id}`),
    ])
      .then(async ([ticketRes, attachmentsRes]) => {
        if (!ticketRes.ok || !attachmentsRes.ok) {
          throw new Error("Failed to load ticket");
        }
        const ticketData: TicketDetailData = await ticketRes.json();
        const attachmentsData: AttachmentItem[] = await attachmentsRes.json();
        setTicket(ticketData);
        setAttachments(attachmentsData);
        setStatus("success");
      })
      .catch((error) => {
        console.error("Loading ticket detail failed:", error);
        setStatus("error");
      });
  }

  useEffect(() => {
    loadTicketAndAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, requester]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !requester) return;

    setUploadError("");

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("File type not allowed. Only JPG, PNG, WEBP, and PDF are accepted.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("File is too large. Maximum size is 5MB.");
      return;
    }

    const activeCount = attachments.filter((a) => !a.isRemoved).length;
    if (activeCount >= 5) {
      setUploadError("This ticket already has the maximum of 5 attachments.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
      method: "POST",
      body: formData,
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Upload failed");
        }
        loadTicketAndAttachments();
      })
      .catch((error) => {
        setUploadError(error.message || "Unable to upload file. Please try again.");
      })
      .finally(() => setUploading(false));
  }

  function handleRemove(attachmentId: number) {
    if (!requester) return;
    const confirmed = window.confirm("Remove this attachment? This cannot be undone.");
    if (!confirmed) return;

    setRemoveError("");
    setRemovingId(attachmentId);

    fetch(`${API_URL}/api/attachments/${attachmentId}?requesterId=${requester.id}`, {
      method: "DELETE",
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Unable to remove attachment.");
        }
        loadTicketAndAttachments();
      })
      .catch((error) => {
        setRemoveError(error.message || "Unable to remove attachment.");
      })
      .finally(() => setRemovingId(null));
  }

  if (status === "loading") {
    return <p data-testid="ticket-detail-loading">Loading ticket...</p>;
  }

  if (status === "error" || !ticket) {
    return (
      <div className="alert alert-danger" data-testid="ticket-detail-error">
        Unable to load this ticket right now.
        <button className="btn btn-link btn-sm" onClick={onBack}>
          Back to My Tickets
        </button>
      </div>
    );
  }

  return (
    <div data-testid="ticket-detail">
      <button className="btn btn-link btn-sm px-0 mb-3" onClick={onBack}>
        &larr; Back to My Tickets
      </button>

      <h2 className="h5">
        {ticket.ticketNumber} — <span className="badge bg-success">{ticket.currentStatus}</span>
      </h2>

      <div className="row g-3 mb-3">
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
          <div className="small text-muted">IT Priority</div>
          <div>
            {ticket.itPriority ? (
              <span className="badge bg-secondary">{ticket.itPriority}</span>
            ) : (
              <span className="text-muted">Not set yet</span>
            )}
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

      <h3 className="h6">Attachments</h3>

      {attachments.length === 0 && <p className="text-muted small">No attachments yet.</p>}

      {attachments.length > 0 && (
        <ul className="list-group mb-3" data-testid="ticket-detail-attachments">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="list-group-item d-flex justify-content-between align-items-center"
              data-testid="ticket-detail-attachment-row"
            >
              <div>
                <div>
                  {a.fileName} ({Math.round(a.sizeBytes / 1024)} KB)
                  {a.isRemoved && (
                    <span className="badge bg-secondary ms-2" data-testid="attachment-removed-badge">
                      Removed
                    </span>
                  )}
                </div>
                <div className="small text-muted">
                  Uploaded {new Date(a.uploadedAt).toLocaleString()}
                </div>
              </div>
              <div>
                {a.isRemoved ? (
                  <button className="btn btn-outline-secondary btn-sm" disabled data-testid="attachment-download-disabled">
                    Download
                  </button>
                ) : (
                    <button type="button"
                  
                    className="btn btn-outline-success btn-sm me-2"
                    onClick={() => window.open(`${API_URL}/api/attachments/${a.id}/download?requesterId=${requester?.id}`, "_blank")}
                    data-testid="attachment-download-link"
                  >
                    Download
                  </button>
                )}
                {!a.isRemoved && (
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => handleRemove(a.id)}
                    disabled={removingId === a.id}
                    data-testid="attachment-remove-btn"
                  >
                    {removingId === a.id ? "Removing..." : "Remove"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {removeError && (
        <div className="alert alert-danger py-2" data-testid="attachment-remove-error">
          {removeError}
        </div>
      )}

      <div>
        <label className="form-label small">Add Attachment (JPG/PNG/WEBP/PDF, 5MB max)</label>
        <input
          type="file"
          className="form-control form-control-sm"
          onChange={handleFileChange}
          disabled={uploading}
          data-testid="ticket-detail-file-input"
        />
        {uploadError && (
          <div className="text-danger small mt-1" data-testid="ticket-detail-upload-error">
            {uploadError}
          </div>
        )}
      </div>
    </div>
  );
}

export default TicketDetail;