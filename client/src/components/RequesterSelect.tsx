import { useEffect, useState } from "react";
import { useRequester, DevRequester } from "../context/RequesterContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

type LoadState = "loading" | "success" | "empty" | "error";

export default function RequesterSelect() {
  const { setRequester } = useRequester();
  const [state, setState] = useState<LoadState>("loading");
  const [requesters, setRequesters] = useState<DevRequester[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    async function load() {
      setState("loading");
      try {
        const res = await fetch(`${API_URL}/api/dev-requesters`);
        if (!res.ok) throw new Error("Failed to load requesters");
        const data: DevRequester[] = await res.json();
        setRequesters(data);
        setState(data.length === 0 ? "empty" : "success");
      } catch (err) {
        setState("error");
      }
    }
    load();
  }, []);

  function handleContinue() {
    const chosen = requesters.find((r) => String(r.id) === selectedId);
    if (chosen) setRequester(chosen);
  }

  return (
    <div className="container py-5" style={{ maxWidth: 480 }}>
      <div className="card shadow-sm border-0">
        <div className="card-body p-4">
          <h1 className="h4 mb-2">Select Development Requester</h1>
          <p className="text-muted small mb-4">
            This is for Lab 2 testing only and is not a login screen. Authentication and
            role-based access will be introduced in Lab 3.
          </p>

          {state === "loading" && <p data-testid="requester-loading">Loading requesters...</p>}

          {state === "error" && (
            <div className="alert alert-danger" data-testid="requester-error">
              Unable to load Development Requesters. Please try again later.
            </div>
          )}

          {state === "empty" && (
            <div className="alert alert-warning" data-testid="requester-empty">
              No active Development Requesters found.
            </div>
          )}

          {state === "success" && (
            <>
              <label htmlFor="requester-select" className="form-label fw-semibold">
                Development Requester <span className="text-danger">*</span>
              </label>
              <select
                id="requester-select"
                className="form-select mb-3"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                data-testid="requester-dropdown"
              >
                <option value="">-- Choose a requester --</option>
                {requesters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>

              <button
                className="btn btn-success w-100"
                disabled={!selectedId}
                onClick={handleContinue}
                data-testid="continue-btn"
              >
                Continue
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}