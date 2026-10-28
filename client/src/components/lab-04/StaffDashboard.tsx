import type { MouseEvent, ReactNode } from "react";
import { formatBangkok } from "./ActionsTaken";
import type { DrillDown } from "./drilldown";
import { useDashboard } from "./useDashboard";
import "./dashboard.css";

const STATUSES = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
const PRIORITIES: Array<[string, string]> = [
  ["HIGH", "High"],
  ["MEDIUM", "Medium"],
  ["LOW", "Low"],
];

interface TicketListItem {
  id: number;
  ticketNumber: string;
  summary: string;
  currentStatus: string;
  itPriority: string | null;
  ticketOwnerName: string | null;
  updatedAt: string;
}

interface ActionListItem {
  id: number;
  ticketId: number;
  ticketNumber: string;
  description: string;
  actionAt: string;
  status: string;
}

interface StaffDashboardData {
  counts: {
    unassignedOpen: number;
    ownedByMeOpen: number;
    urgentOpen: number;
    openFollowUps: number;
    myPlannedActions: number;
    byStatus: Record<string, number>;
    byItPriority: Record<string, number>;
  };
  urgent: TicketListItem[];
  recentlyUpdated: TicketListItem[];
  myActions: ActionListItem[];
  userCounts?: { active: number; inactive: number; byRole: Record<string, number> };
}

interface Props {
  onNavigate: (target: DrillDown) => void;
  onOpenTicket: (id: number) => void;
  onGoHome: () => void;
}

// Runs a navigation callback from a link without changing the URL (the app has no router).
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

function ListSection({ title, testId, children, empty }: { title: string; testId: string; children: ReactNode; empty: boolean }) {
  return (
    <section className="col-12 col-lg-4" data-testid={testId}>
      <h3 className="h6">{title}</h3>
      {empty ? <p className="text-muted small mb-0">Nothing to show</p> : <ul className="l4-list">{children}</ul>}
    </section>
  );
}

function StaffDashboard({ onNavigate, onOpenTicket, onGoHome }: Props) {
  const { state, data, reload } = useDashboard<StaffDashboardData>("/api/staff/dashboard");

  if (state === "loading") {
    return (
      <p className="text-muted" role="status" data-testid="dash-loading">
        Loading dashboard...
      </p>
    );
  }
  if (state === "forbidden") {
    return (
      <div className="alert alert-warning" data-testid="dash-forbidden">
        You do not have access to this page.{" "}
        <a href="#" onClick={go(onGoHome)}>
          Go to your dashboard
        </a>
      </div>
    );
  }
  if (state === "error" || !data) {
    return (
      <div className="alert alert-danger d-flex flex-wrap align-items-center gap-2" data-testid="dash-error">
        <span>Could not load the dashboard.</span>
        <button type="button" className="btn btn-sm btn-outline-danger" onClick={reload} data-testid="dash-retry">
          Retry
        </button>
      </div>
    );
  }

  const { counts } = data;
  const queue = (filters: Record<string, string>, label: string) => () => onNavigate({ view: "staffQueue", filters, label });

  return (
    <div className="l4-dash" data-testid="staff-dashboard">
      <h2 className="h4 mb-3">Dashboard</h2>
      <div className="l4-card-grid">
        <Card testId="dash-card-unassigned" label="Unassigned open" value={counts.unassignedOpen} onOpen={queue({ unassigned: "true", statusGroup: "open" }, "Unassigned open")} />
        <Card testId="dash-card-owned" label="Owned by me (open)" value={counts.ownedByMeOpen} onOpen={queue({ ownerId: "me", statusGroup: "open" }, "Owned by me (open)")} />
        <Card
          testId="dash-card-urgent"
          label="Urgent (High IT priority, open)"
          value={counts.urgentOpen}
          onOpen={queue({ itPriority: "HIGH", statusGroup: "open" }, "Urgent (High IT priority, open)")}
        />
        <Card
          testId="dash-card-planned-actions"
          label="My planned actions"
          value={counts.myPlannedActions}
          onOpen={() => onNavigate({ view: "staffActions", actionView: "myPlanned", label: "My planned actions" })}
        />
        <Card
          testId="dash-card-followups"
          label="Open follow-ups"
          value={counts.openFollowUps}
          onOpen={() => onNavigate({ view: "staffActions", actionView: "openFollowUps", label: "Open follow-ups" })}
        />
        {data.userCounts && (
          <a href="#" className="l4-card" onClick={go(() => onNavigate({ view: "adminUsers" }))} data-testid="dash-users-card">
            <span className="l4-card-label">Users</span>
            <span className="l4-card-value">{data.userCounts.active} active</span>
            <span className="small">
              {data.userCounts.inactive} inactive · Requesters: {data.userCounts.byRole.REQUESTER ?? 0} · IT Staff:{" "}
              {data.userCounts.byRole.IT_STAFF ?? 0} · Administrators: {data.userCounts.byRole.ADMINISTRATOR ?? 0}
            </span>
            <span className="l4-card-view">View</span>
          </a>
        )}
      </div>

      <div className="row g-4 l4-dash-section">
        <section className="col-12 col-lg-7">
          <h3 className="h6">Tickets by status</h3>
          <ul className="l4-breakdown">
            {STATUSES.map((s) => (
              <li key={s} data-testid={`dash-status-row-${s}`}>
                <span>{s}</span>
                <a href="#" onClick={go(queue({ status: s }, `Status: ${s}`))} aria-label={`${counts.byStatus[s] ?? 0} tickets with status ${s}`}>
                  {counts.byStatus[s] ?? 0}
                </a>
              </li>
            ))}
          </ul>
        </section>
        <section className="col-12 col-lg-5">
          <h3 className="h6">Open tickets by IT priority</h3>
          <ul className="l4-breakdown">
            {PRIORITIES.map(([p, label]) => (
              <li key={p} data-testid={`dash-priority-row-${p}`}>
                <span>{label}</span>
                <a
                  href="#"
                  onClick={go(queue({ effectivePriority: p, statusGroup: "open" }, `Priority ${label} (open)`))}
                  aria-label={`${counts.byItPriority[p] ?? 0} open tickets with ${label} priority`}
                >
                  {counts.byItPriority[p] ?? 0}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="row g-4 l4-dash-section">
        <ListSection title="Urgent tickets" testId="dash-list-urgent" empty={data.urgent.length === 0}>
          {data.urgent.map((t) => (
            <li key={t.id}>
              <a href="#" onClick={go(() => onOpenTicket(t.id))}>
                {t.ticketNumber}
              </a>{" "}
              {t.summary}
              <div className="small text-muted">
                {t.currentStatus} · {t.ticketOwnerName ?? "Unassigned"} · updated {formatBangkok(t.updatedAt)}
              </div>
            </li>
          ))}
        </ListSection>
        <ListSection title="Recently updated (7 days)" testId="dash-list-recent" empty={data.recentlyUpdated.length === 0}>
          {data.recentlyUpdated.map((t) => (
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
        </ListSection>
        <ListSection title="My planned actions" testId="dash-list-my-actions" empty={data.myActions.length === 0}>
          {data.myActions.map((a) => (
            <li key={a.id}>
              <a href="#" onClick={go(() => onOpenTicket(a.ticketId))}>
                {a.description}
              </a>
              <div className="small text-muted">
                {a.ticketNumber} · {formatBangkok(a.actionAt)}
              </div>
            </li>
          ))}
        </ListSection>
      </div>
    </div>
  );
}

export default StaffDashboard;
