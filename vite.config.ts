import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    // Hooks and the renderer must always resolve through the same React module.
    // This also protects HMR after dependency graph changes from retaining a
    // second pre-bundled React identity with an empty hook dispatcher.
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    // App.tsx and several pages contain lazy imports. Treat every source module
    // as a scan entry so Vite discovers their dependencies before serving the
    // first request instead of re-optimizing (and replacing React) mid-render.
    entries: ["index.html", "src/**/*.{ts,tsx}"],
    // Pin React into the first dependency generation. Without this a later
    // discovery can re-optimize React while react-dom keeps the old chunk,
    // which splits the hook dispatcher ("dispatcher.useState is null").
    include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
    // Do not publish an initial dependency generation while Vite is still
    // crawling the application; replacing it in an open tab can split React's
    // hook dispatcher from the renderer that owns it.
    holdUntilCrawlEnd: true,
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tooltip', '@radix-ui/react-tabs'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
}));
