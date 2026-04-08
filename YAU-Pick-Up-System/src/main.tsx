import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { CoachAuthProvider } from "./auth/CoachAuthContext";
import { RefreshProvider } from "./contexts/RefreshContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CoachAuthProvider>
      <BrowserRouter>
        <RefreshProvider>
          <App />
        </RefreshProvider>
      </BrowserRouter>
    </CoachAuthProvider>
  </React.StrictMode>
);

