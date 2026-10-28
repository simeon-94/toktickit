import { useCallback, useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export type DashboardState = "loading" | "success" | "forbidden" | "error";

// Loads a dashboard endpoint and maps the response to the ui-spec section 2 states.
export function useDashboard<T>(path: string) {
  const [state, setState] = useState<DashboardState>("loading");
  const [data, setData] = useState<T | null>(null);

  const load = useCallback(() => {
    setState("loading");
    fetch(`${API_URL}${path}`, { credentials: "include" })
      .then(async (res) => {
        if (res.status === 403) {
          setState("forbidden");
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setData(await res.json());
        setState("success");
      })
      .catch(() => setState("error"));
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  return { state, data, reload: load };
}
