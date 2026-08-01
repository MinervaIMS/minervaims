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
// A cover that fails to render is simply absent. The card draws with
// whatever came back and never shows a placeholder standing in for a
// document that does not exist.
// =====================================================================

/** Width in device pixels. Small: these are thumbnails behind a number. */
const RENDER_WIDTH = 132;
const A4 = 1.414;

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
    const cap = window.setTimeout(() => { if (active) setReady(true); }, 2500);

    // Anything already rendered in this session paints immediately.
    const known = urls.map((u) => cache.get(u)).filter((v): v is string => !!v);
    if (known.length) setCovers(known);
    if (known.length === urls.length) setReady(true);

    (async () => {
      let pdfjs: Awaited<ReturnType<typeof loadPdfJs>>;
      try {
        pdfjs = await loadPdfJs();
      } catch {
        if (active) setReady(true);
        return;
      }
      const out: string[] = [];
      for (const url of urls) {
        if (!active) return;
        const hit = cache.get(url);
        if (hit) { out.push(hit); continue; }
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
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport }).promise;
          const data = canvas.toDataURL('image/png');
          cache.set(url, data);
          out.push(data);
          // Paint each cover as it arrives rather than waiting for the set.
          if (active) setCovers([...out]);
        } catch {
          // A cover that cannot be drawn is left out, never faked.
        }
      }
      if (active) setReady(true);
    })();

    return () => { active = false; window.clearTimeout(cap); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { covers, ready };
}

export default useReportCovers;
