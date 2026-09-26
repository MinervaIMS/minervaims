import { useEffect, useRef, useState } from 'react';
import { Loader2, FileWarning } from 'lucide-react';

// =====================================================================
// A Word document (.docx), shown as pages in the browser.
// ---------------------------------------------------------------------
// Browsers cannot display .docx on their own, and the usual shortcut -
// Microsoft's or Google's online viewer - would mean handing the
// association's members-only templates to a third party through a public
// link. So the document is rendered HERE, by `docx-preview`, which reads
// the file in the browser and lays it out as A4 pages: the fonts, bold
// and italics, tabs, bullets, tables, headers and footers of the file.
//
// THE PAGES KEEP THEIR SIZE AND ARE SCALED TO THE COLUMN. A page is
// 21 cm wide; the preview column is narrower on a laptop and much
// narrower on a phone. Rather than let the text re-flow (which would no
// longer show the template as it prints), the rendered pages are scaled
// down as a whole to fit the column, and the column scrolls.
//
// On a phone a fitted page is small, so `fit={false}` shows it at its real
// size instead, and the scrolling box around it scrolls sideways as well.
//
// The library is loaded only when a preview is opened, so the rest of
// the workspace does not carry it.
// =====================================================================

export function DocxPreview({ url, title, fit = true }: { url: string | null; title: string; fit?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | null>(null);

  // Render the document whenever the file changes.
  useEffect(() => {
    let cancelled = false;
    const pages = pagesRef.current;
    if (!url || !pages) { setState('error'); return; }
    setState('loading');
    // Lay the pages out at their real size while they render: see below.
    setScale(1);
    setHeight(null);
    (async () => {
      try {
        const [{ renderAsync }, response] = await Promise.all([
          import('docx-preview'),
          fetch(url),
        ]);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        if (cancelled) return;
        pages.innerHTML = '';
        await renderAsync(blob, pages, undefined, {
          className: 'docx',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
          renderComments: false,
          useBase64URL: true,
          experimental: true,
        });
        // With `experimental`, the library places the tab stops (the dates
        // and places pushed to the right margin) half a second after the
        // pages appear, by measuring them on screen. The measuring must see
        // the pages unscaled, so the fitting waits until it is done.
        await new Promise((resolve) => setTimeout(resolve, 700));
        if (!cancelled) setState('ready');
      } catch (e) {
        console.error('docx preview failed', e);
        if (!cancelled) setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  // Fit the pages to the column, and keep them fitted when it resizes.
  useEffect(() => {
    const host = hostRef.current; const pages = pagesRef.current;
    if (!host || !pages || state !== 'ready') return;
    const refit = () => {
      const wrapper = pages.querySelector<HTMLElement>('.docx-wrapper');
      if (!wrapper) return;
      // The natural width of the widest page, plus the wrapper's own padding.
      const natural = Math.max(...Array.from(wrapper.querySelectorAll<HTMLElement>('section.docx')).map((s) => s.offsetWidth), 1)
        + parseFloat(getComputedStyle(wrapper).paddingLeft) + parseFloat(getComputedStyle(wrapper).paddingRight);
      const available = host.clientWidth;
      const s = fit ? Math.min(1, available / natural) : 1;
      setScale(s);
      setHeight(wrapper.scrollHeight * s);
    };
    refit();
    const ro = new ResizeObserver(refit);
    ro.observe(host);
    return () => ro.disconnect();
  }, [state, fit]);

  return (
    <div ref={hostRef} className="relative w-full min-w-0" aria-label={`Preview of ${title}`}>
      {state === 'loading' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-muted/40 text-muted-foreground font-body text-sm min-h-[240px]">
          <Loader2 className="h-5 w-5 animate-spin" />
          Preparing the preview
        </div>
      )}
      {state === 'error' && (
        <div className="flex flex-col items-center justify-center gap-2 py-16 px-6 text-center text-muted-foreground font-body text-sm">
          <FileWarning className="h-6 w-6" />
          <p>The preview could not be shown here. The file itself is fine: download it to open it in Word, Pages or Google Docs.</p>
        </div>
      )}
      {/* The rendered pages, at their real size, scaled to the column. The outer
          box takes the SCALED height, so the scroll bar measures what is seen. */}
      <div
        style={{ height: state === 'ready' && height ? height : undefined, overflow: fit ? 'hidden' : 'visible' }}
        className={state === 'error' ? 'hidden' : ''}
      >
        <div
          ref={pagesRef}
          className="career-docx origin-top-left"
          style={{ transform: `scale(${scale})`, width: scale < 1 ? `${100 / scale}%` : fit ? '100%' : 'max-content', minWidth: '100%' }}
        />
      </div>
    </div>
  );
}

export default DocxPreview;
