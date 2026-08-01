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

export function useReportCovers(urls: string[] | null): string[] {
  const key = (urls ?? []).join('|');
  const [covers, setCovers] = useState<string[]>([]);

  useEffect(() => {
    if (!urls || urls.length === 0) { setCovers([]); return; }
    let active = true;

    // Anything already rendered in this session paints immediately.
    const known = urls.map((u) => cache.get(u)).filter((v): v is string => !!v);
    if (known.length) setCovers(known);

    (async () => {
      let pdfjs: Awaited<ReturnType<typeof loadPdfJs>>;
      try {
        pdfjs = await loadPdfJs();
      } catch {
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
    })();

    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return covers;
}

export default useReportCovers;
