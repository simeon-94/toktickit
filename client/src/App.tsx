import { useState } from "react";
import { useRequester } from "./context/RequesterContext";
import RequesterSelect from "./components/RequesterSelect";
import CreateTicket from "./components/CreateTicket";
import MyTickets from "./components/MyTickets";

type Status = "idle" | "loading" | "success" | "error";
type View = "checkSystem" | "createTicket" | "myTickets";

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
  const { requester, setRequester } = useRequester();
  const [view, setView] = useState<View>("checkSystem");
  const [status, setStatus] = useState<Status>("idle");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");

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

  if (!requester) {
    return <RequesterSelect />;
  }

  return (
    <div className="container py-5" style={{ maxWidth: 960 }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="mb-0">TokTickIT IT Service Desk</h1>
        <div className="text-end">
          <div className="small text-muted" data-testid="current-requester">
            Signed in as {requester.name}
          </div>
          <button
            className="btn btn-link btn-sm p-0"
            data-testid="change-requester-btn"
            onClick={() => setRequester(null)}
          >
            Change Requester
          </button>
        </div>
      </div>

      <nav className="mb-4">
        <button
          className={`btn btn-sm me-2 ${view === "checkSystem" ? "btn-success" : "btn-outline-success"}`}
          data-testid="nav-check-system"
          onClick={() => setView("checkSystem")}
        >
          Check System
        </button>
        <button
          className={`btn btn-sm me-2 ${view === "createTicket" ? "btn-success" : "btn-outline-success"}`}
          data-testid="nav-create-ticket"
          onClick={() => setView("createTicket")}
        >
          Create Ticket
        </button>
        <button
          className={`btn btn-sm ${view === "myTickets" ? "btn-success" : "btn-outline-success"}`}
          data-testid="nav-my-tickets"
          onClick={() => setView("myTickets")}
        >
          My Tickets
        </button>
      </nav>

      {view === "createTicket" && <CreateTicket />}

      {view === "myTickets" && <MyTickets onCreateTicket={() => setView("createTicket")} />}

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