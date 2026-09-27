import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { HElement } from 'docx-preview';

// =====================================================================
// A Word document (.docx), shown as pages in the browser.
// ---------------------------------------------------------------------
// Browsers cannot display .docx on their own, and the usual shortcut -
// Microsoft's or Google's online viewer - would mean handing the
// association's members-only templates to a third party through a public
// link. So the document is rendered HERE, by `docx-preview`, which reads
// the file in the browser and lays it out as A4 pages.
//
// FOUR THINGS ARE DONE HERE RATHER THAN LEFT TO THE LIBRARY.
//
// 1. THE TAB STOPS. A CV puts the dates and places on the right margin
//    with a right-aligned tab. The library places tabs by measuring the
//    text once, half a second after rendering, and widening a space by
//    what it measured. If the fonts were not settled at that moment the
//    measurement is wrong, and every date stops short of the margin by an
//    amount that depends on the length of the line. That is what made
//    the dates look ragged. Here the library's measurement is switched
//    off and the tabs are placed after the fonts are ready: a right tab
//    at the margin (every tab in the CV) is pinned to the right edge by
//    CSS, which needs no measurement at all and cannot drift; any other
//    tab is measured once the fonts have loaded.
//
// 2. THE WIDTH. The pages are scaled to fill the width of the preview,
//    up as well as down, so on a wide screen the page is not a narrow
//    strip in a wide grey box. The page around it offers "100%" (the real
//    size of the page, scrolling sideways where it does not fit) and a
//    full view in a large window.
//
// 3. THE WAIT. The document is rendered out of sight and shown only once
//    it is laid out and fitted, so it appears once, at its final size,
//    instead of arriving large and then shrinking.
//
// 4. THE SCALE SURVIVES THE POINTER. The workspace keeps its panels still
//    by removing any `transform` from whatever is under the mouse
//    (`.ws-flat *:hover { transform: none !important }` in index.css). The
//    pages are scaled with a transform, so that rule snapped them back to
//    their unscaled, narrower size the moment the pointer crossed them.
//    The scale is therefore set as an inline `!important` declaration,
//    the one kind a stylesheet `!important` cannot override. Nothing else
//    in the workspace is affected.
//
// The library is loaded only when a preview is opened, so the rest of
// the workspace does not carry it.
// =====================================================================

interface TabStop { position?: string; style?: string; leader?: string }
interface CapturedTab { stops?: TabStop[] | null; span: HTMLElement }
interface Renderer { currentTabs?: CapturedTab[]; defaultTabSize?: string }

/** CSS absolute units: 96px are always 72pt. */
const PX_TO_PT = 0.75;
/** The widest a page is drawn: beyond this, text becomes poster-sized. */
const MAX_SCALE = 1.75;
/** How long to wait for fonts before laying out anyway. */
const FONT_WAIT_MS = 2500;

/**
 * docx-preview's own element factory, written as a plain function.
 *
 * The library builds every element through `this.h(...)`, so a plain
 * function passed as the `h` option is called with the renderer itself as
 * `this`. That is the only way to reach the list of tab stops it collected
 * (`currentTabs`), which is what lets this component place the tabs
 * itself. Apart from noting the renderer, it does exactly what the
 * library's factory does.
 */
function makeFactory(found: { renderer: Renderer | null }) {
  function h(this: unknown, elem: HElement | Node | string): Node {
    if (!found.renderer && this && typeof this === 'object' && 'currentTabs' in this) {
      found.renderer = this as Renderer;
    }
    if (typeof elem === 'string') return document.createTextNode(elem);
    if (elem instanceof Node) return elem;
    const { ns, tagName, className, style, children, ...props } = elem;
    if (tagName === '#fragment') {
      const fragment = document.createDocumentFragment();
      children?.forEach((c) => fragment.appendChild(h.call(this, c)));
      return fragment;
    }
    if (tagName === '#comment') return document.createComment(children ? String(children[0]) : '');
    const result = ns ? document.createElementNS(ns, tagName) : document.createElement(tagName);
    if (className) result.setAttribute('class', className);
    if (style) {
      if (typeof style === 'string') result.setAttribute('style', style);
      else Object.assign((result as HTMLElement).style, style);
    }
    for (const [key, value] of Object.entries(props)) {
      if (value !== undefined) (result as unknown as Record<string, unknown>)[key] = value;
    }
    children?.forEach((c) => result.appendChild(h.call(this, c)));
    return result;
  }
  return h;
}

const pt = (length?: string | null) => (length ? parseFloat(length) : NaN);

/**
 * Place every tab of the rendered document.
 *
 * Positions are read with `getBoundingClientRect` and divided by the
 * paragraph's current scale, so the result is right whether or not the
 * pages are scaled at the time.
 */
function placeTabs(tabs: CapturedTab[], defaultTabPt: number) {
  const measured: CapturedTab[] = [];

  for (const tab of tabs) {
    const span = tab.span;
    const p = span.closest('p');
    if (!p || !span.isConnected) continue;
    const stops = (tab.stops ?? [])
      .map((s) => ({ pos: pt(s.position), style: s.style ?? 'left', leader: s.leader ?? 'none' }))
      .filter((s) => Number.isFinite(s.pos) && s.style !== 'clear')
      .sort((a, b) => a.pos - b.pos);
    const tabsInParagraph = p.querySelectorAll('.docx-tab-stop').length;
    const last = stops[stops.length - 1];
    const cs = getComputedStyle(p);
    const columnPt = (p.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) * PX_TO_PT;

    // THE COMMON CASE, AND THE ONE THAT MUST NOT DRIFT: the only tab of
    // the paragraph, aligned right at (or beyond) the right margin. What
    // follows it is floated to the right edge: no measurement, so no
    // dependence on fonts or timing, exactly as Word lays it out.
    if (tabsInParagraph === 1 && last && last.style === 'right' && stops.length === 1 && last.pos >= columnPt - 1.5) {
      const range = document.createRange();
      range.setStartAfter(span);
      range.setEnd(p, p.childNodes.length);
      const rest = range.extractContents();
      const right = document.createElement('span');
      right.className = 'docx-tab-right';
      right.appendChild(rest);
      span.remove();
      p.appendChild(right);
      p.classList.add('docx-has-right-tab');
      continue;
    }
    measured.push(tab);
  }

  // Everything else: measured, in document order, after the fonts.
  for (const tab of measured) {
    const span = tab.span;
    const p = span.closest('p');
    if (!p) continue;
    span.textContent = '';
    span.style.display = 'inline-block';
    span.style.width = '0';
    const rect = p.getBoundingClientRect();
    const scale = p.offsetWidth ? rect.width / p.offsetWidth : 1;
    const cs = getComputedStyle(p);
    const origin = rect.left - parseFloat(cs.marginLeft) * scale;
    const at = (span.getBoundingClientRect().left - origin) / scale * PX_TO_PT;

    const explicit = (tab.stops ?? [])
      .map((s) => ({ pos: pt(s.position), style: s.style ?? 'left', leader: s.leader ?? 'none' }))
      .filter((s) => Number.isFinite(s.pos) && s.style !== 'clear')
      .sort((a, b) => a.pos - b.pos);
    let stop = explicit.find((s) => s.pos > at + 0.1);
    if (!stop) {
      const step = defaultTabPt > 0 ? defaultTabPt : 36;
      const lastPos = explicit.length ? explicit[explicit.length - 1].pos : 0;
      let pos = Math.max(lastPos, 0);
      while (pos <= at + 0.1) pos += step;
      stop = { pos, style: 'left', leader: 'none' };
    }

    let width = stop.pos - at;
    if (stop.style === 'right' || stop.style === 'center' || stop.style === 'end') {
      // The text that follows, up to the next tab or the end of the paragraph.
      const range = document.createRange();
      range.setStartAfter(span);
      const next = Array.from(p.querySelectorAll('.docx-tab-stop')).find(
        (t) => t !== span && (span.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING),
      );
      if (next) range.setEndBefore(next); else range.setEnd(p, p.childNodes.length);
      const following = range.getBoundingClientRect().width / scale * PX_TO_PT;
      width -= stop.style === 'center' ? following / 2 : following;
    }
    span.style.width = `${Math.max(width, 0)}pt`;
    if (stop.leader === 'dot' || stop.leader === 'middleDot') span.style.borderBottom = '1px dotted currentColor';
    else if (stop.leader === 'hyphen' || stop.leader === 'underscore' || stop.leader === 'heavy') span.style.borderBottom = '1px solid currentColor';
  }
}

/** Wait for the fonts in use, but never for ever. */
async function fontsSettled() {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts?.ready) return;
  await Promise.race([fonts.ready, new Promise((resolve) => setTimeout(resolve, FONT_WAIT_MS))]);
}

export function DocxPreview({ url, title, zoom = 'fit', onFitScale }: {
  url: string | null;
  title: string;
  /** 'fit' fills the width of the preview; 'actual' shows the page at 100%. */
  zoom?: 'fit' | 'actual';
  /** Reports the scale that "fit" uses, so the page can say "Fit (72%)". */
  onFitScale?: (scale: number) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [fitScale, setFitScale] = useState(1);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);

  // Render the document whenever the file changes.
  useEffect(() => {
    let cancelled = false;
    const pages = pagesRef.current;
    if (!url || !pages) { setState('error'); return; }
    setState('loading');
    setNatural(null);
    (async () => {
      try {
        const [{ renderAsync }, response] = await Promise.all([import('docx-preview'), fetch(url)]);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        if (cancelled) return;
        const found: { renderer: Renderer | null } = { renderer: null };
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
          // Needed for the library to COLLECT the tab stops; its own
          // placement of them is cancelled just below.
          experimental: true,
          h: makeFactory(found),
        });
        if (cancelled) return;
        const tabs = found.renderer?.currentTabs ? found.renderer.currentTabs.splice(0) : [];
        await fontsSettled();
        if (cancelled) return;
        placeTabs(tabs, pt(found.renderer?.defaultTabSize));
        const wrapper = pages.querySelector<HTMLElement>('.docx-wrapper');
        if (!wrapper) throw new Error('Nothing was rendered');
        setNatural({ width: wrapper.scrollWidth, height: wrapper.scrollHeight });
        setState('ready');
      } catch (e) {
        console.error('docx preview failed', e);
        if (!cancelled) setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  // Fit the pages to the width of the preview, and keep them fitted.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || state !== 'ready' || !natural) return;
    const refit = () => {
      const available = host.clientWidth;
      if (available > 0 && natural.width > 0) setFitScale(Math.min(MAX_SCALE, available / natural.width));
    };
    refit();
    const ro = new ResizeObserver(refit);
    ro.observe(host);
    return () => ro.disconnect();
  }, [state, natural]);

  const scale = zoom === 'actual' ? 1 : fitScale;
  const ready = state === 'ready' && !!natural;

  // Tell the page what "fit" currently means, for its zoom label.
  useEffect(() => { if (ready) onFitScale?.(fitScale); }, [ready, fitScale, onFitScale]);

  // See 4. above: set outside React's style prop, with priority.
  useLayoutEffect(() => {
    const el = pagesRef.current;
    if (!el) return;
    if (ready) {
      el.style.setProperty('transform', `scale(${scale})`, 'important');
      el.style.setProperty('transform-origin', 'top left', 'important');
    } else {
      el.style.removeProperty('transform');
      el.style.removeProperty('transform-origin');
    }
  }, [ready, scale]);

  return (
    <div ref={hostRef} className="relative w-full min-w-0 min-h-full" aria-label={`Preview of ${title}`}>
      {state === 'loading' && (
        <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Preparing the preview
        </div>
      )}
      {state === 'error' && (
        <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
          <p>The preview could not be shown here. The file itself is fine: download it to open it in Word, Pages or Google Docs.</p>
        </div>
      )}

      {/* The pages. Rendered from the start but kept out of sight (and out
          of the scroll height) until they are laid out and fitted. The
          outer box takes the SCALED size, so the scroll bars measure what
          is seen. */}
      <div
        style={state === 'ready' && natural
          ? { width: zoom === 'actual' ? natural.width : '100%', height: natural.height * scale, overflow: 'hidden', margin: zoom === 'actual' ? '0 auto' : undefined }
          : { position: 'absolute', left: 0, top: 0, width: '100%', height: 0, overflow: 'hidden', visibility: 'hidden' }}
      >
        <div
          ref={pagesRef}
          className="career-docx"
          style={state === 'ready' && natural
            ? { width: natural.width }
            : { width: 'max-content' }}
        />
      </div>

      <style>{`
        .career-docx .docx-wrapper { background: transparent; padding: 12px 12px 0; }
        .career-docx .docx-wrapper > section.docx { margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 12px rgba(0, 0, 0, 0.06); }
        .career-docx p.docx-has-right-tab { display: flow-root; }
        .career-docx .docx-tab-right { float: right; }
      `}</style>
    </div>
  );
}

export default DocxPreview;
