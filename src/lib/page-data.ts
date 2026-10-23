// =====================================================================
// THE STATIC PAGES AND THE APP: ONE PAGE, NOT TWO (Step 93).
// ---------------------------------------------------------------------
// For the pages an assistant is most likely to cite (every report, the
// archive, the funds, the divisions and /track-record) the build writes a
// real HTML file (vite.static-pages.ts). It holds the page's content as
// text, so a reader that does not run JavaScript gets the page itself,
// and the page's data as JSON, so the app shows exactly the same values.
//
//   <div id="mims-static">...the page, readable...</div>
//   <style id="mims-static-style">#root{display:none}</style>
//   <script type="application/json" id="mims-page-data">{"key":..., "data":...}</script>
//
// While the app starts, the reader sees the static page. The app draws
// underneath, hidden, and the moment the page's own content is rendered
// (its Seo mounts, see components/shared/Seo.tsx) the static copy is
// removed and the app is shown: no loader in between, and no figure
// changes, because the app read its figures from the same JSON.
//
// THE NUMBER RULE. A page that finds its data here uses it and does not
// read the database again for the same figures, so nothing on screen is
// ever replaced by a newer value. A page reached by navigating inside
// the app has no embedded data and reads it live, before showing it.
// =====================================================================

export const PAGE_DATA_ELEMENT_ID = 'mims-page-data';
export const STATIC_PAGE_ELEMENT_ID = 'mims-static';
export const STATIC_STYLE_ELEMENT_ID = 'mims-static-style';

interface Embedded { key: string; data: unknown }

type Doc = { getElementById(id: string): { textContent: string | null; remove?: () => void } | null };
const doc = (): Doc | null => (globalThis as unknown as { document?: Doc }).document ?? null;

let embedded: Embedded | null | undefined;

function readEmbedded(): Embedded | null {
  if (embedded !== undefined) return embedded;
  embedded = null;
  const el = doc()?.getElementById(PAGE_DATA_ELEMENT_ID);
  if (el?.textContent) {
    try {
      const parsed = JSON.parse(el.textContent) as Embedded;
      if (parsed && typeof parsed.key === 'string') embedded = parsed;
    } catch {
      embedded = null;
    }
  }
  return embedded;
}

/**
 * The data the build embedded for this page, when this load came with it
 * and it is for this page (`report:<address>`, `fund:<fund>`,
 * `track-record`, `division:<division>`). Synchronous, for the first render.
 */
export function readPageData<T>(key: string): T | null {
  const e = readEmbedded();
  return e && e.key === key ? (e.data as T) : null;
}

/** The page key a page uses for its embedded data. */
export const pageDataKey = {
  report: (slug: string) => `report:${slug}`,
  fund: (fund: string) => `fund:${fund}`,
  division: (division: string) => `division:${division}`,
  trackRecord: () => 'track-record',
  archive: () => 'archive',
};

/** Remove the static copy and show the app. Safe to call any number of times. */
export function releaseStaticPage(): void {
  const d = doc();
  if (!d) return;
  d.getElementById(STATIC_PAGE_ELEMENT_ID)?.remove?.();
  d.getElementById(STATIC_STYLE_ELEMENT_ID)?.remove?.();
}
