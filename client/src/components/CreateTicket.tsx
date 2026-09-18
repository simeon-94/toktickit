import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 5;

interface Category {
  id: number;
  name: string;
}

interface RelatedSystem {
  id: number;
  name: string;
}

interface CreatedTicket {
  id: number;
  ticketNumber: string;
}

type OptionsStatus = "loading" | "success" | "error";
type SubmitStatus = "idle" | "submitting" | "success" | "error";

function CreateTicket() {
  const [optionsStatus, setOptionsStatus] = useState<OptionsStatus>("loading");
  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);

  const [categoryId, setCategoryId] = useState("");
  const [relatedSystemId, setRelatedSystemId] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [requestedPriority, setRequestedPriority] = useState("MEDIUM");

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [submitError, setSubmitError] = useState("");
  const [createdTicket, setCreatedTicket] = useState<CreatedTicket | null>(null);
  const [attachmentResults, setAttachmentResults] = useState<{ name: string; ok: boolean }[]>([]);

  useEffect(() => {
    async function loadOptions() {
      try {
        const [categoriesRes, systemsRes] = await Promise.all([
          fetch(`${API_URL}/api/categories`, { credentials: "include" }),
          fetch(`${API_URL}/api/related-systems`, { credentials: "include" }),
        ]);
        if (!categoriesRes.ok || !systemsRes.ok) throw new Error("Failed to load options");

        const categoriesData: Category[] = await categoriesRes.json();
        const systemsData: RelatedSystem[] = await systemsRes.json();

        setCategories(categoriesData);
        setRelatedSystems(systemsData);
        setOptionsStatus("success");
      } catch (error) {
        console.error("Loading Create Ticket options failed:", error);
        setOptionsStatus("error");
      }
    }
    loadOptions();
  }, []);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    const newErrors: Record<string, string> = {};
    const validFiles: File[] = [...selectedFiles];

    for (const file of files) {
      if (validFiles.length >= MAX_FILES) {
        newErrors[file.name] = "Maximum of 5 attachments reached.";
        continue;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        newErrors[file.name] = "File type not allowed. Only JPG, PNG, WEBP, and PDF are accepted.";
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        newErrors[file.name] = "File is too large. Maximum size is 5MB.";
        continue;
      }
      validFiles.push(file);
    }

    setSelectedFiles(validFiles);
    setFileErrors((prev) => ({ ...prev, ...newErrors }));
    event.target.value = "";
  }

  function removeFile(name: string) {
    setSelectedFiles((prev) => prev.filter((f) => f.name !== name));
  }

  function validateForm() {
    const errors: Record<string, string> = {};

    if (!categoryId) errors.categoryId = "Please select a category.";
    if (!relatedSystemId) errors.relatedSystemId = "Please select a related system.";

    const trimmedSummary = summary.trim();
    if (trimmedSummary.length < 3 || trimmedSummary.length > 150) {
      errors.summary = "Summary must be between 3 and 150 characters.";
    }

    const trimmedDescription = description.trim();
    if (trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
      errors.description = "Description must be between 10 and 2000 characters.";
    }

    return errors;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const errors = validateForm();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitStatus("submitting");
    setSubmitError("");

    try {
      const res = await fetch(`${API_URL}/api/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          categoryId: Number(categoryId),
          relatedSystemId: Number(relatedSystemId),
          summary: summary.trim(),
          description: description.trim(),
          requestedPriority,
        }),
      });

      if (res.status === 400) {
        const body = await res.json();
        setFieldErrors(body.errors || {});
        setSubmitStatus("error");
        setSubmitError("Please fix the fields below.");
        return;
      }

      if (!res.ok) {
        throw new Error("Ticket creation failed");
      }

      const ticket: CreatedTicket = await res.json();
      setCreatedTicket(ticket);

      const results: { name: string; ok: boolean }[] = [];
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        try {
          const uploadRes = await fetch(`${API_URL}/api/tickets/${ticket.id}/attachments`, {
            method: "POST",
            credentials: "include",
            body: formData,
          });
          results.push({ name: file.name, ok: uploadRes.ok });
        } catch {
          results.push({ name: file.name, ok: false });
        }
      }
      setAttachmentResults(results);
      setSubmitStatus("success");
    } catch (error) {
      console.error("Create ticket failed:", error);
      setSubmitStatus("error");
      setSubmitError("Unable to reach the server. Please check your connection and try again.");
    }
  }

  function handleCreateAnother() {
    setCategoryId("");
    setRelatedSystemId("");
    setSummary("");
    setDescription("");
    setRequestedPriority("MEDIUM");
    setSelectedFiles([]);
    setFileErrors({});
    setFieldErrors({});
    setSubmitStatus("idle");
    setSubmitError("");
    setCreatedTicket(null);
    setAttachmentResults([]);
  }

  if (optionsStatus === "loading") {
    return <p data-testid="create-ticket-loading">Loading form...</p>;
  }

  if (optionsStatus === "error") {
    return (
      <div className="alert alert-danger" data-testid="create-ticket-options-error">
        Unable to load the form right now. Please try again later.
      </div>
    );
  }

  if (submitStatus === "success" && createdTicket) {
    return (
      <div data-testid="create-ticket-success" className="alert alert-success">
        <p className="mb-2">
          Ticket created: <strong>{createdTicket.ticketNumber}</strong>
        </p>
        {attachmentResults.length > 0 && (
          <ul className="mb-2">
            {attachmentResults.map((r) => (
              <li key={r.name}>
                {r.name} — {r.ok ? "uploaded" : "failed to upload, you can retry from the ticket later"}
              </li>
            ))}
          </ul>
        )}
        <button className="btn btn-outline-success btn-sm" onClick={handleCreateAnother}>
          Create Another Ticket
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} data-testid="create-ticket-form">
      <h2 className="h5 mb-3">Create Ticket</h2>

      {submitStatus === "error" && (
        <div className="alert alert-danger" data-testid="create-ticket-error">
          {submitError}
        </div>
      )}

      <div className="mb-3">
        <label className="form-label">Category</label>
        <select
          className="form-select"
          data-testid="create-ticket-category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">-- Select a category --</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {fieldErrors.categoryId && <div className="text-danger small mt-1">{fieldErrors.categoryId}</div>}
      </div>

      <div className="mb-3">
        <label className="form-label">Related System</label>
        <select
          className="form-select"
          data-testid="create-ticket-related-system"
          value={relatedSystemId}
          onChange={(e) => setRelatedSystemId(e.target.value)}
        >
          <option value="">-- Select a related system --</option>
          {relatedSystems.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {fieldErrors.relatedSystemId && (
          <div className="text-danger small mt-1">{fieldErrors.relatedSystemId}</div>
        )}
      </div>

      <div className="mb-3">
        <label className="form-label">Summary</label>
        <input
          type="text"
          className="form-control"
          data-testid="create-ticket-summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
        {fieldErrors.summary && <div className="text-danger small mt-1">{fieldErrors.summary}</div>}
      </div>

      <div className="mb-3">
        <label className="form-label">Description</label>
        <textarea
          className="form-control"
          rows={4}
          data-testid="create-ticket-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {fieldErrors.description && <div className="text-danger small mt-1">{fieldErrors.description}</div>}
      </div>

      <div className="mb-3">
        <label className="form-label">Requested Priority</label>
        <select
          className="form-select"
          data-testid="create-ticket-priority"
          value={requestedPriority}
          onChange={(e) => setRequestedPriority(e.target.value)}
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
      </div>

      <div className="mb-3">
        <label className="form-label">Attachments (up to 5, JPG/PNG/WEBP/PDF, 5MB max each)</label>
        <input type="file" className="form-control" multiple onChange={handleFileChange} data-testid="create-ticket-file-input" />

        {selectedFiles.length > 0 && (
          <ul className="list-unstyled mt-2" data-testid="create-ticket-selected-files">
            {selectedFiles.map((f) => (
              <li key={f.name} className="small">
                {f.name} ({Math.round(f.size / 1024)} KB){" "}
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 text-danger"
                  onClick={() => removeFile(f.name)}
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {Object.entries(fileErrors).length > 0 && (
          <ul className="mt-2" data-testid="create-ticket-file-errors">
            {Object.entries(fileErrors).map(([name, msg]) => (
              <li key={name} className="text-danger small">
                {name}: {msg}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="submit"
        className="btn btn-success"
        data-testid="create-ticket-submit"
        disabled={submitStatus === "submitting"}
      >
        {submitStatus === "submitting" ? "Submitting..." : "Create Ticket"}
      </button>
    </form>
  );
}

export default CreateTicket;