// The page frame every public route is drawn in (Layout), named once so the
// homepage's first screen, which the build draws without React running
// (vite.prerender.ts, Step 102), sits in exactly the same frame.
export const LAYOUT_FRAME_CLASS = 'min-h-screen flex flex-col overflow-x-clip bg-background';
export const LAYOUT_MAIN_CLASS = 'flex-1';
