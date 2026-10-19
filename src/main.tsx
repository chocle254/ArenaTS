import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { AllProviders } from "./providers";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AllProviders>
        <App />
      </AllProviders>
    </ErrorBoundary>
  </React.StrictMode>
);

// Installable app + offline page. Navigations always hit the network, so this
// never serves a stale build (see public/sw.js).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  });
}
