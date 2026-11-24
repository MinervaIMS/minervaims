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
//
// HOW IT READS (Step 107). The window round the thing described is drawn
// with an accent edge inside a white one, and a slow white pulse, so the eye
// finds it at once on any page; on a computer the card has a small point
// towards it. On a phone the card is a sheet at the foot of the screen,
// always in the same place, under the thumb, and the page is scrolled so
// the thing described sits in the room above the sheet (the sheet moves to
// the top only for something fixed at the foot, such as the dock); a
// swipe on the sheet moves to the next or the previous step.
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

/** A rectangle with rounded corners, as an SVG path (drawn the other way round, so it cuts a window). */
function roundedRect(b: Box, r: number): string {
  const x = b.left, y = b.top, w = b.width, h = b.height;
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  return `M${x + k} ${y}A${k} ${k} 0 0 0 ${x} ${y + k}V${y + h - k}A${k} ${k} 0 0 0 ${x + k} ${y + h}H${x + w - k}A${k} ${k} 0 0 0 ${x + w} ${y + h - k}V${y + k}A${k} ${k} 0 0 0 ${x + w - k} ${y}Z`;
}
// The room a phone's sheet leaves above itself, and the top bar's height.
const PHONE_TOP = 64;
const SHEET_GAP = 16;

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
  // The sheet's last height, for the scroll that makes room above it.
  const sheetHeightRef = useRef(230);
  sheetHeightRef.current = cardHeight;
  const swipe = useRef<{ x: number; y: number } | null>(null);
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
        // On a phone the sheet covers the foot of the screen: the thing
        // described is brought into the room above it (its top, when it
        // is taller than that room), by lending it margins for the scroll.
        const before = { top: el.style.scrollMarginTop, bottom: el.style.scrollMarginBottom };
        let block: ScrollLogicalPosition = 'center';
        if (phone) {
          const room = window.innerHeight - PHONE_TOP - sheetHeightRef.current - SHEET_GAP * 2;
          el.style.scrollMarginTop = `${PHONE_TOP + SHEET_GAP}px`;
          el.style.scrollMarginBottom = `${sheetHeightRef.current + SHEET_GAP}px`;
          if (el.getBoundingClientRect().height > room * 0.9) block = 'start';
        }
        el.scrollIntoView({ block, inline: 'nearest', behavior: 'instant' as ScrollBehavior });
        el.style.scrollMarginTop = before.top;
        el.style.scrollMarginBottom = before.bottom;
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
  // On a phone the card is a sheet at the foot; a thing taller than the
  // room above it is shown by its first part, so the sheet never lies over
  // what it points at.
  const tallest = phone ? Math.max(120, vh - PHONE_TOP - cardHeight - SHEET_GAP * 3) : vh;
  const hole = box
    ? { left: Math.max(0, box.left - PAD), top: Math.max(0, box.top - PAD), width: Math.min(vw, box.width + PAD * 2), height: Math.min(tallest, box.height + PAD * 2) }
    : null;

  // Where the card goes. On a phone: the sheet at the foot, or at the top
  // when the thing described is fixed at the foot (the dock) and would be
  // under it. On a computer: beside the highlight where there is room
  // (right, left, then below, then above), otherwise in the corner; with a
  // small point towards the highlight.
  let cardStyle: React.CSSProperties;
  let pointer: { side: 'left' | 'right' | 'top' | 'bottom'; at: number } | null = null;
  if (phone) {
    const underSheet = hole ? hole.top + hole.height > vh - cardHeight - SHEET_GAP * 2 : false;
    cardStyle = { left: 8, right: 8, ...(underSheet ? { top: 'calc(env(safe-area-inset-top) + 8px)' } : { bottom: 'calc(env(safe-area-inset-bottom) + 8px)' }) };
  } else if (hole) {
    const gap = 16;
    const clampTop = (t: number) => Math.max(16, Math.min(t, vh - cardHeight - 16));
    const clampLeft = (l: number) => Math.max(16, Math.min(l, vw - CARD_W - 16));
    const midY = hole.top + Math.min(hole.height, vh) / 2;
    const midX = hole.left + hole.width / 2;
    if (hole.left + hole.width + gap + CARD_W <= vw - 16) {
      const top = clampTop(midY - cardHeight / 2);
      cardStyle = { left: hole.left + hole.width + gap, top };
      pointer = { side: 'left', at: Math.max(18, Math.min(cardHeight - 18, midY - top)) };
    } else if (hole.left - gap - CARD_W >= 16) {
      const top = clampTop(midY - cardHeight / 2);
      cardStyle = { left: hole.left - gap - CARD_W, top };
      pointer = { side: 'right', at: Math.max(18, Math.min(cardHeight - 18, midY - top)) };
    } else if (hole.top + hole.height + gap + cardHeight <= vh - 16) {
      const left = clampLeft(midX - CARD_W / 2);
      cardStyle = { left, top: hole.top + hole.height + gap };
      pointer = { side: 'top', at: Math.max(18, Math.min(CARD_W - 18, midX - left)) };
    } else if (hole.top - gap - cardHeight >= 16) {
      const left = clampLeft(midX - CARD_W / 2);
      cardStyle = { left, top: hole.top - gap - cardHeight };
      pointer = { side: 'bottom', at: Math.max(18, Math.min(CARD_W - 18, midX - left)) };
    } else cardStyle = { left: clampLeft(vw - CARD_W - 24), top: clampTop(vh - cardHeight - 24) };
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
          {/* The dim, with the window cut out of it: an SVG path, the way
              dedicated tour tools draw it, which every browser paints the
              same (a shadow thousands of pixels wide, as before, was drawn
              faintly or not at all by some). */}
          <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" width={vw} height={vh}>
            <path fillRule="evenodd" style={{ fill: 'hsl(var(--overlay) / 0.62)' }} d={`M0 0H${vw}V${vh}H0Z ${roundedRect(hole, 6)}`} />
          </svg>
          {/* The window's edge: the accent, then a white edge that stands
              out on the dim. */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute rounded-md ${reduced ? '' : 'transition-all duration-200 ease-out'}`}
            style={{ left: hole.left, top: hole.top, width: hole.width, height: hole.height, boxShadow: '0 0 0 2px hsl(var(--accent)), 0 0 0 4px hsl(var(--background))' }}
          />
          {/* One slow pulse round it at each step, to lead the eye there
              (none under reduced motion). */}
          {!reduced && settled && (
            <div
              key={`pulse-${step.id}`}
              aria-hidden="true"
              className="ws-tour-pulse pointer-events-none absolute rounded-md"
              style={{ left: hole.left, top: hole.top, width: hole.width, height: hole.height }}
            />
          )}
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
        onTouchStart={(e) => { const t = e.touches[0]; swipe.current = t ? { x: t.clientX, y: t.clientY } : null; }}
        onTouchEnd={(e) => {
          const from = swipe.current; const t = e.changedTouches[0]; swipe.current = null;
          if (!from || !t) return;
          const dx = t.clientX - from.x, dy = t.clientY - from.y;
          // A clear sideways swipe on the card: left for the next step, right for the previous one.
          if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1);
        }}
        className={`absolute border border-accent bg-background text-foreground shadow-[0_24px_60px_-20px_hsl(var(--overlay)/0.5)] outline-none ${settled ? 'opacity-100' : 'pointer-events-none opacity-0'} ${reduced ? '' : 'transition-opacity duration-150'}`}
        style={{ ...cardStyle, ...(phone ? { maxHeight: '46vh', display: 'flex', flexDirection: 'column' } : { width: CARD_W }) }}
      >
        {/* The point towards the highlight (computer). */}
        {pointer && (
          <span
            aria-hidden="true"
            className="absolute h-3 w-3 rotate-45 border-accent bg-background"
            style={pointer.side === 'left' ? { left: -7, top: pointer.at - 6, borderLeftWidth: 1, borderBottomWidth: 1 }
              : pointer.side === 'right' ? { right: -7, top: pointer.at - 6, borderRightWidth: 1, borderTopWidth: 1 }
              : pointer.side === 'top' ? { top: -7, left: pointer.at - 6, borderLeftWidth: 1, borderTopWidth: 1 }
              : { bottom: -7, left: pointer.at - 6, borderRightWidth: 1, borderBottomWidth: 1 }}
          />
        )}
        <div className={`flex items-center justify-between gap-3 border-b border-separator ${phone ? 'px-4 pt-2 pb-2' : 'px-5 pt-3 pb-2.5'}`}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="shrink-0 font-medium text-accent">{index + 1} of {steps.length}</span>
              <span className="truncate">{tour.title}</span>
            </div>
            {/* Where the reader is in the tour, at a glance. */}
            <div className="mt-1.5 flex items-center gap-1" aria-hidden="true">
              {steps.map((s, i) => (
                <span key={s.id} className={`h-1 flex-1 ${i <= index ? 'bg-accent' : 'bg-separator'}`} />
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => finish(false)}
            aria-label="Leave the tour"
            className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground hover:text-accent"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className={`${phone ? 'min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-3' : 'px-5 py-4'}`}>
          <h2 id={titleId} className="font-serif text-xl leading-snug text-accent">{step.title}</h2>
          <p id={bodyId} aria-live="polite" className="mt-1.5 text-[15px] leading-relaxed text-foreground/85">{step.body}</p>
          <div className={`flex items-center justify-between gap-3 ${phone ? 'mt-3' : 'mt-4'}`}>
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
          {!phone && <p className="mt-2.5 text-[11px] text-muted-foreground">The arrow keys move between the steps; Esc leaves the tour.</p>}
          {phone && steps.length > 1 && <p className="mt-2 text-center text-[11px] text-muted-foreground">Swipe the card to move between the steps.</p>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
