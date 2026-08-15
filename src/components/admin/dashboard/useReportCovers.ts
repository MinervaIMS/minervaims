import { useEffect, useMemo, useState } from 'react';
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
const RENDER_WIDTH = 120;
const A4 = 1.414;
/**
 * How long the whole page will wait for the covers. It is a backstop, not
 * a budget: with the requests in parallel and the session cache in front
 * of them the usual answer is far quicker. Anything still outstanding
 * when it fires is used on the next visit rather than dropped into a
 * running animation.
 */
const CAP_MS = 1600;
/**
 * How many are drawn at once. Fetching is I/O and wants to be parallel;
 * RASTERISING is main-thread work and does not, because six page renders
 * competing for the same thread is what makes the loader's own pulse
 * stutter while it waits. Three keeps the network busy and leaves the
 * thread enough room to keep painting.
 */
const CONCURRENCY = 3;

const cache = new Map<string, string>();

const NONE: string[] = [];

/**
 * `ready` is what the loader waits on. It turns true when the covers for
 * THE CURRENT LIST have been drawn, when there are none to draw, or when a
 * cap elapses, so a slow or unreachable PDF can delay a decoration but can
 * never hold the whole Dashboard behind the loader.
 *
 * READINESS IS A FACT ABOUT A PARTICULAR LIST, AND IT IS COMPUTED DURING
 * RENDER. This is the whole of the Dashboard's opening fault. The hook is
 * called with `null` on the first render, because the archive query has not
 * answered yet; the old version treated that as "nothing to draw", set
 * `ready` to true and never set it back to false when the real list of six
 * PDFs arrived. So the gate in WorkspaceDashboard - which exists precisely
 * so that the page appears complete or not at all - was already satisfied
 * by the time the data landed. The loader lifted, the Reports card mounted
 * with an EMPTY cover list and therefore drew nothing at all, and up to a
 * second and a half later six covers appeared and the columns started from
 * their first frame in front of the reader.
 *
 * Deriving `ready` from a stored key rather than from a separate piece of
 * state fixes it without introducing the opposite fault: a flag reset
 * inside an effect would leave one painted frame in which the page had
 * already been declared ready, which is a flash of the whole Dashboard
 * between two showings of the loader. Comparing keys during render means
 * the answer is right in the same render that the new list arrives.
 */
export function useReportCovers(urls: string[] | null): { covers: string[]; ready: boolean } {
  const key = (urls ?? []).join('|');
  const [done, setDone] = useState<{ key: string; covers: string[] } | null>(null);

  // A SECOND VISIT COSTS NOTHING, and costs no render either: everything
  // already drawn in this session is in the module cache, so the answer is
  // available during the first render rather than an effect later.
  const cached = useMemo(() => {
    if (key === '') return NONE;
    const known = key.split('|').map((u) => cache.get(u));
    return known.every((v): v is string => !!v) ? (known as string[]) : null;
  }, [key]);

  const ready = cached !== null || done?.key === key;
  const covers = cached ?? (done?.key === key ? done.covers : NONE);

  useEffect(() => {
    if (!urls || urls.length === 0) return;
    // Already answered for this list, from the cache or from a previous run.
    if (cache.get(urls[0]) && urls.every((u) => cache.get(u))) return;
    let active = true;

    const publish = (list: string[]) => { if (active) setDone({ key, covers: list }); };

    const cap = window.setTimeout(() => {
      if (!active) return;
      publish(urls.map((u) => cache.get(u)).filter((v): v is string => !!v));
    }, CAP_MS);

    (async () => {
      let pdfjs: Awaited<ReturnType<typeof loadPdfJs>>;
      try {
        pdfjs = await loadPdfJs();
      } catch {
        // No renderer: the card draws without covers rather than holding the
        // page. It still publishes, so `ready` is answered for this list.
        window.clearTimeout(cap);
        publish(NONE);
        return;
      }

      // A small pool rather than one big `Promise.all`: `next` hands out
      // the queue index, so three workers walk the list together and the
      // results still land in the archive's own order.
      const drawn: (string | null)[] = new Array(urls.length).fill(null);
      let next = 0;
      const draw = async (url: string): Promise<string | null> => {
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
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urls.length) }, async () => {
        for (let i = next++; i < urls.length; i = next++) {
          if (!active) return;
          drawn[i] = await draw(urls[i]);
        }
      }));

      if (!active) return;
      window.clearTimeout(cap);
      // ONE PUBLICATION, in the archive's own order. Painting them as they
      // landed changed the stack under an animation that had already
      // started.
      publish(drawn.filter((v): v is string => !!v));
    })();

    return () => { active = false; window.clearTimeout(cap); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { covers, ready };
}

export default useReportCovers;
