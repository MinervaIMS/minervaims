import { useEffect, useState } from 'react';
import { loadPdfJs } from '@/lib/pdfjs';

// =====================================================================
// useReportCovers — the first page of each report, once, as an image.
// ---------------------------------------------------------------------
// The Reports card scrolls real covers, and a scrolling loop needs each
// cover on screen more than once. Mounting a PDF-rendering component per
// copy would fetch the same file several times and rasterise it again on
// every wrap, which is exactly the kind of work that shows up as dropped
// frames.
//
// So each PDF is fetched ONCE, its first page drawn to an offscreen
// canvas, and the result handed back as a data URL. From that point the
// card is showing plain <img> elements: the loop is a single composited
// transform and costs nothing per frame.
//
// THE SIX ARE FETCHED ALL AT ONCE. They used to be awaited one after
// another, so the Dashboard's loader sat behind six round trips in
// series; six parallel requests finish in roughly the time of the
// slowest one, which is most of a second off the opening of the page.
//
// A cover that fails to render is simply absent. The card draws with
// whatever came back and never shows a placeholder standing in for a
// document that does not exist.
// =====================================================================

/** Width in device pixels. Small: these are thumbnails behind a number. */
const RENDER_WIDTH = 132;
const A4 = 1.414;
/**
 * How long the whole page will wait for the covers. It is a backstop, not
 * a budget: with the requests in parallel and the session cache in front
 * of them the usual answer is far quicker. Anything still outstanding
 * when it fires is used on the next visit rather than dropped into a
 * running animation.
 */
const CAP_MS = 1600;

const cache = new Map<string, string>();

/**
 * `ready` is what the loader waits on. It turns true when the covers have
 * been drawn, when there were none to draw, or when a cap elapses, so a
 * slow or unreachable PDF can delay a decoration but can never hold the
 * whole Dashboard behind the loader.
 */
export function useReportCovers(urls: string[] | null): { covers: string[]; ready: boolean } {
  const key = (urls ?? []).join('|');
  const [covers, setCovers] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!urls || urls.length === 0) { setCovers([]); setReady(true); return; }
    let active = true;

    // A SECOND VISIT COSTS NOTHING. Everything already drawn in this
    // session is in the cache, so the page opens without waiting at all.
    const known = urls.map((u) => cache.get(u));
    if (known.every((v): v is string => !!v)) {
      setCovers(known as string[]);
      setReady(true);
      return () => { active = false; };
    }

    const cap = window.setTimeout(() => {
      if (!active) return;
      setCovers(urls.map((u) => cache.get(u)).filter((v): v is string => !!v));
      setReady(true);
    }, CAP_MS);

    (async () => {
      let pdfjs: Awaited<ReturnType<typeof loadPdfJs>>;
      try {
        pdfjs = await loadPdfJs();
      } catch {
        if (active) { window.clearTimeout(cap); setReady(true); }
        return;
      }

      const drawn = await Promise.all(urls.map(async (url) => {
        const hit = cache.get(url);
        if (hit) return hit;
        try {
          const pdf = await pdfjs.getDocument({ url, disableRange: true, disableStream: true }).promise;
          const page = await pdf.getPage(1);
          const base = page.getViewport({ scale: 1 });
          const scale = Math.min(RENDER_WIDTH / base.width, (RENDER_WIDTH * A4) / base.height);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.floor(viewport.width));
          canvas.height = Math.max(1, Math.floor(viewport.height));
          const ctx = canvas.getContext('2d');
          if (!ctx) return null;
          await page.render({ canvasContext: ctx, viewport }).promise;
          const data = canvas.toDataURL('image/png');
          cache.set(url, data);
          return data;
        } catch {
          // A cover that cannot be drawn is left out, never faked.
          return null;
        }
      }));

      if (!active) return;
      window.clearTimeout(cap);
      // ONE PUBLICATION, in the archive's own order. Painting them as they
      // landed changed the stack under an animation that had already
      // started.
      setCovers(drawn.filter((v): v is string => !!v));
      setReady(true);
    })();

    return () => { active = false; window.clearTimeout(cap); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { covers, ready };
}

export default useReportCovers;
