// =====================================================================
// The names the homepage's first screen shares between the build, which
// writes them into the page (vite.prerender.ts, vite.prerender-page.ts),
// and the app, which reads them (lib/prerender.ts). Step 102. Kept free of
// anything that needs a browser, so the build can import it.
// =====================================================================

import type { KeyNumber } from './key-numbers';

/** The <template> that holds the first screen. */
export const PRERENDER_TEMPLATE_ID = 'mims-home';
/** Set on <html> to "home" once the first screen has been put in place. */
export const PRERENDER_ATTRIBUTE = 'data-prerendered';
/** Set on <html> to "static" while the page itself plays the phone intro. */
export const STATIC_INTRO_ATTRIBUTE = 'data-intro';
/** The global the page writes the count's start time to (a frame time). */
export const COUNT_START_GLOBAL = '__mimsCountFrom';
/** The JSON block with the application settings row the build read. */
export const APPLICATION_ROW_ELEMENT_ID = 'mims-application-settings';
/** The three hero figures, in the order the hero shows them. */
export const HOME_HERO_FIGURES = ['reports_published', 'active_members', 'alumni'] as const;
/** The fields of a figure that decide what the hero shows (text and title). */
export const HERO_FIGURE_FIELDS: (keyof KeyNumber)[] = ['value', 'format', 'decimals', 'prefix', 'suffix', 'definition', 'period', 'as_of'];
