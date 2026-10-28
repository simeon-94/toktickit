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

type Status = "idle" | "loading" | "success" | "error";
type View =
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

  const [view, setView] = useState<View>("checkSystem");
  const [hasSetDefaultView, setHasSetDefaultView] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (user && !hasSetDefaultView) {
      setView(isStaff ? "staffQueue" : "checkSystem");
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

      <nav className="mb-4">
        {isStaff ? (
          <button
            className={`btn btn-sm me-2 ${view === "staffQueue" || view === "staffTicketDetail" ? "btn-success" : "btn-outline-success"}`}
            data-testid="nav-staff-queue"
            onClick={() => setView("staffQueue")}
          >
            Ticket Queue
          </button>
        ) : (
          <>
            <button
              className={`btn btn-sm me-2 ${view === "createTicket" ? "btn-success" : "btn-outline-success"}`}
              data-testid="nav-create-ticket"
              onClick={() => setView("createTicket")}
            >
              Create Ticket
            </button>
            <button
              className={`btn btn-sm me-2 ${view === "myTickets" || view === "ticketDetail" ? "btn-success" : "btn-outline-success"}`}
              data-testid="nav-my-tickets"
              onClick={() => setView("myTickets")}
            >
              My Tickets
            </button>
          </>
        )}
        {isAdmin && (
          <button
            className={`btn btn-sm me-2 ${view === "adminUsers" ? "btn-success" : "btn-outline-success"}`}
            data-testid="nav-admin-users"
            onClick={() => setView("adminUsers")}
          >
            User Management
          </button>
        )}
        <button
          className={`btn btn-sm ${view === "checkSystem" ? "btn-success" : "btn-outline-success"}`}
          data-testid="nav-check-system"
          onClick={() => setView("checkSystem")}
        >
          Check System
        </button>
      </nav>

      {view === "staffQueue" && isStaff && <StaffQueue onOpenTicket={openStaffTicket} />}

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
        <MyTickets onCreateTicket={() => setView("createTicket")} onOpenTicket={openTicket} />
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