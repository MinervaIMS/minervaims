import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// Auto-recover from stale chunk references after a new deploy.
// When index.html still in the browser points at vendor/asset hashes that no
// longer exist on the server, dynamic imports throw "Importing a module script
// failed". Reload once to fetch the new index.html and chunk hashes.
const RELOAD_KEY = "__chunk_reload_attempted__";
const isChunkLoadError = (msg: unknown) => {
  if (typeof msg !== "string") return false;
  return (
    msg.includes("Importing a module script failed") ||
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("error loading dynamically imported module") ||
    /Loading chunk \S+ failed/i.test(msg)
  );
};
const tryReload = () => {
  if (sessionStorage.getItem(RELOAD_KEY)) return;
  sessionStorage.setItem(RELOAD_KEY, "1");
  window.location.reload();
};
window.addEventListener("error", (e) => {
  if (isChunkLoadError(e.message)) tryReload();
});
window.addEventListener("unhandledrejection", (e) => {
  const reason = e.reason;
  const msg = typeof reason === "string" ? reason : reason?.message;
  if (isChunkLoadError(msg)) tryReload();
});
// Clear the guard once the app successfully boots.
window.addEventListener("load", () => {
  setTimeout(() => sessionStorage.removeItem(RELOAD_KEY), 2000);
});

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
