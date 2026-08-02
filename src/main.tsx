import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { installInputZoomGuard } from "./lib/input-zoom-guard";

// Auto-recover from stale chunk references after a new deploy.
// When index.html still in the browser points at vendor/asset hashes that no
// longer exist on the server, dynamic imports throw "Importing a module script
// failed". Reload once to fetch the new index.html and chunk hashes.
const RELOAD_KEY = "__module_reload_attempted__";
const RELOAD_PARAM = "module-reload";
const isRecoverableModuleError = (msg: unknown) => {
  if (typeof msg !== "string") return false;
  return (
    msg.includes("Importing a module script failed") ||
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("error loading dynamically imported module") ||
    /Loading chunk \S+ failed/i.test(msg) ||
    // A long-lived Vite tab can briefly retain React from the previous
    // optimized-dependency generation while react-dom has already updated.
    // Hooks then reach the inactive singleton dispatcher and the app blanks.
    msg.includes("dispatcher.useState") ||
    msg.includes("Invalid hook call")
  );
};
const tryReload = () => {
  if (sessionStorage.getItem(RELOAD_KEY)) return;
  sessionStorage.setItem(RELOAD_KEY, "1");
  const url = new URL(window.location.href);
  url.searchParams.set(RELOAD_PARAM, Date.now().toString());
  window.location.replace(url);
};
window.addEventListener("error", (e) => {
  if (isRecoverableModuleError(e.message)) tryReload();
});
window.addEventListener("unhandledrejection", (e) => {
  const reason = e.reason;
  const msg = typeof reason === "string" ? reason : reason?.message;
  if (isRecoverableModuleError(msg)) tryReload();
});

// Suspend viewport scaling while a field has focus, so iOS never zooms
// into a control and leaves the reader magnified afterwards.
installInputZoomGuard();

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Application root element is missing");

createRoot(rootElement).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

// Only clear the one-shot recovery guard after React has committed content.
// The browser load event alone is not sufficient because it also fires when
// React crashes before its first commit.
window.setTimeout(() => {
  if (!rootElement.hasChildNodes()) return;
  sessionStorage.removeItem(RELOAD_KEY);
  const url = new URL(window.location.href);
  if (!url.searchParams.has(RELOAD_PARAM)) return;
  url.searchParams.delete(RELOAD_PARAM);
  window.history.replaceState(window.history.state, "", url);
}, 2000);
