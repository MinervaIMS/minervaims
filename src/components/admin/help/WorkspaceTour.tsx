// =====================================================================
// WorkspaceTour: the guided tour, drawn over the real workspace
// (Step 106).
// ---------------------------------------------------------------------
// The words and the places are in `lib/workspace-tours.ts`. This draws
// them: it opens the page a step is about, dims the screen, leaves a
// clear window round the thing being described and puts a card beside
// it with the step, where it is in the tour, and Back and Next.
//
// IT IS THE READER'S TOUR. It is handed the tour already fitted to the
// reader's role (TourHost, `fitTour`): only the steps about pages they can
// open, in the words for their level.
//
// IT POINTS AT WHAT IS THERE. The place of a step is measured on the
// page as it is drawn, again whenever the page scrolls, resizes or
// finishes loading. A step whose place this reader does not have (a
// role without that button, a phone without that rail) is skipped in
// the direction the reader was going, so a tour never points at nothing.
//
// IT IS DRAWN IN THE PAGE'S OWN PIXELS, outside the workspace's frame:
// the frame is drawn at 90% on a computer (Step 103), and a highlight
// placed from a measured position must not be scaled a second time. So
// the tour is a plain layer in <body>, and deliberately NOT a
// `role="dialog"` that is a direct child of <body>, which the 90% rule
// would shrink; the card inside it is the dialog.
//
// NOTHING IS CHANGED BY A TOUR. While it runs, the page underneath is
// covered: a click outside the card does nothing, so a reader following
// along cannot press a real button by accident. Esc, or the cross,
// leaves at any step.
//
// It is its own chunk, loaded the first time a tour is started.
// =====================================================================
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useIsDesktop } from '@/hooks/use-desktop';
import { markTourDone, stepTargets, type FittedTour } from '@/lib/workspace-tours';

interface Box { left: number; top: number; width: number; height: number }

/**
 * Is this element really drawn? It has a size, and nothing around it is
 * folded to nothing or hidden: the list of a section's pages, folded on a
 * computer, keeps its entries' sizes inside a panel of no width, and a
 * highlight placed from them would land on whatever is under the panel.
 */
function isDrawn(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  if (r.width <= 4 || r.height <= 4) return false;
  for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
    const cs = getComputedStyle(a);
    if (cs.visibility === 'hidden') return false;
    // Only a container that CLIPS what it holds can hide it by having no
    // size; a wrapper with no box of its own, or one that lets its content
    // overflow, hides nothing.
    if (cs.display === 'contents') continue;
    const ar = a.getBoundingClientRect();
    if (cs.overflowX !== 'visible' && ar.width <= 4) return false;
    if (cs.overflowY !== 'visible' && ar.height <= 4) return false;
  }
  return true;
}

/** The element a step points at: the first of its places that is drawn. */
function findTarget(selectors: string[]): HTMLElement | null {
  for (const selector of selectors) {
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
      if (isDrawn(el)) return el;
    }
  }
  return null;
}

const PAD = 6;
const CARD_W = 360;

export default function WorkspaceTour({ tour, onClose }: { tour: FittedTour; onClose: () => void }) {
  const isDesktop = useIsDesktop();
  const phone = !isDesktop;
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  // `settled` is false while a step's page is still opening: the card is
  // held back for that moment rather than drawn in the wrong place.
  const [settled, setSettled] = useState(false);
  const direction = useRef<1 | -1>(1);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(220);
  const reduced = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  // A step whose place this reader does not have (an applicant's offer
  // before there is one) is dropped when it is reached, so the count and
  // the progress bar only ever show the steps the reader is actually given.
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(() => new Set());
  const steps = useMemo(() => tour.steps.filter((s) => !skipped.has(s.id)), [tour, skipped]);
  const step = steps[index];

  const finish = useCallback((completed: boolean) => {
    if (completed) markTourDone(tour.id);
    onClose();
  }, [onClose, tour]);

  // Read by the step effect through a ref: the effect must run when the
  // step changes, not whenever the page around the tour re-renders.
  const finishRef = useRef(finish);
  finishRef.current = finish;

  const move = useCallback((by: 1 | -1) => {
    direction.current = by;
    setIndex((i) => {
      const next = i + by;
      if (next < 0) return i;
      if (next >= steps.length) { finish(true); return i; }
      return next;
    });
  }, [steps.length, finish]);

  // Open the step's page, then find its place. A place that never turns
  // up within a moment is one this reader does not have: move on.
  useEffect(() => {
    if (!step) return undefined;
    setSettled(false);
    setBox(null);
    if (step.go) {
      window.dispatchEvent(new CustomEvent('minerva:navigate', { detail: { section: step.go.section, sub: step.go.sub ?? undefined } }));
    }
    const selectors = stepTargets(step, phone);
    let tries = 0;
    let scrolled = false;
    let timer = 0;
    const measure = () => {
      const el = findTarget(selectors);
      if (!el) return false;
      if (!scrolled) {
        scrolled = true;
        el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' as ScrollBehavior });
      }
      const r = el.getBoundingClientRect();
      setBox({ left: r.left, top: r.top, width: r.width, height: r.height });
      return true;
    };
    const tick = () => {
      if (!selectors.length) { setSettled(true); return; }
      if (measure()) { setSettled(true); return; }
      tries += 1;
      // About two and a half seconds after opening a page; under half a
      // second on the page already open, which has drawn what it has: a page
      // that needs longer than that to show this part is not going to show
      // it to this reader.
      if (tries > (step.go ? 16 : 3)) {
        // The steps right after it that are about the same open page and are
        // missing too (an applicant's interview, call and offer before any
        // invitation) go with it, at once, rather than one wait each.
        const dir = direction.current;
        const gone = new Set([step.id]);
        let j = index + dir;
        while (j >= 0 && j < steps.length) {
          const s = steps[j];
          const sel = stepTargets(s, phone);
          if (s.go || !sel.length || findTarget(sel)) break;
          gone.add(s.id);
          j += dir;
        }
        const kept = steps.filter((s) => !gone.has(s.id));
        if (!kept.length) { finishRef.current(false); return; }
        if (j >= steps.length) { finishRef.current(true); return; }
        // The step reached takes its place in the shorter list.
        const next = j < 0 ? 0 : kept.findIndex((s) => s.id === steps[j].id);
        setSkipped((prev) => new Set([...prev, ...gone]));
        setIndex(Math.max(0, next));
        return;
      }
      timer = window.setTimeout(tick, 150);
    };
    // One frame for the navigation to take effect before looking.
    timer = window.setTimeout(tick, step.go ? 220 : 30);
    const follow = () => { if (selectors.length) measure(); };
    window.addEventListener('scroll', follow, true);
    window.addEventListener('resize', follow);
    const keep = window.setInterval(follow, 400);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(keep);
      window.removeEventListener('scroll', follow, true);
      window.removeEventListener('resize', follow);
    };
  }, [step, index, phone, steps]);

  // Keys: Esc leaves, the arrows and Enter move. In the capture phase, so
  // nothing underneath acts on them first.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); move(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); move(-1); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [finish, move]);

  // The card takes the focus at each step, so a screen reader reads the
  // step and the keys land here.
  useEffect(() => { if (settled) cardRef.current?.focus({ preventScroll: true }); }, [settled, index]);
  useLayoutEffect(() => { if (cardRef.current) setCardHeight(cardRef.current.offsetHeight); }, [settled, index, box]);

  if (!step || typeof document === 'undefined') return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // On a phone the card sits across the screen, above or below the thing it
  // describes. A thing taller than the room that leaves (a whole list) is
  // shown by its first part, so the card never lies over what it points at.
  const tallest = phone ? vh * 0.42 : vh;
  const hole = box
    ? { left: Math.max(0, box.left - PAD), top: Math.max(0, box.top - PAD), width: Math.min(vw, box.width + PAD * 2), height: Math.min(tallest, box.height + PAD * 2) }
    : null;

  // Where the card goes. On a phone: across the screen, at the foot, or at
  // the top when the thing it describes is in the lower half. On a
  // computer: beside the highlight where there is room (right, left, then
  // below, then above), otherwise in the middle.
  let cardStyle: React.CSSProperties;
  if (phone) {
    const low = hole ? hole.top + hole.height / 2 > vh / 2 : false;
    cardStyle = { left: 12, right: 12, ...(low ? { top: 'calc(env(safe-area-inset-top) + 12px)' } : { bottom: 'calc(env(safe-area-inset-bottom) + 12px)' }) };
  } else if (hole) {
    const gap = 14;
    const clampTop = (t: number) => Math.max(16, Math.min(t, vh - cardHeight - 16));
    const clampLeft = (l: number) => Math.max(16, Math.min(l, vw - CARD_W - 16));
    if (hole.left + hole.width + gap + CARD_W <= vw - 16) cardStyle = { left: hole.left + hole.width + gap, top: clampTop(hole.top) };
    else if (hole.left - gap - CARD_W >= 16) cardStyle = { left: hole.left - gap - CARD_W, top: clampTop(hole.top) };
    else if (hole.top + hole.height + gap + cardHeight <= vh - 16) cardStyle = { left: clampLeft(hole.left), top: hole.top + hole.height + gap };
    else if (hole.top - gap - cardHeight >= 16) cardStyle = { left: clampLeft(hole.left), top: hole.top - gap - cardHeight };
    else cardStyle = { left: clampLeft(vw - CARD_W - 24), top: clampTop(vh - cardHeight - 24) };
  } else {
    cardStyle = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
  }

  const last = index === steps.length - 1;
  const titleId = `ws-tour-title-${tour.id}`;
  const bodyId = `ws-tour-body-${tour.id}`;

  return createPortal(
    // `data-ro`: the tour is the workspace's, not the page's, so a page the
    // reader can only read must not grey out its Back, Next and cross
    // (ReadOnlyRegion sweeps every open dialog, and the card is one).
    <div data-ws-tour data-ro className="fixed inset-0 z-[120] font-body">
      {/* The dim. With a place to show, it is the shadow of a clear window
          round that place; without one, it covers the screen. Either way a
          click on it does nothing: see the header. */}
      {hole ? (
        <>
          <div className="absolute inset-0" aria-hidden="true" />
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute rounded-md ring-2 ring-background ${reduced ? '' : 'transition-all duration-200 ease-out'}`}
            style={{ left: hole.left, top: hole.top, width: hole.width, height: hole.height, boxShadow: '0 0 0 200vmax hsl(var(--overlay) / 0.58)' }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-overlay/60" aria-hidden="true" />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        className={`absolute border border-accent bg-background text-foreground shadow-[0_24px_60px_-20px_hsl(var(--overlay)/0.5)] outline-none ${phone ? '' : ''} ${settled ? 'opacity-100' : 'pointer-events-none opacity-0'} ${reduced ? '' : 'transition-opacity duration-150'}`}
        style={{ ...cardStyle, ...(phone ? {} : { width: CARD_W }) }}
      >
        <div className="flex items-start justify-between gap-3 bg-accent px-5 py-3 text-accent-foreground">
          <div className="min-w-0">
            <div className="text-xs text-accent-foreground/75">{tour.title} · {index + 1} of {steps.length}</div>
            <h2 id={titleId} className="font-serif text-xl leading-snug">{step.title}</h2>
          </div>
          <button
            type="button"
            onClick={() => finish(false)}
            aria-label="Leave the tour"
            className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center text-accent-foreground/85 hover:text-accent-foreground"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="px-5 py-4">
          <p id={bodyId} aria-live="polite" className="text-[15px] leading-relaxed text-foreground/85">{step.body}</p>
          {/* Where the reader is in the tour, at a glance. */}
          <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
            {steps.map((s, i) => (
              <span key={s.id} className={`h-1 flex-1 ${i <= index ? 'bg-accent' : 'bg-separator'}`} />
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => move(-1)}
              disabled={index === 0}
              className="h-11 border border-accent px-4 text-sm text-accent disabled:cursor-not-allowed disabled:border-separator disabled:text-muted-foreground"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              className="h-11 flex-1 bg-accent px-4 text-sm text-accent-foreground hover:bg-accent/90 sm:flex-none sm:min-w-[7.5rem]"
            >
              {last ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
