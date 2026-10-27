// =====================================================================
// THE DATABASE CLIENT, AS THE BUILD SEES IT WHEN IT DRAWS THE HOMEPAGE'S
// FIRST SCREEN (vite.prerender.ts, Step 102).
// ---------------------------------------------------------------------
// The first screen is drawn once, at build time, without a browser. Its
// components import the database client, but drawing a screen only reads
// what they are given: every request is made by effects, which do not run
// there. This stands in for the client so that nothing is opened, stored
// or timed while the screen is drawn. The site itself never uses it.
// =====================================================================

const inert: unknown = new Proxy(function inert() { /* nothing */ }, {
  // `then` is left undefined so that nothing mistakes this for a promise.
  get: (_target, key) => (key === 'then' ? undefined : inert),
  apply: () => inert,
});

export const supabase = inert as typeof import('@/integrations/supabase/client').supabase;
