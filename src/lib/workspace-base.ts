// =====================================================================
// Where the workspace lives. Two strings, and deliberately nothing else.
// ---------------------------------------------------------------------
// The site header, the layout, the browser-chrome controller and three
// pages all need to recognise a workspace URL, and every one of them is
// loaded EAGERLY, on the first paint of the public homepage.
//
// They used to take these constants from `workspace-nav`, which also
// holds the whole navigation tree, its lucide icons and the lookup maps
// built from them. Importing one string from that module pulled all of it
// into the main bundle - the module has top-level work, so tree-shaking
// cannot drop the rest - and the entry chunk grew by 13kB for every
// visitor who never signs in.
//
// A separate module with no imports and no side effects costs nothing.
// `workspace-nav` re-exports both names, so callers that legitimately
// need the navigation as well can keep importing from one place.
// =====================================================================

/** The workspace's home. Sections live at `/workspace/<section>`. */
export const WORKSPACE_BASE = '/workspace';

/** Where the workspace used to live. Still routed, and redirected. */
export const LEGACY_WORKSPACE_BASE = '/admin';
