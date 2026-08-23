import { useEffect, useState } from "react";
import { useRequester } from "../context/RequesterContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

interface Category {
  id: number;
  name: string;
}

interface TicketListItem {
  id: number;
  ticketNumber: string;
  summary: string;
  categoryName: string;
  requestedPriority: string;
  itPriority: string | null;
  currentStatus: string;
  createdAt: string;
  updatedAt: string;
}

interface TicketsResponse {
  items: TicketListItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

type Status = "loading" | "success" | "error";

interface Props {
  onCreateTicket: () => void;
}

function MyTickets({ onCreateTicket }: Props) {
  const { requester } = useRequester();

  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState("createdAt_desc");
  const [page, setPage] = useState(1);

  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<TicketsResponse | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/categories`)
      .then((res) => res.json())
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!requester) return;

    setStatus("loading");

    const params = new URLSearchParams({
      requesterId: String(requester.id),
      sort,
      page: String(page),
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (categoryFilter) params.set("category", categoryFilter);
    if (priorityFilter) params.set("priority", priorityFilter);
    if (statusFilter) params.set("status", statusFilter);

    fetch(`${API_URL}/api/tickets?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load tickets");
        return res.json();
      })
      .then((body: TicketsResponse) => {
        setData(body);
        setStatus("success");
      })
      .catch((error) => {
        console.error("Loading tickets failed:", error);
        setStatus("error");
      });
  }, [requester, debouncedSearch, categoryFilter, priorityFilter, statusFilter, sort, page]);

  const hasActiveFilters = Boolean(debouncedSearch || categoryFilter || priorityFilter || statusFilter);

  return (
    <div data-testid="my-tickets">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h5 mb-0">My Tickets</h2>
        <button className="btn btn-success btn-sm" onClick={onCreateTicket} data-testid="my-tickets-create-btn">
          Create Ticket
        </button>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-12 col-md-4">
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Search by ticket number or summary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="my-tickets-search"
          />
        </div>
        <div className="col-6 col-md-2">
          <select
            className="form-select form-select-sm"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            data-testid="my-tickets-filter-category"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-6 col-md-2">
          <select
            className="form-select form-select-sm"
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            data-testid="my-tickets-filter-priority"
          >
            <option value="">All priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div className="col-6 col-md-2">
          <select
            className="form-select form-select-sm"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            data-testid="my-tickets-filter-status"
          >
            <option value="">All statuses</option>
            <option value="New">New</option>
          </select>
        </div>
        <div className="col-6 col-md-2">
          <select
            className="form-select form-select-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            data-testid="my-tickets-sort"
          >
            <option value="createdAt_desc">Newest first</option>
            <option value="createdAt_asc">Oldest first</option>
            <option value="summary_asc">Summary A-Z</option>
            <option value="summary_desc">Summary Z-A</option>
          </select>
        </div>
      </div>

      {status === "loading" && <p data-testid="my-tickets-loading">Loading tickets...</p>}

      {status === "error" && (
        <div className="alert alert-danger" data-testid="my-tickets-error">
          Unable to load your tickets right now. Please try again later.
        </div>
      )}

      {status === "success" && data && data.items.length === 0 && !hasActiveFilters && (
        <div className="alert alert-secondary" data-testid="my-tickets-empty">
          <p className="mb-2">You don't have any tickets yet.</p>
          <button className="btn btn-success btn-sm" onClick={onCreateTicket}>
            Create Ticket
          </button>
        </div>
      )}

      {status === "success" && data && data.items.length === 0 && hasActiveFilters && (
        <div className="alert alert-secondary" data-testid="my-tickets-no-results">
          No tickets match your search or filters. Try adjusting them.
        </div>
      )}

      {status === "success" && data && data.items.length > 0 && (
        <>
          <table className="table table-sm" data-testid="my-tickets-table">
            <thead>
              <tr>
                <th>Ticket No.</th>
                <th>Created</th>
                <th>Summary</th>
                <th>Category</th>
                <th>Requested Priority</th>
                <th>Current Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((t) => (
                <tr key={t.id} data-testid="my-tickets-row">
                  <td>{t.ticketNumber}</td>
                  <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td>{t.summary}</td>
                  <td>{t.categoryName}</td>
                  <td>
                    <span className="badge bg-secondary">{t.requestedPriority}</span>
                  </td>
                  <td>
                    <span className="badge bg-success">{t.currentStatus}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="d-flex justify-content-between align-items-center">
            <span className="small text-muted">
              Page {data.page} of {data.totalPages} ({data.totalItems} tickets)
            </span>
            <div>
              <button
                className="btn btn-outline-success btn-sm me-2"
                disabled={data.page <= 1}
                onClick={() => setPage((p) => p - 1)}
                data-testid="my-tickets-prev-page"
              >
                Previous
              </button>
              <button
                className="btn btn-outline-success btn-sm"
                disabled={data.page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                data-testid="my-tickets-next-page"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default MyTickets;