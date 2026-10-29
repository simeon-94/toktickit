import { useState, useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import Login from "./components/Login";
import ChangePassword from "./components/ChangePassword";
import CreateTicket from "./components/CreateTicket";
import MyTickets from "./components/MyTickets";
import TicketDetail from "./components/TicketDetail";
import StaffQueue from "./components/StaffQueue";
import StaffTicketDetail from "./components/StaffTicketDetail";
import AdminUsers from "./components/AdminUsers";
import StaffDashboard from "./components/lab-04/StaffDashboard";
import RequesterDashboard from "./components/lab-04/RequesterDashboard";
import StaffActionsList from "./components/lab-04/StaffActionsList";
import type { ActionView, DrillDown, ListFilter } from "./components/lab-04/drilldown";
import "./components/lab-04/dashboard.css";

type Status = "idle" | "loading" | "success" | "error";
type View =
  | "dashboard"
  | "staffActions"
  | "changePassword"
  | "checkSystem"
  | "createTicket"
  | "myTickets"
  | "ticketDetail"
  | "staffQueue"
  | "staffTicketDetail"
  | "adminUsers";

interface Category {
  id: number;
  name: string;
}

interface HealthResponse {
  status: string;
  service: string;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

function App() {
  const { user, loading, logout } = useAuth();
  const isStaff = user?.role === "IT_STAFF" || user?.role === "ADMINISTRATOR";
  const isAdmin = user?.role === "ADMINISTRATOR";

  const [view, setView] = useState<View>("dashboard");
  const [hasSetDefaultView, setHasSetDefaultView] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [queueFilter, setQueueFilter] = useState<ListFilter | null>(null);
  const [myTicketsFilter, setMyTicketsFilter] = useState<ListFilter | null>(null);
  const [actionsTarget, setActionsTarget] = useState<{ actionView: ActionView; label: string } | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (user && !hasSetDefaultView) {
      setView("dashboard");
      setHasSetDefaultView(true);
    }
  }, [user, isStaff, hasSetDefaultView]);

  async function handleCheckSystem() {
    setStatus("loading");
    setErrorMessage("");

    try {
      const healthRes = await fetch(`${API_URL}/api/health`);
      if (!healthRes.ok) throw new Error("Health check failed");
      const healthData: HealthResponse = await healthRes.json();

      const categoriesRes = await fetch(`${API_URL}/api/categories`);
      if (!categoriesRes.ok) throw new Error("Categories request failed");
      const categoriesData: Category[] = await categoriesRes.json();

      setHealth(healthData);
      setCategories(categoriesData);
      setStatus("success");
    } catch (error) {
      console.error("Check System failed:", error);
      setErrorMessage("Unable to connect to TokTickIT API");
      setStatus("error");
    }
  }

  function openTicket(id: number) {
    setSelectedTicketId(id);
    setView("ticketDetail");
  }

  function openStaffTicket(id: number) {
    setSelectedTicketId(id);
    setView("staffTicketDetail");
  }

  // Dashboard drill-downs (ui-spec section 0): switch view and pass the card's filter.
  function handleDrillDown(target: DrillDown) {
    if (target.view === "staffQueue") {
      setQueueFilter({ filters: target.filters, label: target.label });
      setView("staffQueue");
    } else if (target.view === "staffActions") {
      setActionsTarget({ actionView: target.actionView, label: target.label });
      setView("staffActions");
    } else if (target.view === "myTickets") {
      setMyTicketsFilter(target.filters && target.label ? { filters: target.filters, label: target.label } : null);
      setView("myTickets");
    } else {
      setView(target.view);
    }
  }

  // Main navigation entry: the active page gets aria-current plus a bold/underlined label.
  function navButton(testId: string, label: string, active: boolean, onClick: () => void) {
    return (
      <button
        type="button"
        className={`btn btn-sm ${active ? "btn-success l4-nav-active" : "btn-outline-success"}`}
        data-testid={testId}
        aria-current={active ? "page" : undefined}
        onClick={onClick}
      >
        {label}
      </button>
    );
  }

  if (loading) {
    return <div className="container py-5">Loading...</div>;
  }

  if (!user) {
    return <Login />;
  }

  if (user.mustChangePassword) {
    return <ChangePassword />;
  }

  return (
    <div className="container py-5" style={{ maxWidth: 960 }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="mb-0">TokTickIT IT Service Desk</h1>
        <div className="text-end">
          <div className="small text-muted" data-testid="current-user">
            Signed in as {user.name} ({user.role})
          </div>
          <button
            className="btn btn-link btn-sm p-0"
            data-testid="logout-btn"
            onClick={() => logout()}
          >
            Log Out
          </button>
        </div>
      </div>

      <nav className="mb-4 l4-nav" aria-label="Main">
        {navButton("nav-dashboard", "Dashboard", view === "dashboard" || view === "staffActions", () => setView("dashboard"))}
        {isStaff ? (
          navButton("nav-staff-queue", "Ticket Queue", view === "staffQueue" || view === "staffTicketDetail", () => {
            setQueueFilter(null);
            setView("staffQueue");
          })
        ) : (
          <>
            {navButton("nav-my-tickets", "My Tickets", view === "myTickets" || view === "ticketDetail", () => {
              setMyTicketsFilter(null);
              setView("myTickets");
            })}
            {navButton("nav-create-ticket", "Create Ticket", view === "createTicket", () => setView("createTicket"))}
          </>
        )}
        {isAdmin && navButton("nav-admin-users", "Users", view === "adminUsers", () => setView("adminUsers"))}
        {navButton("nav-change-password", "Change Password", view === "changePassword", () => setView("changePassword"))}
        {navButton("nav-check-system", "Check System", view === "checkSystem", () => setView("checkSystem"))}
      </nav>

      {view === "dashboard" && isStaff && (
        <StaffDashboard onNavigate={handleDrillDown} onOpenTicket={openStaffTicket} onGoHome={() => setView("dashboard")} />
      )}

      {view === "dashboard" && !isStaff && (
        <RequesterDashboard onNavigate={handleDrillDown} onOpenTicket={openTicket} onGoHome={() => setView("dashboard")} />
      )}

      {view === "staffActions" && isStaff && actionsTarget && (
        <StaffActionsList
          actionView={actionsTarget.actionView}
          label={actionsTarget.label}
          onOpenTicket={openStaffTicket}
          onBack={() => setView("dashboard")}
        />
      )}

      {view === "changePassword" && <ChangePassword mode="voluntary" />}

      {view === "staffQueue" && isStaff && (
        <StaffQueue onOpenTicket={openStaffTicket} presetFilter={queueFilter} onClearPreset={() => setQueueFilter(null)} />
      )}

      {view === "staffTicketDetail" && isStaff && selectedTicketId !== null && (
        <StaffTicketDetail
          ticketId={selectedTicketId}
          onBack={() => setView("staffQueue")}
          currentUser={user ? { id: user.id, name: user.name } : undefined}
        />
      )}

      {view === "adminUsers" && isAdmin && <AdminUsers />}

      {view === "createTicket" && !isStaff && <CreateTicket />}

      {view === "myTickets" && !isStaff && (
        <MyTickets
          onCreateTicket={() => setView("createTicket")}
          onOpenTicket={openTicket}
          presetFilter={myTicketsFilter}
          onClearPreset={() => setMyTicketsFilter(null)}
        />
      )}

      {view === "ticketDetail" && !isStaff && selectedTicketId !== null && (
        <TicketDetail ticketId={selectedTicketId} onBack={() => setView("myTickets")} />
      )}

      {view === "checkSystem" && (
        <>
          <button
            className="btn btn-success mb-4"
            data-testid="check-system-btn"
            onClick={handleCheckSystem}
            disabled={status === "loading"}
          >
            {status === "loading" ? "Checking..." : "Check System"}
          </button>

          {status === "loading" && (
            <p data-testid="loading-state" className="text-muted">
              &#8987; loading...
            </p>
          )}

          {status === "success" && health && (
            <div data-testid="success-state">
              <p>
                <strong>System Status:</strong>{" "}
                <span data-testid="system-status">
                  {health.status === "ok" ? "Online" : "Offline"}
                </span>
              </p>
              <h2 className="h5 mt-4">Supported Request Categories</h2>
              <ol data-testid="category-list">
                {categories.map((category) => (
                  <li key={category.id}>{category.name}</li>
                ))}
              </ol>
            </div>
          )}

          {status === "error" && (
            <div className="alert alert-danger" data-testid="error-state" role="alert">
              <p className="mb-1">
                <strong>System Status:</strong> Offline
              </p>
              <p className="mb-0" data-testid="error-message">
                {errorMessage}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;