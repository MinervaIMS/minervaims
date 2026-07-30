import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSeniorAnalystDivisions } from '@/hooks/useSeniorAnalystDivisions';

// =====================================================================
// OrgChart — the interactive organisational structure shown on /about.
// ---------------------------------------------------------------------
// The whole society is laid out once, at full size, inside a fixed
// 1560x808 "world". A camera (a single transformed layer) pans and zooms
// over it, so nothing ever reflows: selecting a division flies the camera
// to that branch, recesses the rest of the society behind it, and reveals
// the branch's teams with a staggered lift while the connectors draw
// themselves. Coming back to the overview reverses the same move.
//
// Two things are read from the society's own register rather than being
// drawn from a fixed picture:
//   * the Senior Analysts level appears under a division only when at
//     least one member actually holds that role there;
//   * every route out of the chart points at the filtered Members page,
//     so "Meet the Equity Research team" lands on Equity Research.
//
// Below 900px the camera is put away entirely and the same structure is
// presented as a stacked outline, which is legible on a phone in a way
// no amount of zooming into a wide diagram would be.
//
// The motion tokens, easings and delays live in the .oc-* block of
// src/index.css. They are the approved design: treat the numbers here and
// there as one piece.
// =====================================================================

type DivKey = 'equity' | 'investment' | 'macro' | 'quant' | 'portfolio' | 'media';
/** The Asset Management divisions: everything except the Media branch. */
type AmDiv = Exclude<DivKey, 'media'>;

const WORLD_W = 1560;
const WORLD_H = 808;

/** Camera limits and padding when framing a branch. */
const SMIN = 0.86;
const SMAX = 1.35;
const PADX = 72;
const PADY = 56;
const CONTENT = { x1: 137, x2: 1521 };

const ORDER: AmDiv[] = ['equity', 'investment', 'macro', 'quant', 'portfolio'];

const CELL: Record<DivKey, { label: string; div: string }> = {
  equity: { label: 'Equity Research', div: 'equity' },
  investment: { label: 'Investment Research', div: 'investment' },
  macro: { label: 'Macro Research', div: 'macro' },
  quant: { label: 'Quantitative Research', div: 'quant' },
  portfolio: { label: 'Portfolio Management', div: 'portfolio' },
  media: { label: 'Media & Communication', div: 'media-ops' },
};

/** Only the branch's own drop is promoted. The bus is context, never lit. */
const SPINE: Record<DivKey, string[]> = {
  equity: ['d_equity'],
  investment: ['d_investment'],
  macro: ['d_macro'],
  quant: ['d_quant'],
  portfolio: ['d_portfolio'],
  media: ['b6'],
};

/** Wrappers that stay in full focus while a branch is selected. */
const KEEP: Record<DivKey, string[]> = {
  equity: ['cell_equity'],
  investment: ['cell_investment'],
  macro: ['cell_macro'],
  quant: ['cell_quant'],
  portfolio: ['cell_portfolio'],
  media: ['media', 'media_an'],
};

/** The connector that leads INTO a node, lit while the node is hovered. */
const PARENT: Record<string, string> = {
  vp: 'b1',
  hoam: 'b2',
  advisors: 'b3',
  media: 'b4',
  ops: 'b5',
  media_an: 'b6',
  cell_equity: 'd_equity',
  cell_investment: 'd_investment',
  cell_macro: 'd_macro',
  cell_quant: 'd_quant',
  cell_portfolio: 'd_portfolio',
};

const SPINE_PATHS: { k: string; d: string; light?: boolean }[] = [
  { k: 'b1', d: 'M 860 66 C 860 84 860 100 860 118' },
  { k: 'b2', d: 'M 860 170 C 860 192 860 214 860 236' },
  { k: 'b3', d: 'M 755 33 L 578 34', light: true },
  { k: 'b4', d: 'M 965 33 L 1202 36' },
  { k: 'b5', d: 'M 955 144 C 987 144 973 203 1005 203' },
  { k: 'b6', d: 'M 1328 72 C 1328 82 1328 88 1328 96' },
  { k: 't0', d: 'M 860 290 L 860 340' },
  { k: 's_l1', d: 'M 860 340 L 640 340' },
  { k: 's_l2', d: 'M 640 340 L 436 340' },
  { k: 's_r1', d: 'M 860 340 L 1080 340' },
  { k: 's_r2', d: 'M 1080 340 L 1284 340' },
  { k: 'd_equity', d: 'M 436 340 Q 420 340 420 356 L 420 388' },
  { k: 'd_investment', d: 'M 640 340 L 640 388' },
  { k: 'd_macro', d: 'M 860 340 L 860 388' },
  { k: 'd_quant', d: 'M 1080 340 L 1080 388' },
  { k: 'd_portfolio', d: 'M 1284 340 Q 1300 340 1300 356 L 1300 388' },
];

// --- Sub-tree geometry -------------------------------------------------
// Every branch shares one shape: a row of team leaders, a Senior Analysts
// row beneath each, then an Analysts row. Only the column positions and
// the box widths differ, so the boxes and their connectors are derived
// rather than repeated, and hiding the Senior Analysts row is a single
// change of one offset instead of a second copy of the chart.

const LEADER_H = 60;
const SENIOR_W = 128;
const SENIOR_H = 44;
const ANALYST_W = 112;
const ANALYST_H = 40;
const ROW_SENIOR_Y = 100;
const ROW_ANALYST_Y = 184;
/** How far the Analysts row rises when a division has no senior analysts. */
const SENIOR_ROW_SHIFT = ROW_ANALYST_Y - ROW_SENIOR_Y;

interface TeamColumn {
  left: number;
  width: number;
  leader: string;
  sub?: string;
}

interface SubTree {
  left: number;
  top: number;
  width: number;
  /** World x of the division head's bottom edge, where the fan starts. */
  headX: number;
  cellLeft: number;
  columns: TeamColumn[];
  /** Quantitative Research has no team leaders: one straight chain. */
  chain?: boolean;
}

const CELL_W = 196;

const SUBTREES: Record<AmDiv, SubTree> = {
  equity: {
    left: 137, top: 548, width: 566, headX: 420, cellLeft: 322,
    columns: [
      { left: 0, width: 128, leader: 'Team Leader' },
      { left: 146, width: 128, leader: 'Team Leader' },
      { left: 292, width: 128, leader: 'Team Leader' },
      { left: 438, width: 128, leader: 'Team Leader' },
    ],
  },
  investment: {
    left: 388, top: 548, width: 504, headX: 640, cellLeft: 542,
    columns: [
      { left: 0, width: 156, leader: 'Team Leader', sub: 'Equities' },
      { left: 174, width: 156, leader: 'Team Leader', sub: 'Fixed Income' },
      { left: 348, width: 156, leader: 'Team Leader', sub: 'FX and Commodities' },
    ],
  },
  macro: {
    left: 646, top: 548, width: 428, headX: 860, cellLeft: 762,
    columns: [
      { left: 0, width: 128, leader: 'Team Leader' },
      { left: 150, width: 128, leader: 'Team Leader' },
      { left: 300, width: 128, leader: 'Team Leader' },
    ],
  },
  quant: {
    left: 996, top: 548, width: 168, headX: 1080, cellLeft: 982,
    columns: [], chain: true,
  },
  portfolio: {
    left: 1079, top: 548, width: 442, headX: 1300, cellLeft: 1202,
    columns: [
      { left: 0, width: 210, leader: 'Portfolio Manager', sub: 'Long Short Equity Fund' },
      { left: 232, width: 210, leader: 'Portfolio Manager', sub: 'Multi-Asset Global Opportunities Fund' },
    ],
  },
};

const HEADS: Record<AmDiv, string> = {
  equity: 'Head of Equity Research',
  investment: 'Head of Investment Research',
  macro: 'Head of Macro Research',
  quant: 'Head of Quantitative Research',
  portfolio: 'Head of Portfolio Management',
};

/** Height of a branch's sub-tree, which shrinks when the senior row is off. */
function subHeight(tree: SubTree, seniors: boolean): number {
  if (tree.chain) return seniors ? 84 + ANALYST_H : ANALYST_H;
  return (seniors ? ROW_ANALYST_Y : ROW_SENIOR_Y) + ANALYST_H;
}

/** World-space bounds of a branch: its head cell plus its whole sub-tree. */
function bboxFor(key: DivKey, seniors: boolean) {
  if (key === 'media') return { x1: 1202, x2: 1454, y1: 0, y2: 140 };
  const t = SUBTREES[key];
  return {
    x1: Math.min(t.cellLeft, t.left),
    x2: Math.max(t.cellLeft + CELL_W, t.left + t.width),
    y1: 388,
    y2: t.top + subHeight(t, seniors),
  };
}

// --- Shared inline styles ---------------------------------------------

const serif = "'EB Garamond','Times New Roman',Times,Georgia,serif";
const body = "'Calibri','Carlito',Arial,Helvetica,sans-serif";

const boxBase: CSSProperties = {
  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
  justifyContent: 'center', textAlign: 'center', background: '#ffffff',
  pointerEvents: 'auto', cursor: 'default',
};

const headText: CSSProperties = {
  fontFamily: serif, fontSize: 23, lineHeight: 1.14, letterSpacing: '-0.012em',
  color: 'hsl(var(--accent))', fontWeight: 600, textWrap: 'balance' as CSSProperties['textWrap'],
};

const leaderText: CSSProperties = {
  fontFamily: serif, fontSize: 15, lineHeight: 1.15, color: 'hsl(var(--accent))', fontWeight: 500,
};

const subText: CSSProperties = {
  fontFamily: body, fontSize: 12, lineHeight: 1.25,
  color: 'color-mix(in srgb, hsl(var(--accent)) 75%, #ffffff)',
};

const rankText: CSSProperties = {
  fontFamily: body, fontSize: 12.5, lineHeight: 1.2, textTransform: 'uppercase',
  letterSpacing: '0.06em', fontWeight: 600, color: 'hsl(var(--accent))',
};

const crumbText: CSSProperties = {
  fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.15em',
  color: 'hsl(var(--muted-foreground))',
};

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

// =====================================================================

export function OrgChart() {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const camRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);
  const ctaTextRef = useRef<HTMLSpanElement>(null);

  const { hasSeniorAnalysts } = useSeniorAnalystDivisions();

  const [focus, setFocus] = useState<DivKey | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [settled, setSettled] = useState(false);
  const [vw, setVw] = useState(() => (typeof window === 'undefined' ? 1280 : window.innerWidth));
  const [stackOpen, setStackOpen] = useState<string | null>(null);

  const reduced = useRef(prefersReducedMotion());
  const cam = useRef({ tx: -132, ty: 75, s: SMIN });
  const focusRef = useRef<DivKey | null>(null);
  const drag = useRef<{ x: number; tx: number; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const pinch = useRef<{ d: number; s: number; tx: number; ty: number } | null>(null);
  const timers = useRef<number[]>([]);

  const isStacked = vw > 0 && vw < 900;

  const seniorsIn = useCallback(
    (key: AmDiv) => hasSeniorAnalysts(key),
    [hasSeniorAnalysts],
  );

  const after = useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }, []);

  // --- Camera ---------------------------------------------------------

  const frameSize = useCallback(() => {
    const el = frameRef.current;
    if (!el) return { w: 1232, h: 560 };
    const r = el.getBoundingClientRect();
    return { w: r.width || 1232, h: r.height || 560 };
  }, []);

  const overviewCam = useCallback(() => {
    const f = frameSize();
    const s = Math.min(SMIN, (f.w - 56) / 1096, (f.h - 56) / 476);
    return { tx: f.w / 2 - s * 870, ty: f.h / 2 - s * 238, s };
  }, [frameSize]);

  const focusCam = useCallback((key: DivKey) => {
    const f = frameSize();
    const b = bboxFor(key, key === 'media' ? true : seniorsIn(key));
    const bw = b.x2 - b.x1;
    const bh = b.y2 - b.y1;
    const fit = Math.min((f.w - 2 * PADX) / bw, (f.h - 2 * PADY) / bh);
    const s = Math.max(SMIN, Math.min(SMAX, fit));
    return {
      tx: f.w / 2 - s * (b.x1 + b.x2) / 2,
      ty: f.h / 2 - s * (b.y1 + b.y2) / 2,
      s,
    };
  }, [frameSize, seniorsIn]);

  const setCam = useCallback((tx: number, ty: number, s: number, dur: number) => {
    cam.current = { tx, ty, s };
    const el = camRef.current;
    if (!el) return;
    const d = reduced.current ? 0 : dur;
    el.style.willChange = 'transform';
    el.style.transitionDuration = `${d}ms`;
    el.style.transform =
      `translate3d(${Math.round(tx * 10) / 10}px,${Math.round(ty * 10) / 10}px,0) scale(${s})`;
    after(d + 140, () => { if (camRef.current) camRef.current.style.willChange = 'auto'; });
  }, [after]);

  const clampTx = useCallback((tx: number) => {
    const f = frameSize();
    const s = cam.current.s;
    return Math.max(220 - CONTENT.x2 * s, Math.min(f.w - 220 - CONTENT.x1 * s, tx));
  }, [frameSize]);

  // --- Navigation -----------------------------------------------------

  const dive = useCallback((key: DivKey) => {
    if (!CELL[key] || key === focusRef.current) return;
    const previous = focusRef.current;
    const c = focusCam(key);
    setCam(c.tx, c.ty, c.s, previous ? 420 : 640);
    focusRef.current = key;
    setFocus(key);
    setHover(null);
    after(reduced.current ? 0 : 160, () => {
      const region = worldRef.current?.querySelector<HTMLElement>(`[data-sub="${key}"]`);
      region?.focus({ preventScroll: true });
    });
  }, [after, focusCam, setCam]);

  const toOverview = useCallback(() => {
    const previous = focusRef.current;
    if (previous == null) return;
    const c = overviewCam();
    setCam(c.tx, c.ty, c.s, 380);
    focusRef.current = null;
    setFocus(null);
    setHover(null);
    const button = worldRef.current?.querySelector<HTMLElement>(`[data-dive="${previous}"]`);
    button?.focus({ preventScroll: true });
  }, [overviewCam, setCam]);

  // --- Lifecycle ------------------------------------------------------

  useEffect(() => {
    if (isStacked) return;
    const c = overviewCam();
    setCam(c.tx, c.ty, c.s, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStacked]);

  // Entrance: play once, when the chart is actually looked at.
  useEffect(() => {
    if (isStacked || revealed) return;
    const stage = stageRef.current;
    const reveal = () => {
      setRevealed(true);
      window.setTimeout(() => setSettled(true), 1400);
    };
    if (reduced.current || !stage || typeof IntersectionObserver === 'undefined') {
      reveal();
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { reveal(); io.disconnect(); } });
    }, { threshold: 0.18 });
    io.observe(stage);
    const fallback = window.setTimeout(reveal, 1600);
    return () => { io.disconnect(); window.clearTimeout(fallback); };
  }, [isStacked, revealed]);

  useEffect(() => {
    const onResize = () => {
      setVw(window.innerWidth);
      const c = focusRef.current ? focusCam(focusRef.current) : overviewCam();
      setCam(c.tx, c.ty, c.s, 0);
    };
    window.addEventListener('resize', onResize);
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => { if (frameRef.current) onResize(); }).catch(() => undefined);
    }
    return () => window.removeEventListener('resize', onResize);
  }, [focusCam, overviewCam, setCam]);

  // Escape leaves a branch from anywhere on the page.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusRef.current != null) { e.stopPropagation(); toOverview(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [toOverview]);

  // Ctrl/Cmd wheel and two-finger pinch zoom the world without stealing
  // the page's own scroll, so both need non-passive listeners.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || isStacked) return;

    const dist = (t: TouchList) => {
      const dx = t[0].clientX - t[1].clientX;
      const dy = t[0].clientY - t[1].clientY;
      return Math.sqrt(dx * dx + dy * dy) || 1;
    };

    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const r = frame.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      const s0 = cam.current.s;
      const s1 = Math.max(SMIN, Math.min(SMAX, s0 * (1 - e.deltaY * 0.0016)));
      if (Math.abs(s1 - s0) < 0.0005) return;
      const k = s1 / s0;
      setCam(px - k * (px - cam.current.tx), py - k * (py - cam.current.ty), s1, 0);
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      pinch.current = { d: dist(e.touches), s: cam.current.s, tx: cam.current.tx, ty: cam.current.ty };
    };
    const onTouchMove = (e: TouchEvent) => {
      const p = pinch.current;
      if (!p || e.touches.length !== 2) return;
      e.preventDefault();
      const r = frame.getBoundingClientRect();
      const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left;
      const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top;
      const s1 = Math.max(SMIN, Math.min(SMAX, p.s * (dist(e.touches) / p.d)));
      const k = s1 / p.s;
      setCam(mx - k * (mx - p.tx), my - k * (my - p.ty), s1, 0);
    };
    const onTouchEnd = () => { pinch.current = null; };

    frame.addEventListener('wheel', onWheel, { passive: false });
    frame.addEventListener('touchstart', onTouchStart, { passive: true });
    frame.addEventListener('touchmove', onTouchMove, { passive: false });
    frame.addEventListener('touchend', onTouchEnd);
    return () => {
      frame.removeEventListener('wheel', onWheel);
      frame.removeEventListener('touchstart', onTouchStart);
      frame.removeEventListener('touchmove', onTouchMove);
      frame.removeEventListener('touchend', onTouchEnd);
    };
  }, [isStacked, setCam]);

  useEffect(() => () => { timers.current.forEach(window.clearTimeout); }, []);

  // --- Call to action --------------------------------------------------
  // The label follows the selection, crossfading rather than snapping.

  const ctaKey = isStacked ? (stackOpen as DivKey | null) : focus;

  useEffect(() => {
    const anchor = ctaRef.current;
    const span = ctaTextRef.current;
    if (!anchor || !span) return;
    const cell = ctaKey ? CELL[ctaKey] : null;
    const label = cell ? `Meet the ${cell.label} team` : 'Meet the Team';
    const href = cell ? `/people/members?division=${cell.div}` : '/people/members';
    if (span.textContent === label) { anchor.setAttribute('href', href); return; }
    if (reduced.current) {
      span.textContent = label;
      anchor.setAttribute('href', href);
      return;
    }
    span.style.transition = 'opacity 120ms var(--e-out)';
    span.style.opacity = '0';
    const id = window.setTimeout(() => {
      if (!ctaTextRef.current) return;
      span.textContent = label;
      anchor.setAttribute('href', href);
      span.style.transition = 'opacity 180ms var(--e-in)';
      span.style.opacity = '1';
    }, 120);
    return () => window.clearTimeout(id);
  }, [ctaKey]);

  // --- Painting --------------------------------------------------------

  const keep = focus ? KEEP[focus] : [];
  const soft = focus ? SPINE[focus] : [];
  const hotPaths = useMemo(() => {
    const set = new Set<string>(focus ? SPINE[focus] : []);
    if (hover && PARENT[hover]) {
      const recessed = !!focus && !keep.includes(hover);
      if (!recessed) set.add(PARENT[hover]);
    }
    return set;
  }, [focus, hover, keep]);

  const wrapClass = (w: string, extra = '') => {
    const rec = !!focus && !keep.includes(w);
    return ['oc-w', extra, rec ? 'rec' : ''].filter(Boolean).join(' ');
  };

  const pathClass = (k: string, light?: boolean) => {
    const rec = !!focus && !soft.includes(k);
    return [
      'oc-p', 'oc-draw',
      light ? 'lt' : '',
      rec ? 'rec' : '',
      hotPaths.has(k) ? 'hot' : '',
      k === 'b6' && focus !== 'media' ? 'hid' : '',
    ].filter(Boolean).join(' ');
  };

  const entrance = (cls: string) => (settled ? cls : `oc-e ${cls}`);

  // --- Pointer / keyboard on the frame ---------------------------------

  const onFrameClick = (e: React.MouseEvent) => {
    if (dragged.current) { dragged.current = false; return; }
    const target = e.target as HTMLElement;
    const diveTarget = target.closest<HTMLElement>('[data-dive]');
    if (diveTarget) {
      e.preventDefault();
      dive(diveTarget.getAttribute('data-dive') as DivKey);
      return;
    }
    if (focusRef.current == null) return;
    if (target.closest('.oc-sub.on') || target.closest('.oc-w:not(.rec)')) return;
    toOverview();
  };

  const onFrameKeyDown = (e: React.KeyboardEvent) => {
    const world = worldRef.current;
    if (!world) return;
    if (e.key === 'Escape') {
      if (focusRef.current != null) { e.preventDefault(); toOverview(); }
      return;
    }
    const current = (e.target as HTMLElement).closest<HTMLElement>('[data-dive]');
    const currentKey = (current ? current.getAttribute('data-dive') : focusRef.current) as DivKey | null;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const i = currentKey ? ORDER.indexOf(currentKey as AmDiv) : -1;
      if (i < 0) return;
      e.preventDefault();
      const next = ORDER[(i + (e.key === 'ArrowRight' ? 1 : ORDER.length - 1)) % ORDER.length];
      world.querySelector<HTMLElement>(`[data-dive="${next}"]`)?.focus({ preventScroll: true });
      if (focusRef.current != null) dive(next);
    } else if (e.key === 'ArrowUp') {
      if (focusRef.current != null) { e.preventDefault(); toOverview(); }
    } else if (e.key === 'ArrowDown') {
      if (current && currentKey && focusRef.current !== currentKey) { e.preventDefault(); dive(currentKey); }
    }
  };

  const onFrameOver = (e: React.MouseEvent) => {
    const node = (e.target as HTMLElement).closest<HTMLElement>('[data-node]');
    setHover(node ? node.getAttribute('data-node') : null);
  };

  const onFrameOut = (e: React.MouseEvent) => {
    const node = (e.target as HTMLElement).closest<HTMLElement>('[data-node]');
    if (!node) return;
    setHover((prev) => (prev === node.getAttribute('data-node') ? null : prev));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' || (e.target as HTMLElement).closest('a,button')) return;
    drag.current = { x: e.clientX, tx: cam.current.tx, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < 5) return;
    d.moved = true;
    if (frameRef.current) frameRef.current.style.cursor = 'grabbing';
    setCam(clampTx(d.tx + dx), cam.current.ty, cam.current.s, 0);
  };

  const onPointerUp = () => {
    if (drag.current?.moved) dragged.current = true;
    drag.current = null;
    if (frameRef.current) frameRef.current.style.cursor = 'default';
  };

  // --- Sub-tree rendering ----------------------------------------------

  const renderSubTree = (key: AmDiv) => {
    const t = SUBTREES[key];
    const seniors = seniorsIn(key);
    const height = subHeight(t, seniors);
    const label = `${CELL[key].label} ${key === 'portfolio' ? 'funds' : 'teams'}`;

    if (t.chain) {
      // Quantitative Research: Senior Analysts, then Analysts, no leaders.
      const analystTop = seniors ? 84 : 0;
      return (
        <div
          key={key}
          className={`oc-sub${focus === key ? ' on' : ''}`}
          data-sub={key}
          id={`oc-sub-${key}`}
          role="region"
          aria-label={label}
          aria-hidden={focus === key ? 'false' : 'true'}
          tabIndex={-1}
          style={{ position: 'absolute', left: t.left, top: t.top, width: t.width, height, outline: 'none', pointerEvents: 'none' }}
        >
          <svg
            width={WORLD_W} height={WORLD_H} viewBox={`0 0 ${WORLD_W} ${WORLD_H}`} aria-hidden="true"
            style={{ position: 'absolute', left: -t.left, top: -t.top, overflow: 'visible', pointerEvents: 'none' }}
          >
            <path className={`oc-p l1${focus === key ? ' hot' : ''}`} pathLength={1} d={`M ${t.headX} 492 L ${t.headX} 548`} />
            {seniors && (
              <path className={`oc-p l2${focus === key ? ' hot' : ''}`} pathLength={1} d={`M ${t.headX} 592 L ${t.headX} 632`} />
            )}
          </svg>
          {seniors && (
            <div className="oc-w" style={{ position: 'absolute', left: 0, top: 0, width: 168, height: SENIOR_H, pointerEvents: 'none' }}>
              <div style={{ ...boxBase, background: 'hsl(var(--accent-soft) / 0.18)', border: '1px solid hsl(var(--accent-soft))' }}>
                <span style={rankText}>Senior Analysts</span>
              </div>
            </div>
          )}
          <div className="oc-w" style={{ position: 'absolute', left: 10, top: analystTop, width: 148, height: ANALYST_H, pointerEvents: 'none' }}>
            <div style={{ ...boxBase, background: 'hsl(var(--accent-soft) / 0.14)' }}>
              <span style={rankText}>Analysts</span>
            </div>
          </div>
        </div>
      );
    }

    const analystTop = seniors ? ROW_ANALYST_Y : ROW_ANALYST_Y - SENIOR_ROW_SHIFT;
    const centre = (c: TeamColumn) => t.left + c.left + c.width / 2;

    return (
      <div
        key={key}
        className={`oc-sub${focus === key ? ' on' : ''}`}
        data-sub={key}
        id={`oc-sub-${key}`}
        role="region"
        aria-label={label}
        aria-hidden={focus === key ? 'false' : 'true'}
        tabIndex={-1}
        style={{ position: 'absolute', left: t.left, top: t.top, width: t.width, height, outline: 'none', pointerEvents: 'none' }}
      >
        <svg
          width={WORLD_W} height={WORLD_H} viewBox={`0 0 ${WORLD_W} ${WORLD_H}`} aria-hidden="true"
          style={{ position: 'absolute', left: -t.left, top: -t.top, overflow: 'visible', pointerEvents: 'none' }}
        >
          {t.columns.map((c, i) => {
            const cx = centre(c);
            const d = cx === t.headX
              ? `M ${t.headX} 492 L ${t.headX} 548`
              : `M ${t.headX} 492 C ${t.headX} 522 ${cx} 512 ${cx} 548`;
            return <path key={`l1-${i}`} className={`oc-p l1${focus === key ? ' hot' : ''}`} pathLength={1} d={d} />;
          })}
          {t.columns.map((c, i) => (
            <path key={`l2-${i}`} className={`oc-p l2${focus === key ? ' hot' : ''}`} pathLength={1} d={`M ${centre(c)} 608 L ${centre(c)} 648`} />
          ))}
          {seniors && t.columns.map((c, i) => (
            <path key={`l3-${i}`} className={`oc-p l3${focus === key ? ' hot' : ''}`} pathLength={1} d={`M ${centre(c)} 692 L ${centre(c)} 732`} />
          ))}
        </svg>

        {t.columns.map((c, i) => (
          <div key={`lead-${i}`} className="oc-w" style={{ position: 'absolute', left: c.left, top: 0, width: c.width, height: LEADER_H, pointerEvents: 'none' }}>
            <div
              style={{
                ...boxBase,
                flexDirection: c.sub ? 'column' : 'row',
                gap: c.sub ? 2 : 0,
                padding: c.sub ? '0 8px' : 0,
                border: '1px solid hsl(var(--separator))',
              }}
            >
              <span style={leaderText}>{c.leader}</span>
              {c.sub && <span style={subText}>{c.sub}</span>}
            </div>
          </div>
        ))}

        {seniors && t.columns.map((c, i) => (
          <div
            key={`senior-${i}`}
            className="oc-w"
            style={{ position: 'absolute', left: c.left + (c.width - SENIOR_W) / 2, top: ROW_SENIOR_Y, width: SENIOR_W, height: SENIOR_H, pointerEvents: 'none' }}
          >
            <div style={{ ...boxBase, background: 'hsl(var(--accent-soft) / 0.18)', border: '1px solid hsl(var(--accent-soft))' }}>
              <span style={rankText}>Senior Analysts</span>
            </div>
          </div>
        ))}

        {t.columns.map((c, i) => (
          <div
            key={`analyst-${i}`}
            className="oc-w"
            style={{ position: 'absolute', left: c.left + (c.width - ANALYST_W) / 2, top: analystTop, width: ANALYST_W, height: ANALYST_H, pointerEvents: 'none' }}
          >
            <div style={{ ...boxBase, background: 'hsl(var(--accent-soft) / 0.14)' }}>
              <span style={rankText}>Analysts</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // --- Stacked (phone) outline -----------------------------------------

  const stackedRow = (leader: string, sub: string | undefined, seniors: boolean) => (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '11px 14px', border: '1px solid hsl(var(--separator))', background: '#fff' }}>
        <span style={leaderText}>{leader}</span>
        {sub && <span style={subText}>{sub}</span>}
      </div>
      {seniors && (
        <div style={{ display: 'flex', alignItems: 'stretch', paddingLeft: 24 }}>
          <svg width="20" height="40" viewBox="0 0 20 40" aria-hidden="true" style={{ flex: 'none', marginLeft: -20, overflow: 'visible' }}>
            <path className="oc-p" d="M 1 0 C 1 16 1 20 19 20" />
          </svg>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '11px 14px', background: 'hsl(var(--accent-soft) / 0.18)', border: '1px solid hsl(var(--accent-soft))' }}>
            <span style={rankText}>Senior Analysts</span>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'stretch', paddingLeft: seniors ? 48 : 24 }}>
        <svg width="20" height="40" viewBox="0 0 20 40" aria-hidden="true" style={{ flex: 'none', marginLeft: -20, overflow: 'visible' }}>
          <path className="oc-p" d="M 1 0 C 1 16 1 20 19 20" />
        </svg>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '11px 14px', background: 'hsl(var(--accent-soft) / 0.14)' }}>
          <span style={rankText}>Analysts</span>
        </div>
      </div>
    </div>
  );

  const renderStacked = () => (
    <div className="oc-sk" style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 30 }}>
      <div>
        <div style={{ ...crumbText, letterSpacing: '0.16em', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid hsl(var(--separator))' }}>
          Executive and Board
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '15px 18px', border: '1px solid hsl(var(--accent))', background: '#fff', boxShadow: '0 3px 14px -9px rgba(31,15,77,.55)' }}>
            <span style={{ fontFamily: serif, fontSize: 19, color: 'hsl(var(--accent))', fontWeight: 600, letterSpacing: '-0.015em' }}>President</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'stretch', paddingLeft: 20 }}>
            <svg width="20" height="52" viewBox="0 0 20 52" aria-hidden="true" style={{ flex: 'none', marginLeft: -20, overflow: 'visible' }}>
              <path className="oc-p" d="M 1 0 C 1 22 1 26 19 26" />
            </svg>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '12px 16px', border: '1px solid hsl(var(--separator))', background: '#fff' }}>
              <span style={{ fontFamily: serif, fontSize: 19, color: 'hsl(var(--accent))', fontWeight: 400 }}>Advisors</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'stretch', paddingLeft: 20 }}>
            <svg width="20" height="52" viewBox="0 0 20 52" aria-hidden="true" style={{ flex: 'none', marginLeft: -20, overflow: 'visible' }}>
              <path className="oc-p" d="M 1 0 C 1 22 1 26 19 26" />
            </svg>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '13px 16px', border: '1px solid hsl(var(--accent))', background: '#fff' }}>
              <span style={{ fontFamily: serif, fontSize: 19, color: 'hsl(var(--accent))', fontWeight: 600 }}>Vice President</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'stretch', paddingLeft: 40 }}>
            <svg width="20" height="52" viewBox="0 0 20 52" aria-hidden="true" style={{ flex: 'none', marginLeft: -20, overflow: 'visible' }}>
              <path className="oc-p" d="M 1 0 C 1 22 1 26 19 26" />
            </svg>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '13px 16px', border: '1px solid hsl(var(--accent))', background: '#fff' }}>
              <span style={{ fontFamily: serif, fontSize: 19, color: 'hsl(var(--accent))', fontWeight: 600 }}>Head of Asset Management</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', border: '1px solid hsl(var(--accent))', background: '#fff', marginTop: 6 }}>
            <span style={{ fontFamily: serif, fontSize: 19, color: 'hsl(var(--accent))', fontWeight: 600 }}>Head of Media and Communication</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'stretch', paddingLeft: 20 }}>
            <svg width="20" height="44" viewBox="0 0 20 44" aria-hidden="true" style={{ flex: 'none', marginLeft: -20, overflow: 'visible' }}>
              <path className="oc-p" d="M 1 0 C 1 18 1 22 19 22" />
            </svg>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '12px 15px', background: 'hsl(var(--accent-soft) / 0.14)' }}>
              <span style={rankText}>Media Analysts</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', border: '1px solid hsl(var(--accent))', background: '#fff', marginTop: 6 }}>
            <span style={{ fontFamily: serif, fontSize: 19, color: 'hsl(var(--accent))', fontWeight: 600 }}>Head of Operations</span>
          </div>
        </div>
      </div>

      <div>
        <div style={{ ...crumbText, letterSpacing: '0.16em', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid hsl(var(--separator))' }}>
          Asset Management divisions
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ORDER.map((key) => {
            const t = SUBTREES[key];
            const open = stackOpen === key;
            const seniors = seniorsIn(key);
            return (
              <div key={key} style={{ border: '1px solid hsl(var(--accent))', background: '#fff' }}>
                <button
                  type="button"
                  className="oc-row"
                  onClick={() => setStackOpen((s) => (s === key ? null : key))}
                  aria-expanded={open}
                  aria-controls={`stk-${key}`}
                  aria-label={`${open ? 'Collapse' : 'Expand'} ${HEADS[key]}`}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', border: 0, background: 'transparent', textAlign: 'left', font: 'inherit', cursor: 'pointer' }}
                >
                  <span style={{ fontFamily: serif, fontSize: 19, color: 'hsl(var(--accent))', fontWeight: 600 }}>{HEADS[key]}</span>
                  <span aria-hidden="true" style={{ flex: 'none', fontSize: 11, color: 'hsl(var(--accent))' }}>{open ? '▾' : '▸'}</span>
                </button>
                {open && (
                  <div id={`stk-${key}`} style={{ padding: '4px 16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {t.chain ? (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {seniors && (
                          <div style={{ display: 'flex', alignItems: 'center', padding: '12px 15px', background: 'hsl(var(--accent-soft) / 0.18)', border: '1px solid hsl(var(--accent-soft))' }}>
                            <span style={rankText}>Senior Analysts</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'stretch', paddingLeft: 24 }}>
                          <svg width="20" height="40" viewBox="0 0 20 40" aria-hidden="true" style={{ flex: 'none', marginLeft: -20, overflow: 'visible' }}>
                            <path className="oc-p" d="M 1 0 C 1 16 1 20 19 20" />
                          </svg>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '11px 14px', background: 'hsl(var(--accent-soft) / 0.14)' }}>
                            <span style={rankText}>Analysts</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      t.columns.map((c, i) => (
                        <div key={i}>{stackedRow(c.leader, c.sub, seniors)}</div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // --- Render -----------------------------------------------------------

  return (
    <div className="oc" ref={rootRef}>
      {!isStacked && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', margin: '0 0 14px', minHeight: 30 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, ...crumbText }}>
              <button
                type="button"
                className="oc-crumb"
                onClick={toOverview}
                style={{ border: 0, background: 'none', padding: 0, font: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit', color: 'hsl(var(--muted-foreground))', cursor: 'pointer' }}
              >
                Society
              </button>
              {focus && (
                <>
                  <span aria-hidden="true" style={{ opacity: 0.5 }}>/</span>
                  <span aria-current="true" style={{ color: 'hsl(var(--accent))' }}>{CELL[focus].label}</span>
                </>
              )}
            </div>
            <p style={{ margin: '0 auto 0 0', fontSize: 12, lineHeight: 1.5, letterSpacing: '0.02em', color: 'hsl(var(--muted-foreground))' }}>
              Select a division to explore its teams.
            </p>
            {focus && (
              <button
                type="button"
                className="oc-crumb"
                onClick={toOverview}
                style={{ border: '1px solid hsl(var(--separator))', background: 'none', padding: '6px 13px', fontFamily: 'inherit', ...crumbText, cursor: 'pointer' }}
              >
                Overview
              </button>
            )}
          </div>

          <div className={`oc-stage${revealed ? ' in' : ''}`} ref={stageRef}>
            <div
              ref={frameRef}
              role="group"
              aria-label="Organisational chart, select a division to explore its teams"
              onClick={onFrameClick}
              onKeyDown={onFrameKeyDown}
              onMouseOver={onFrameOver}
              onMouseOut={onFrameOut}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              style={{ position: 'relative', width: '100%', height: 'clamp(520px,64vh,680px)', overflow: 'hidden', background: 'hsl(var(--background))', touchAction: 'pan-y', cursor: 'default' }}
            >
              <div className="oc-mask" style={{ position: 'absolute', inset: 0 }}>
                <div
                  className="oc-cam"
                  ref={camRef}
                  style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: 'translate3d(-132px,75px,0) scale(0.86)' }}
                >
                  <div ref={worldRef} style={{ position: 'relative', width: WORLD_W, height: WORLD_H }}>

                    <svg
                      width={WORLD_W} height={WORLD_H} viewBox={`0 0 ${WORLD_W} ${WORLD_H}`} aria-hidden="true"
                      style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}
                    >
                      {SPINE_PATHS.map((p) => (
                        <path key={p.k} className={pathClass(p.k, p.light)} data-p={p.k} pathLength={1} d={p.d} />
                      ))}
                    </svg>

                    <div className={wrapClass('pres', entrance('e0'))} data-w="pres" style={{ position: 'absolute', left: 755, top: 0, width: 210, height: 66, pointerEvents: 'none' }}>
                      <div data-node="pres" style={{ ...boxBase, border: '1px solid hsl(var(--accent))', boxShadow: '0 3px 14px -9px rgba(31,15,77,.55)' }}>
                        <span style={{ fontFamily: serif, fontSize: 23, lineHeight: 1.1, letterSpacing: '-0.015em', color: 'hsl(var(--accent))', fontWeight: 600 }}>President</span>
                      </div>
                    </div>

                    <div className={wrapClass('advisors', entrance('e3'))} data-w="advisors" style={{ position: 'absolute', left: 422, top: 12, width: 156, height: 44, pointerEvents: 'none' }}>
                      <div data-node="advisors" style={{ ...boxBase, border: '1px solid hsl(var(--separator))' }}>
                        <span style={{ fontFamily: serif, fontSize: 23, lineHeight: 1.15, letterSpacing: '-0.01em', color: 'hsl(var(--accent))', fontWeight: 400 }}>Advisors</span>
                      </div>
                    </div>

                    <div className={wrapClass('vp', entrance('e1'))} data-w="vp" style={{ position: 'absolute', left: 765, top: 118, width: 190, height: 52, pointerEvents: 'none' }}>
                      <div data-node="vp" style={{ ...boxBase, border: '1px solid hsl(var(--accent))' }}>
                        <span style={headText}>Vice President</span>
                      </div>
                    </div>

                    <div className={wrapClass('hoam', entrance('e2'))} data-w="hoam" style={{ position: 'absolute', left: 716, top: 236, width: 288, height: 54, pointerEvents: 'none' }}>
                      <div data-node="hoam" style={{ ...boxBase, padding: '0 14px', border: '1px solid hsl(var(--accent))' }}>
                        <span style={headText}>Head of Asset Management</span>
                      </div>
                    </div>

                    <div className={wrapClass('media', entrance('e4'))} data-w="media" style={{ position: 'absolute', left: 1202, top: 0, width: 252, height: 72, pointerEvents: 'none' }}>
                      <button
                        type="button"
                        className="oc-n"
                        data-node="media"
                        data-dive="media"
                        aria-expanded={focus === 'media'}
                        aria-controls="oc-sub-media"
                        aria-label="Explore Media and Communication"
                        style={{ ...boxBase, padding: '4px 12px 14px', border: '1px solid hsl(var(--accent))', fontFamily: 'inherit', cursor: 'pointer' }}
                      >
                        <span style={headText}>Head of Media and Communication</span>
                        <span className="oc-aff" aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: 4, textAlign: 'center', fontSize: 9, lineHeight: 1, color: 'hsl(var(--accent))' }}>&#9662;</span>
                      </button>
                    </div>

                    <div
                      className={`oc-sub${focus === 'media' ? ' on' : ''}`}
                      data-sub="media"
                      id="oc-sub-media"
                      role="region"
                      aria-label="Media and Communication team"
                      aria-hidden={focus === 'media' ? 'false' : 'true'}
                      tabIndex={-1}
                      style={{ position: 'absolute', left: 1244, top: 96, width: 168, height: 44, outline: 'none', pointerEvents: 'none' }}
                    >
                      <div className="oc-w" data-w="media_an" style={{ position: 'absolute', left: 0, top: 0, width: 168, height: 44, pointerEvents: 'none' }}>
                        <div data-node="media_an" style={{ ...boxBase, background: 'hsl(var(--accent-soft) / 0.14)' }}>
                          <span style={rankText}>Media Analysts</span>
                        </div>
                      </div>
                    </div>

                    <div className={wrapClass('ops', entrance('e5'))} data-w="ops" style={{ position: 'absolute', left: 1005, top: 177, width: 236, height: 52, pointerEvents: 'none' }}>
                      <div data-node="ops" style={{ ...boxBase, padding: '0 12px', border: '1px solid hsl(var(--accent))' }}>
                        <span style={headText}>Head of Operations</span>
                      </div>
                    </div>

                    <div role="group" aria-label="Asset Management divisions" style={{ position: 'absolute', left: 0, top: 0, width: WORLD_W, height: WORLD_H, pointerEvents: 'none' }}>
                      {ORDER.map((key, i) => (
                        <div
                          key={key}
                          className={wrapClass(`cell_${key}`, entrance(`c${i}`))}
                          data-w={`cell_${key}`}
                          style={{ position: 'absolute', left: SUBTREES[key].cellLeft, top: 388, width: CELL_W, height: 104, pointerEvents: 'none' }}
                        >
                          <button
                            type="button"
                            className="oc-n"
                            data-node={`cell_${key}`}
                            data-dive={key}
                            aria-expanded={focus === key}
                            aria-controls={`oc-sub-${key}`}
                            aria-label={`Explore ${CELL[key].label}`}
                            style={{ ...boxBase, padding: '6px 10px 16px', border: '1px solid hsl(var(--accent))', fontFamily: 'inherit', cursor: 'pointer' }}
                          >
                            <span style={headText}>{HEADS[key]}</span>
                            <span className="oc-aff" aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: 5, textAlign: 'center', fontSize: 9, lineHeight: 1, color: 'hsl(var(--accent))' }}>&#9662;</span>
                          </button>
                        </div>
                      ))}
                    </div>

                    {ORDER.map((key) => renderSubTree(key))}

                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {isStacked && renderStacked()}

      {/* The outline every screen reader and search engine gets, whichever
          view is on screen. */}
      <nav className="sr-only" aria-label="Full organisational structure outline">
        <ul>
          <li>
            <Link to="/people/members?division=executive">President</Link>
            <ul>
              <li>
                <Link to="/people/members?division=executive">Vice President</Link>
                <ul>
                  <li>
                    <Link to="/people/members?division=executive">Head of Asset Management</Link>
                    <ul>
                      {ORDER.map((key) => (
                        <li key={key}>
                          <Link to={`/people/members?division=${key}`}>{HEADS[key]}</Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                </ul>
              </li>
              <li><Link to="/people/members?division=executive">Advisors</Link></li>
            </ul>
          </li>
          <li>
            <Link to="/people/members?division=media-ops">Head of Media and Communication</Link>
            <ul><li><Link to="/people/members?division=media-ops">Media Analysts</Link></li></ul>
          </li>
          <li><Link to="/people/members?division=media-ops">Head of Operations</Link></li>
          <li><Link to="/people/members">All members of the Society</Link></li>
        </ul>
      </nav>

      <div style={{ textAlign: 'center', marginTop: 52 }}>
        <a
          ref={ctaRef}
          href="/people/members"
          className="cta-link"
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', minWidth: 'min(392px,100%)' }}
        >
          <span ref={ctaTextRef} aria-live="polite" style={{ display: 'inline-block', opacity: 1 }}>Meet the Team</span>
        </a>
      </div>
    </div>
  );
}

export default OrgChart;
