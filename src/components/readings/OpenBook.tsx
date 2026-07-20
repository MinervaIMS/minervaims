import { useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { readingAuthorLine, readingTypeLabels, type Reading } from './types';

// =====================================================================
// The reader: a book lifted from its shelf slot, flown to centre stage,
// rotated to face the viewer and opened into a two-page spread, all as
// one continuous, reversible GSAP timeline. Turning pages cycles through
// the current filtered set (looping), driven by the on-screen arrows,
// the Left/Right keys or a horizontal swipe.
//
// The 3D model is a CSS cuboid: front cover (on a pivot hinged at the
// spine), back cover, spine face and a right-page block. While it flies
// from the shelf it is represented by a flat spine proxy whose target
// rectangle equals the PROJECTED size of the 3D spine, so the swap
// between the two is seamless.
//
// Mobile (below md) gets a full-screen panel with the same navigation
// instead of the 3D case. prefers-reduced-motion swaps every move for a
// plain cross-fade. All text is real, selectable DOM text.
// =====================================================================

const SOFT = 'hsl(var(--accent-soft))';
const PERSPECTIVE = 1800;
const SPINE = 34; // 3D spine thickness in px

interface Props {
  readings: Reading[];
  index: number;
  originRect: DOMRect | null;
  mobile: boolean;
  reducedMotion: boolean;
  onNavigate: (index: number) => void;
  onClose: () => void;
}

export default function OpenBook({ readings, index, originRect, mobile, reducedMotion, onNavigate, onClose }: Props) {
  const total = readings.length;
  const current = readings[index];

  // Mode is captured once per open: the overlay never switches layout mid-flight.
  const mode = useRef({ mobile, reduced: reducedMotion }).current;

  // Book geometry, computed once from the viewport at open time.
  const geom = useRef<{ H: number; C: number; k: number } | null>(null);
  if (!geom.current) {
    const H = Math.min(460, Math.round(window.innerHeight * 0.68));
    const C = Math.max(210, Math.min(Math.round(H * 0.66), Math.round((window.innerWidth - 150) / 2)));
    geom.current = { H, C, k: PERSPECTIVE / (PERSPECTIVE - C / 2) };
  }
  const { H, C, k } = geom.current;

  const rootRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const proxyRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const leafRef = useRef<HTMLDivElement>(null);
  const leftContentRef = useRef<HTMLDivElement>(null);
  const rightContentRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const mobileContentRef = useRef<HTMLDivElement>(null);

  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const closingRef = useRef(false);
  const turningRef = useRef(false);
  const swipeX = useRef<number | null>(null);

  // Keep the latest props reachable from GSAP callbacks.
  const indexRef = useRef(index);
  indexRef.current = index;
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // ---- entrance -------------------------------------------------------
  useLayoutEffect(() => {
    closeBtnRef.current?.focus();

    if (mode.mobile) {
      gsap.fromTo(rootRef.current, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: mode.reduced ? 0 : 0.26, ease: 'power3.out' });
      return;
    }

    const box = boxRef.current!;
    const cover = coverRef.current!;
    const proxy = proxyRef.current!;
    gsap.set(cover, { z: SPINE / 2 });
    gsap.set(leafRef.current, { z: SPINE / 2 + 1, opacity: 0 });

    if (mode.reduced || !originRect) {
      // No choreography: appear already open, with a short fade.
      gsap.set(proxy, { opacity: 0 });
      gsap.set(box, { opacity: 1, rotationY: 0, x: C / 2 });
      gsap.set(cover, { rotationY: -178 });
      gsap.set(chromeRef.current, { opacity: 1 });
      gsap.fromTo(rootRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' });
      return;
    }

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const o = originRect;

    const tl = gsap.timeline({
      defaults: { ease: 'power2.inOut', force3D: true },
      onReverseComplete: () => onCloseRef.current(),
    });
    tl.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0);
    // 1. The spine lifts off the shelf and travels to centre stage.
    tl.fromTo(
      proxy,
      { left: o.left, top: o.top, width: o.width, height: o.height, opacity: 1 },
      { left: cx - (SPINE * k) / 2, top: cy - (H * k) / 2, width: SPINE * k, height: H * k, duration: 0.42 },
      0.02,
    );
    // 2. Crossfade to the 3D box while the flight is still settling and the
    //    rotation has already begun: the stages melt into each other instead
    //    of chaining, which is what makes the sequence read as one motion.
    tl.fromTo(box, { opacity: 0, rotationY: 90 }, { opacity: 1, duration: 0.12, ease: 'none' }, '-=0.14');
    tl.to(proxy, { opacity: 0, duration: 0.12, ease: 'none' }, '<');
    // 3. The book rotates to face front.
    tl.to(box, { rotationY: 0, duration: 0.34 }, '-=0.12');
    // 4. The cover opens and the spread recentres, overlapping the rotation.
    tl.to(cover, { rotationY: -178, duration: 0.46, ease: 'power3.inOut' }, '-=0.14');
    tl.to(box, { x: C / 2, duration: 0.46, ease: 'power3.inOut' }, '<');
    tl.fromTo(chromeRef.current, { opacity: 0 }, { opacity: 1, duration: 0.24, ease: 'power2.out' }, '-=0.26');
    tlRef.current = tl;

    return () => {
      tl.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- navigation -----------------------------------------------------
  const turn = (dir: 1 | -1) => {
    if (total < 2 || turningRef.current || closingRef.current) return;
    const next = (indexRef.current + dir + total) % total;

    if (mode.mobile || mode.reduced) {
      const target = mode.mobile ? mobileContentRef.current : [leftContentRef.current, rightContentRef.current];
      turningRef.current = true;
      gsap.to(target, {
        opacity: 0,
        duration: 0.12,
        ease: 'power1.in',
        onComplete: () => {
          onNavigateRef.current(next);
          if (mode.mobile) mobileContentRef.current?.scrollTo({ top: 0 });
          gsap.to(target, { opacity: 1, duration: 0.16, ease: 'power1.out', onComplete: () => { turningRef.current = false; } });
        },
      });
      return;
    }

    // A blank leaf swings across the spread; the printed content beneath
    // swaps at the midpoint, when the leaf hides both pages.
    turningRef.current = true;
    const from = dir === 1 ? 0 : -178;
    const to = dir === 1 ? -178 : 0;
    const t = gsap.timeline({
      onComplete: () => {
        gsap.set(leafRef.current, { opacity: 0, rotationY: 0 });
        turningRef.current = false;
      },
    });
    t.set(leafRef.current, { opacity: 1, rotationY: from });
    t.to(leafRef.current, { rotationY: to, duration: 0.5, ease: 'power3.inOut', force3D: true });
    t.call(() => onNavigateRef.current(next), [], 0.25);
  };

  const handleClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (!mode.mobile && !mode.reduced && tlRef.current && originRect) {
      // The full sequence in reverse: covers close, the book turns spine-on
      // and flies back to its slot on the shelf.
      tlRef.current.reverse();
      return;
    }
    gsap.to(rootRef.current, {
      opacity: 0,
      y: mode.mobile ? 10 : 0,
      duration: 0.16,
      ease: 'power1.in',
      onComplete: () => onCloseRef.current(),
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); handleClose(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); turn(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); turn(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSwipeStart = (e: React.PointerEvent) => { if (e.pointerType === 'touch') swipeX.current = e.clientX; };
  const onSwipeEnd = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch' || swipeX.current === null) return;
    const d = e.clientX - swipeX.current;
    swipeX.current = null;
    if (d <= -48) turn(1);
    else if (d >= 48) turn(-1);
  };

  if (!current) return null;

  const kicker = readingTypeLabels[current.reading_type];
  const authorLine = readingAuthorLine(current);
  const recommendedBy = `Recommended by ${current.contributor_name} ${current.contributor_surname}, ${current.contributor_role}`;

  const hairline = { borderColor: SOFT } as const;

  // ---- mobile: full-screen reading panel ------------------------------
  if (mode.mobile) {
    return (
      <div
        ref={rootRef}
        role="dialog"
        aria-modal="true"
        aria-label={current.title}
        className="fixed inset-0 z-[70] bg-white flex flex-col"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="shrink-0 h-14 flex items-center justify-between pl-5 pr-2 border-b" style={hairline}>
          <span className="font-body text-[11px] uppercase tracking-[0.18em]" style={{ color: SOFT }}>{kicker}</span>
          <button ref={closeBtnRef} type="button" aria-label="Close the reading" onClick={handleClose} className="h-11 w-11 flex items-center justify-center text-accent">
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
        <div
          ref={mobileContentRef}
          className="flex-1 overflow-y-auto px-5 py-6"
          onPointerDown={onSwipeStart}
          onPointerUp={onSwipeEnd}
        >
          <h3 className="font-serif text-2xl leading-snug text-accent">{current.title}</h3>
          <p className="font-body text-sm text-muted-foreground mt-1.5">{authorLine}</p>
          <div className="border-t my-5" style={hairline} />
          <p className="font-serif text-[15px] leading-relaxed text-foreground/85 whitespace-pre-wrap">{current.description}</p>
          <p className="font-body text-[13px] italic text-muted-foreground mt-6">{recommendedBy}</p>
        </div>
        <div className="shrink-0 h-14 flex items-center justify-between px-2 border-t" style={hairline}>
          <button type="button" aria-label="Previous reading" onClick={() => turn(-1)} disabled={total < 2} className="h-11 w-11 flex items-center justify-center text-accent disabled:opacity-30">
            <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <span className="font-body text-xs text-muted-foreground tabular-nums">{index + 1} / {total}</span>
          <button type="button" aria-label="Next reading" onClick={() => turn(1)} disabled={total < 2} className="h-11 w-11 flex items-center justify-center text-accent disabled:opacity-30">
            <ChevronRight className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    );
  }

  // ---- desktop: 3D book on centre stage -------------------------------
  const pageFrame = (
    <span aria-hidden className="absolute inset-2 border pointer-events-none" style={{ borderColor: 'hsl(var(--accent-soft)/0.55)' }} />
  );

  return (
    <div ref={rootRef} role="dialog" aria-modal="true" aria-label={current.title} className="fixed inset-0 z-[70]">
      {/* Backdrop: clicking outside the book closes the reader. */}
      <div ref={backdropRef} className="absolute inset-0 bg-white/95" onClick={handleClose} />

      {/* Flat spine proxy for the shelf-to-stage flight. */}
      <div
        ref={proxyRef}
        aria-hidden
        className="fixed border-[1.5px] pointer-events-none"
        style={{ ...(originRect ? { left: originRect.left, top: originRect.top, width: originRect.width, height: originRect.height } : { opacity: 0 }), borderColor: SOFT, backgroundColor: 'hsl(var(--accent-soft)/0.08)' }}
      >
        <span className="absolute left-[3px] right-[3px] top-2 border-t" style={hairline} />
        <span className="absolute left-[3px] right-[3px] bottom-2 border-t" style={hairline} />
        <span className="absolute inset-x-0 top-4 bottom-4 flex items-center justify-center overflow-hidden font-serif text-[12px] leading-none text-accent/85" style={{ writingMode: 'vertical-rl' }}>
          <span className="max-h-full overflow-hidden whitespace-nowrap" style={{ textOverflow: 'ellipsis' }}>{current.title}</span>
        </span>
      </div>

      {/* Perspective stage. */}
      <div className="absolute inset-0 pointer-events-none" style={{ perspective: `${PERSPECTIVE}px` }} onPointerDown={onSwipeStart} onPointerUp={onSwipeEnd}>
        <div
          ref={boxRef}
          className="absolute left-1/2 top-1/2 pointer-events-auto opacity-0"
          style={{ width: C, height: H, marginLeft: -C / 2, marginTop: -H / 2, transformStyle: 'preserve-3d', boxShadow: '0 22px 44px -24px hsl(var(--accent)/0.28)' }}
        >
          {/* Right page block, just behind the closed cover. */}
          <div className="absolute inset-0 bg-white border-[1.5px]" style={{ ...hairline, transform: `translateZ(${SPINE / 2 - 1}px)` }}>
            {pageFrame}
            <div ref={rightContentRef} className="absolute inset-0 flex flex-col p-7 pl-8">
              <div className="flex-1 min-h-0 overflow-y-auto pr-1.5">
                <p className="font-serif text-[14.5px] leading-relaxed text-foreground/85 whitespace-pre-wrap">{current.description}</p>
              </div>
              <div className="shrink-0 border-t pt-3 mt-4" style={hairline}>
                <p className="font-body text-xs italic text-muted-foreground">{recommendedBy}</p>
              </div>
            </div>
          </div>

          {/* Front cover on its hinge; its back face is the left page. */}
          <div ref={coverRef} className="absolute inset-0" style={{ transformStyle: 'preserve-3d', transformOrigin: 'left center' }}>
            <div className="absolute inset-0 bg-white border-[1.5px]" style={{ ...hairline, backfaceVisibility: 'hidden' }}>
              {pageFrame}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <span className="font-body text-[10px] uppercase tracking-[0.2em]" style={{ color: SOFT }}>{kicker}</span>
                <span className="font-serif text-[16px] leading-snug text-accent mt-3 max-h-40 overflow-hidden">{current.title}</span>
              </div>
            </div>
            <div className="absolute inset-0 bg-white border-[1.5px]" style={{ ...hairline, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
              {pageFrame}
              <div ref={leftContentRef} className="absolute inset-0 flex flex-col p-7 pr-8">
                <span className="font-body text-[10px] uppercase tracking-[0.2em]" style={{ color: SOFT }}>{kicker}</span>
                <h3 className="font-serif text-[22px] leading-snug text-accent mt-4">{current.title}</h3>
                <p className="font-body text-[13px] text-muted-foreground mt-2.5">{authorLine}</p>
              </div>
            </div>
          </div>

          {/* Back cover. */}
          <div aria-hidden className="absolute inset-0 bg-white border-[1.5px]" style={{ ...hairline, transform: `rotateY(180deg) translateZ(${SPINE / 2}px)` }} />

          {/* Spine face (left edge of the cuboid). */}
          <div aria-hidden className="absolute top-0 left-0 border-[1.5px]" style={{ ...hairline, width: SPINE, height: H, transform: `rotateY(-90deg) translateZ(${SPINE / 2}px)`, backgroundColor: 'hsl(var(--accent-soft)/0.08)' }}>
            <span className="absolute left-[3px] right-[3px] top-2 border-t" style={hairline} />
            <span className="absolute left-[3px] right-[3px] bottom-2 border-t" style={hairline} />
            <span className="absolute inset-x-0 top-4 bottom-4 flex items-center justify-center overflow-hidden font-serif text-[12px] leading-none text-accent/85" style={{ writingMode: 'vertical-rl' }}>
              <span className="max-h-full overflow-hidden whitespace-nowrap" style={{ textOverflow: 'ellipsis' }}>{current.title}</span>
            </span>
          </div>

          {/* Blank turning leaf for the page-flip. */}
          <div ref={leafRef} aria-hidden className="absolute inset-0 bg-white border-[1.5px] opacity-0" style={{ ...hairline, transformOrigin: 'left center' }}>
            {pageFrame}
          </div>
        </div>
      </div>

      {/* Chrome: close, page arrows and the counter. */}
      <div ref={chromeRef} className="absolute inset-0 pointer-events-none opacity-0">
        <button
          ref={closeBtnRef}
          type="button"
          aria-label="Close the reading"
          onClick={handleClose}
          className="pointer-events-auto absolute right-5 top-5 h-11 w-11 flex items-center justify-center border bg-white text-accent transition-colors hover:bg-[hsl(var(--accent-soft)/0.12)]"
          style={hairline}
        >
          <X className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          aria-label="Previous reading"
          onClick={() => turn(-1)}
          disabled={total < 2}
          className="pointer-events-auto absolute left-5 top-1/2 -translate-y-1/2 h-11 w-11 flex items-center justify-center border bg-white text-accent transition-colors hover:bg-[hsl(var(--accent-soft)/0.12)] disabled:opacity-30 disabled:pointer-events-none"
          style={hairline}
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          aria-label="Next reading"
          onClick={() => turn(1)}
          disabled={total < 2}
          className="pointer-events-auto absolute right-5 top-1/2 -translate-y-1/2 h-11 w-11 flex items-center justify-center border bg-white text-accent transition-colors hover:bg-[hsl(var(--accent-soft)/0.12)] disabled:opacity-30 disabled:pointer-events-none"
          style={hairline}
        >
          <ChevronRight className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <span className="absolute bottom-6 left-1/2 -translate-x-1/2 font-body text-xs text-muted-foreground tabular-nums">{index + 1} / {total}</span>
      </div>
    </div>
  );
}
