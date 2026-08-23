import React from "react";
import ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import App from "./App";
import { RequesterProvider } from "./context/RequesterContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RequesterProvider>
      <App />
    </RequesterProvider>
  </React.StrictMode>
);