import { useEffect, useState, type MouseEvent } from "react";
import { formatBangkok } from "./ActionsTaken";
import type { ActionView } from "./drilldown";
import "./dashboard.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const PAGE_SIZE = 10;

interface ActionRow {
  id: number;
  ticketId: number;
  ticketNumber: string;
  description: string;
  actionAt: string;
  status: string;
  followUpNote: string | null;
  assigneeName: string;
}

interface Props {
  actionView: ActionView;
  label: string;
  onOpenTicket: (id: number) => void;
  onBack: () => void;
}

// Drill-down list for the action-based dashboard cards (spec CL-02): GET /api/staff/actions.
function StaffActionsList({ actionView, label, onOpenTicket, onBack }: Props) {
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [items, setItems] = useState<ActionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setState("loading");
    fetch(`${API_URL}/api/staff/actions?view=${actionView}&page=${page}&pageSize=${PAGE_SIZE}`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        setItems(body.items);
        setTotal(body.total);
        setState("success");
      })
      .catch(() => setState("error"));
  }, [actionView, page, reloadKey]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const open = (id: number) => (event: MouseEvent) => {
    event.preventDefault();
    onOpenTicket(id);
  };

  return (
    <div className="l4-dash" data-testid="staff-actions-list">
      <button type="button" className="btn btn-link btn-sm px-0 mb-2" onClick={onBack}>
        &larr; Back to Dashboard
      </button>
      <h2 className="h5">{label}</h2>
      {state === "loading" && (
        <p className="text-muted" role="status">
          Loading actions...
        </p>
      )}
      {state === "error" && (
        <div className="alert alert-danger d-flex flex-wrap align-items-center gap-2">
          <span>Could not load the actions.</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setReloadKey((k) => k + 1)}>
            Retry
          </button>
        </div>
      )}
      {state === "success" && (
        <>
          <p className="small mb-2" role="status">
            <span data-testid="drilldown-total">{total}</span> {total === 1 ? "action" : "actions"}
          </p>
          {items.length === 0 ? (
            <p className="text-muted">Nothing to show</p>
          ) : (
            <ul className="l4-list">
              {items.map((a) => (
                <li key={a.id} data-testid="staff-actions-row">
                  <a href="#" onClick={open(a.ticketId)}>
                    {a.ticketNumber}
                  </a>{" "}
                  {a.description}
                  <div className="small text-muted">
                    {a.status === "PLANNED" ? "Planned" : "Completed"} · {formatBangkok(a.actionAt)} · {a.assigneeName}
                    {a.followUpNote ? ` · Follow-up: ${a.followUpNote}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {totalPages > 1 && (
            <div className="d-flex align-items-center gap-2 mt-2">
              <button type="button" className="btn btn-sm btn-outline-success" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span className="small">
                Page {page} of {totalPages}
              </span>
              <button type="button" className="btn btn-sm btn-outline-success" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default StaffActionsList;
