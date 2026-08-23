// =====================================================================
// The hero overlay, as an address rather than a secret.
// ---------------------------------------------------------------------
// The dark purple wash that sits over every hero photograph on the site
// is NOT a CSS gradient. It is a second image, declared in index.css as
// the background of `.hero-overlay` and `.page-intro-overlay`.
//
// That matters because it makes a hero TWO independent downloads, and two
// downloads can arrive in either order. On the homepage the photograph
// was additionally being preloaded on mount while the overlay was not
// started until the hero rendered, so the photograph had a head start by
// construction and the reader saw the bright, unshaded picture first: the
// two-stage load the homepage opened with on desktop.
//
// Naming the URL here lets the page preload the overlay alongside the
// photograph, so the two layers are ready together and the hero is only
// ever shown finished. The value must stay identical to the one in
// index.css; it is written down once, here, and imported from there.
// =====================================================================

/** The dark purple wash used by `.hero-overlay` and `.page-intro-overlay`. */
export const HERO_OVERLAY_URL =
  '/__l5e/assets-v1/2ae69f69-eec7-46ef-99b5-2f1c66ae5ce0/dark-purple-overlay-v4.webp';
