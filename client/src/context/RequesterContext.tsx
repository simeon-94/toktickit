import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface DevRequester {
  id: number;
  name: string;
  email: string;
}

interface RequesterContextValue {
  requester: DevRequester | null;
  setRequester: (r: DevRequester | null) => void;
}

const RequesterContext = createContext<RequesterContextValue | undefined>(undefined);

const STORAGE_KEY = "toktickit_selected_requester";

export function RequesterProvider({ children }: { children: ReactNode }) {
  const [requester, setRequesterState] = useState<DevRequester | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  function setRequester(r: DevRequester | null) {
    setRequesterState(r);
    if (r) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  return (
    <RequesterContext.Provider value={{ requester, setRequester }}>
      {children}
    </RequesterContext.Provider>
  );
}

export function useRequester() {
  const ctx = useContext(RequesterContext);
  if (!ctx) throw new Error("useRequester must be used inside RequesterProvider");
  return ctx;
}