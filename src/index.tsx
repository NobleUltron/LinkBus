import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { App } from "./App";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "1008908020084-tn8s2fnbefb1tg9t4g4elkr8etp93413.apps.googleusercontent.com";

const rootEl = document.getElementById("root");
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
    </ErrorBoundary>
  );
}