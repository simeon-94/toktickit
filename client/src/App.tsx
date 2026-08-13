import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

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

  return (
    <div className="container py-5" style={{ maxWidth: 560 }}>
      <h1 className="mb-4">TokTickIT IT Service Desk</h1>

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
    </div>
  );
}

export default App;
