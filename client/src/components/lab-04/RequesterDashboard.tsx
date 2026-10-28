import type { MouseEvent, ReactNode } from "react";
import { formatBangkok } from "./ActionsTaken";
import type { DrillDown } from "./drilldown";
import { useDashboard } from "./useDashboard";
import "./dashboard.css";

interface TicketListItem {
  id: number;
  ticketNumber: string;
  summary: string;
  currentStatus: string;
  updatedAt: string;
}

interface RequesterDashboardData {
  counts: { openTickets: number; waitingForRequester: number; recentlyResolved: number };
  needsAttention: TicketListItem[];
  recentlyUpdated: TicketListItem[];
  recentlyResolved: TicketListItem[];
}

interface Props {
  onNavigate: (target: DrillDown) => void;
  onOpenTicket: (id: number) => void;
  onGoHome: () => void;
}

function go(action: () => void) {
  return (event: MouseEvent) => {
    event.preventDefault();
    action();
  };
}

function Card({ testId, label, value, onOpen }: { testId: string; label: string; value: number; onOpen: () => void }) {
  return (
    <a href="#" className="l4-card" onClick={go(onOpen)} data-testid={testId}>
      <span className="l4-card-label">{label}</span>
      <span className="l4-card-value">{value}</span>
      <span className="l4-card-view">View</span>
    </a>
  );
}

// Requester dashboard (ui-spec section 3): a short summary that links into My Tickets and Ticket
// Detail; it deliberately has no table, search or pagination of its own.
function RequesterDashboard({ onNavigate, onOpenTicket, onGoHome }: Props) {
  const { state, data, reload } = useDashboard<RequesterDashboardData>("/api/dashboard/requester");

  if (state === "loading") {
    return (
      <p className="text-muted" role="status" data-testid="req-dash-loading">
        Loading dashboard...
      </p>
    );
  }
  if (state === "forbidden") {
    return (
      <div className="alert alert-warning" data-testid="req-dash-forbidden">
        You do not have access to this page.{" "}
        <a href="#" onClick={go(onGoHome)}>
          Go to your dashboard
        </a>
      </div>
    );
  }
  if (state === "error" || !data) {
    return (
      <div className="alert alert-danger d-flex flex-wrap align-items-center gap-2" data-testid="req-dash-error">
        <span>Could not load the dashboard.</span>
        <button type="button" className="btn btn-sm btn-outline-danger" onClick={reload} data-testid="req-dash-retry">
          Retry
        </button>
      </div>
    );
  }

  const { counts } = data;
  const myTickets = (filters: Record<string, string>, label: string) => () => onNavigate({ view: "myTickets", filters, label });
  const noTickets = data.recentlyUpdated.length === 0;

  const list = (title: string, testId: string, items: TicketListItem[]): ReactNode => (
    <section className="col-12 col-lg-4" data-testid={testId}>
      <h3 className="h6">{title}</h3>
      {items.length === 0 ? (
        <p className="text-muted small mb-0">Nothing to show</p>
      ) : (
        <ul className="l4-list">
          {items.map((t) => (
            <li key={t.id}>
              <a href="#" onClick={go(() => onOpenTicket(t.id))}>
                {t.ticketNumber}
              </a>{" "}
              {t.summary}
              <div className="small text-muted">
                {t.currentStatus} · updated {formatBangkok(t.updatedAt)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div className="l4-dash" data-testid="req-dashboard">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h2 className="h4 mb-0">Dashboard</h2>
        <a href="#" onClick={go(() => onNavigate({ view: "myTickets" }))}>
          View all tickets
        </a>
      </div>

      <div className="l4-card-grid">
        <Card testId="req-card-open" label="Open tickets" value={counts.openTickets} onOpen={myTickets({ statusGroup: "open" }, "Open tickets")} />
        <Card
          testId="req-card-waiting"
          label="Waiting for you"
          value={counts.waitingForRequester}
          onOpen={myTickets({ status: "WAITING_FOR_REQUESTER" }, "Waiting for you")}
        />
        <Card
          testId="req-card-resolved"
          label="Recently resolved (7 days)"
          value={counts.recentlyResolved}
          onOpen={myTickets({ statusGroup: "resolvedRecent" }, "Recently resolved (7 days)")}
        />
      </div>

      {noTickets && (
        <div className="alert alert-light border d-flex flex-wrap align-items-center gap-2 mt-3 mb-0">
          <span>No tickets yet.</span>
          <button type="button" className="btn btn-success btn-sm" onClick={() => onNavigate({ view: "createTicket" })}>
            Create a ticket
          </button>
        </div>
      )}

      <div className="row g-4 l4-dash-section">
        {list("Needs your attention", "req-list-attention", data.needsAttention)}
        {list("Recently updated", "req-list-recent", data.recentlyUpdated)}
        {list("Recently resolved", "req-list-resolved", data.recentlyResolved)}
      </div>
    </div>
  );
}

export default RequesterDashboard;
