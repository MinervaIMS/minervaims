// =====================================================================
// Word documents fetched for a preview, kept by their address while the
// page is open (the latest few), so a page with two documents (CV &
// Cover Letter) can fetch the second while the first is read and show it
// at once when its tab is chosen. See DocxPreview.tsx.
// =====================================================================

/** Documents already fetched, by address; the latest few are kept. */
const FETCHED = new Map<string, Promise<Blob>>();
const FETCHED_MAX = 4;

export function fetchDocx(url: string): Promise<Blob> {
  const known = FETCHED.get(url);
  if (known) return known;
  const p = fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.blob();
  });
  // A failed fetch is forgotten, so the next attempt tries again.
  p.catch(() => FETCHED.delete(url));
  FETCHED.set(url, p);
  while (FETCHED.size > FETCHED_MAX) FETCHED.delete(FETCHED.keys().next().value as string);
  return p;
}

/** Fetch a document ahead of time, so its preview opens at once. Errors are left for the preview to report. */
export function prefetchDocx(url: string): void {
  fetchDocx(url).catch(() => undefined);
}

