import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject, type RefObject } from 'react';
import { ChevronLeft, ChevronRight, Rewind, SkipForward } from 'lucide-react';
import type { TimeMachineSemester } from '@/lib/rosters-api';

// =====================================================================
// THE MACHINE (Step 110), People > Time Machine.
// ---------------------------------------------------------------------
// Step 108 put a small chronometer in a navy band at the top of a light
// page; its rings changed speed by swapping CSS animation durations,
// which makes a ring jump to wherever the new duration says it should
// be, and its hand swept across the semester printed under it. Step 110
// makes the whole page the machine, in the design system's own dark
// theme with the Society's purple:
//
//   THE DIAL     a gauge of the Society's whole history, from its first
//                recorded semester (bottom left) to the present (bottom
//                right). The needle points at the destination; the arc
//                between the destination and the present is how far back
//                the trip goes. The season and the year sit alone in the
//                middle, where the needle never reaches.
//   THE RAIL     every semester on one line, grouped by year: press one
//                to set it as the destination.
//   THE CONTROLS the season and the year, set one at a time, and Travel.
//
// A trip, pressed: the machine charges, then the needle sweeps back from
// the present to the destination while the semesters roll past in the
// middle of the dial and on the rail, streaks of light run out of the
// dial across the whole page, the rings spin up (by changing their
// playback rate, which never jumps), and a flash clears to the semester.
// Every moving part is driven by one clock, so they cannot drift apart.
//
// It is a way into the list, never in its way: Skip (or Escape) ends a
// trip at once, a semester can be opened from the list below without a
// trip, and under reduced motion there is no trip at all, only the
// arrival. Travelling writes nothing, so the whole console is `data-ro`:
// a reader who may only read the page travels as freely as anyone.
// =====================================================================

export type Phase = 'idle' | 'charging' | 'travelling' | 'flash' | 'arrived';

const seasonOf = (key: string): 'spring' | 'fall' => (key.endsWith('-fall') ? 'fall' : 'spring');
const yearOf = (key: string) => Number(key.slice(0, 4));
const ordinal = (key: string) => yearOf(key) * 2 + (seasonOf(key) === 'fall' ? 1 : 0);
const labelOf = (key: string) => `${seasonOf(key) === 'fall' ? 'Fall' : 'Spring'} ${yearOf(key)}`;
const keyOf = (ord: number) => `${Math.floor(ord / 2)}-${ord % 2 ? 'fall' : 'spring'}`;

const CHARGE_MS = 620;
const FLASH_MS = 420;
/** The sweep: longer the further back, within reason. */
const tripMs = (semesters: number) => Math.max(1300, Math.min(2800, 900 + semesters * 150));

/** The gauge runs from -135 degrees (the first semester) to +135 (the present). */
const ARC = 135;

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** A point on the dial: `a` in degrees clockwise from the top. */
function pt(a: number, r: number, c = 160): [number, number] {
  const rad = (a * Math.PI) / 180;
  return [c + r * Math.sin(rad), c - r * Math.cos(rad)];
}
function arcPath(a1: number, a2: number, r: number): string {
  if (a2 - a1 < 0.05) return '';
  const [x1, y1] = pt(a1, r);
  const [x2, y2] = pt(a2, r);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

// ---------------------------------------------------------------------
// THE LIGHT OF THE TRIP, over the whole page.
// ---------------------------------------------------------------------

/** What the console tells the light: how strong, and where the dial is. */
export interface WarpEngine {
  intensity: number;
  /** A trip is on: the light keeps running, even while it is still dark. */
  active?: boolean;
  cx: number;
  cy: number;
  /** Set by TimeWarp once it is on the page. */
  run?: () => void;
}

export function useWarpEngine() {
  return useRef<WarpEngine>({ intensity: 0, cx: 0, cy: 0 });
}

/** HSL triplet of a design-system colour, for the canvas. */
function tokenHsl(el: HTMLElement, name: string, fallback: string): string {
  const raw = getComputedStyle(el).getPropertyValue(name).trim();
  const m = raw.match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  return m ? `${m[1]}, ${m[2]}%, ${m[3]}%` : fallback;
}

export function TimeWarp({ engine, stageRef }: { engine: MutableRefObject<WarpEngine>; stageRef: RefObject<HTMLElement> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf = 0;
    let running = false;
    type Streak = { a: number; r: number; v: number; w: number; tint: boolean };
    const spawn = (maxR: number, near = false): Streak => ({
      a: Math.random() * Math.PI * 2,
      r: near ? 10 + Math.random() * 60 : 10 + Math.random() * maxR,
      v: 0.6 + Math.random() * 1.8,
      w: 0.6 + Math.random() * 1.4,
      tint: Math.random() < 0.7,
    });

    const run = () => {
      const stage = stageRef.current;
      const ctx = canvas.getContext('2d');
      if (running || !stage || !ctx) return;
      running = true;
      // Only the part of the page in view: the pane scrolls, and a canvas
      // as tall as a long semester would cost memory for nothing.
      const pane = stage.closest('[data-ws-pane]') as HTMLElement | null;
      const width = stage.offsetWidth;
      const height = Math.max(240, Math.min(stage.offsetHeight, pane?.clientHeight ?? stage.offsetHeight));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const accent = tokenHsl(stage, '--accent', '252, 68%, 60%');
      const light = tokenHsl(stage, '--foreground', '0, 0%, 95%');
      const maxR = Math.hypot(width, height);
      const streaks = Array.from({ length: width < 600 ? 90 : 170 }, () => spawn(maxR));
      let last = performance.now();

      const frame = (now: number) => {
        const dt = Math.min(48, now - last) / 16.67;
        last = now;
        const k = Math.max(0, Math.min(1, engine.current.intensity));
        ctx.clearRect(0, 0, width, height);
        if (k <= 0.002 && !engine.current.active) { running = false; return; }
        const { cx, cy } = engine.current;
        // A faint bloom behind the dial while the light runs.
        const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.6);
        bloom.addColorStop(0, `hsla(${accent}, ${0.22 * k})`);
        bloom.addColorStop(1, `hsla(${accent}, 0)`);
        ctx.fillStyle = bloom;
        ctx.fillRect(0, 0, width, height);
        ctx.lineCap = 'round';
        for (const s of streaks) {
          s.r += s.v * (0.6 + 14 * k * k) * dt;
          if (s.r > maxR) Object.assign(s, spawn(maxR, true));
          const len = 2 + 140 * k * k * (0.25 + s.r / maxR);
          const cos = Math.cos(s.a);
          const sin = Math.sin(s.a);
          const fade = Math.min(1, s.r / 120);
          ctx.strokeStyle = `hsla(${s.tint ? accent : light}, ${(0.25 + 0.55 * k) * fade})`;
          ctx.lineWidth = s.w * (0.6 + k);
          ctx.beginPath();
          ctx.moveTo(cx + cos * s.r, cy + sin * s.r);
          ctx.lineTo(cx + cos * (s.r + len), cy + sin * (s.r + len));
          ctx.stroke();
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };

    engine.current.run = run;
    return () => {
      cancelAnimationFrame(raf);
      running = false;
      engine.current.run = undefined;
    };
  }, [engine, stageRef]);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-0" />;
}

// ---------------------------------------------------------------------
// THE DIAL.
// ---------------------------------------------------------------------

interface DialHandles {
  needle: RefObject<HTMLDivElement>;
  arc: RefObject<SVGPathElement>;
  rings: RefObject<HTMLDivElement>;
}

function Dial({ handles, firstOrd, presentOrd, ticks, season, year, caption, phase }: {
  handles: DialHandles;
  firstOrd: number;
  presentOrd: number;
  /** One tick per semester on the gauge, with whether it is recorded. */
  ticks: { ord: number; angle: number; recorded: boolean }[];
  season: string;
  year: number;
  caption: string;
  phase: Phase;
}) {
  const outer = Array.from({ length: 72 }, (_, i) => i);
  const [startX, startY] = pt(-ARC, 150);
  const [endX, endY] = pt(ARC, 150);
  return (
    <div className="tm-dial relative aspect-square w-[min(100%,15rem)] shrink-0 sm:w-[17.5rem] xl:w-[19rem]" data-phase={phase} aria-hidden="true">
      {/* The bezel and the ring turn; everything else holds still. Each
          turning layer is a box of its own, turned about its own centre. */}
      <div ref={handles.rings} className="absolute inset-0">
        <svg viewBox="0 0 320 320" className="tm-bezel absolute inset-0 h-full w-full text-foreground">
          {outer.map((i) => {
            const a = (i / 72) * 360;
            const long = i % 6 === 0;
            const [x1, y1] = pt(a, long ? 150 : 154);
            const [x2, y2] = pt(a, 158);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeOpacity={long ? 0.55 : 0.22} strokeWidth={long ? 1.6 : 1} />;
          })}
        </svg>
        <svg viewBox="0 0 320 320" className="tm-ring absolute inset-0 h-full w-full text-accent">
          <circle cx="160" cy="160" r="136" fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="2 10" />
        </svg>
      </div>

      <svg viewBox="0 0 320 320" className="absolute inset-0 h-full w-full">
        {/* The gauge: the history, and how far back the trip goes. */}
        <path d={arcPath(-ARC, ARC, 120)} fill="none" className="stroke-foreground" strokeOpacity="0.12" strokeWidth="10" strokeLinecap="round" />
        {/* Drawn by the console alone (never by React), so a trip and a
            re-render can never disagree about where it ends. */}
        <path ref={handles.arc} fill="none" className="tm-arc stroke-accent" strokeWidth="10" strokeLinecap="round" />
        {ticks.map((t) => {
          const [x1, y1] = pt(t.angle, 110);
          const [x2, y2] = pt(t.angle, t.ord % 2 ? 98 : 104);
          return <line key={t.ord} x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-foreground" strokeOpacity={t.recorded ? 0.6 : 0.2} strokeWidth={t.ord % 2 ? 1.6 : 1} />;
        })}
        <text x={startX} y={startY + 4} textAnchor="middle" className="fill-muted-foreground font-body" fontSize="12">{Math.floor(firstOrd / 2)}</text>
        <text x={endX} y={endY + 4} textAnchor="middle" className="fill-accent font-body" fontSize="12">Now</text>
        <circle cx="160" cy="160" r="84" className="fill-card stroke-foreground" strokeOpacity="0.14" strokeWidth="1" />
      </svg>

      {/* The needle: from the edge of the face to the gauge, never across the middle. */}
      <div ref={handles.needle} className="tm-needle absolute inset-0">
        <svg viewBox="0 0 320 320" className="absolute inset-0 h-full w-full">
          <line x1="160" y1="74" x2="160" y2="22" className="stroke-accent" strokeWidth="3" strokeLinecap="round" />
          <circle cx="160" cy="22" r="4.5" className="fill-accent" />
          <line x1="160" y1="74" x2="160" y2="22" className="stroke-foreground" strokeOpacity="0.85" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">{caption}</span>
        <span className="mt-1 text-xs uppercase tracking-[0.3em] text-accent">{season}</span>
        <span className="font-serif text-[2.6rem] leading-none tabular-nums text-foreground sm:text-5xl">{year}</span>
      </div>
      <span className="sr-only">{presentOrd}</span>
    </div>
  );
}

// ---------------------------------------------------------------------
// THE RAIL: every semester, grouped by year.
// ---------------------------------------------------------------------

function Rail({ firstOrd, presentOrd, recorded, destKey, passingKey, onPick, disabled }: {
  firstOrd: number;
  presentOrd: number;
  recorded: Set<string>;
  destKey: string;
  passingKey: string | null;
  onPick: (key: string) => void;
  disabled: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const years: number[] = [];
  for (let y = Math.floor(firstOrd / 2); y <= Math.floor(presentOrd / 2); y++) years.push(y);
  const focusKey = passingKey ?? destKey;

  // Keep the destination (or the semester passing) in view, moving the
  // rail alone and never the page.
  useEffect(() => {
    const box = scroller.current;
    const node = box?.querySelector<HTMLElement>(`[data-key="${focusKey}"]`);
    if (!box || !node) return;
    const left = node.offsetLeft - box.clientWidth / 2 + node.offsetWidth / 2;
    box.scrollTo({ left, behavior: passingKey || reducedMotion() ? 'auto' : 'smooth' });
  }, [focusKey, passingKey]);

  return (
    <div ref={scroller} className="tm-rail -mx-1 overflow-x-auto px-1 pb-2" role="group" aria-label="Every semester">
      {/* The years share the width; below about 5 rem a year, the rail scrolls. */}
      <ol className="grid grid-flow-col auto-cols-[minmax(5.25rem,1fr)] items-end">
        {years.map((y) => (
          <li key={y} className="flex min-w-0 flex-col items-stretch border-l border-separator/70 px-1.5 first:border-l-0">
            <span className="mb-1.5 text-center text-[11px] tabular-nums tracking-wider text-muted-foreground">{y}</span>
            <span className="flex gap-1">
              {(['spring', 'fall'] as const).map((sn) => {
                const ord = y * 2 + (sn === 'fall' ? 1 : 0);
                if (ord < firstOrd || ord > presentOrd) return <span key={sn} className="min-w-0 flex-1" aria-hidden="true" />;
                const key = keyOf(ord);
                const present = ord === presentOrd;
                const known = recorded.has(key);
                const chosen = key === destKey;
                const passing = key === passingKey;
                return (
                  <button
                    key={sn}
                    type="button"
                    data-key={key}
                    disabled={disabled || present || !known}
                    aria-pressed={chosen}
                    aria-label={present ? `${labelOf(key)}, the present, in People, Members` : known ? labelOf(key) : `${labelOf(key)}, no record`}
                    title={present ? 'The present is in People, Members' : known ? labelOf(key) : 'No record of this semester'}
                    onClick={() => onPick(key)}
                    className={`tm-node relative flex h-11 min-w-0 flex-1 flex-col items-center justify-center rounded-md border text-[11px] transition-colors disabled:cursor-default ${
                      chosen ? 'border-accent bg-accent text-accent-foreground'
                        : passing ? 'border-accent/80 bg-accent/25 text-foreground'
                          : present ? 'border-dashed border-accent/60 text-accent'
                            : known ? 'border-separator bg-muted/40 text-foreground hover:border-accent/70 hover:bg-accent/15'
                              : 'border-separator/50 text-muted-foreground/50'}`}
                  >
                    <span className="font-medium">{present ? 'Now' : sn === 'fall' ? 'Fall' : 'Spr'}</span>
                  </button>
                );
              })}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------
// THE CONSOLE.
// ---------------------------------------------------------------------

export interface TravelRequest { key: string; n: number }

export function TimeMachineConsole({ semesters, currentKey, currentLabel, onArrive, onPhase, engine, request }: {
  /** Every past semester, newest first (the Time Machine's own list). */
  semesters: TimeMachineSemester[];
  currentKey: string;
  currentLabel: string;
  /** The trip is over: show this semester. */
  onArrive: (key: string) => void;
  /** Where the trip is, for the page around the console. */
  onPhase?: (phase: Phase) => void;
  /** The light over the page. */
  engine: MutableRefObject<WarpEngine>;
  /** A trip asked for from outside the console (a semester or a person in the list below). */
  request?: TravelRequest | null;
}) {
  const recorded = useMemo(() => new Set(semesters.map((s) => s.key)), [semesters]);
  const years = useMemo(() => [...new Set(semesters.map((s) => yearOf(s.key)))].sort((a, b) => a - b), [semesters]);
  const newest = semesters[0]?.key ?? null;
  const presentOrd = ordinal(currentKey);
  const firstOrd = semesters.length ? Math.min(...semesters.map((s) => ordinal(s.key))) : presentOrd - 1;
  const span = Math.max(1, presentOrd - firstOrd);
  const angleOf = useCallback((ord: number) => -ARC + (2 * ARC * (ord - firstOrd)) / span, [firstOrd, span]);

  const [season, setSeason] = useState<'spring' | 'fall'>(newest ? seasonOf(newest) : 'fall');
  const [year, setYear] = useState<number>(newest ? yearOf(newest) : new Date().getFullYear());
  const target = `${year}-${season}`;
  const known = recorded.has(target);

  const [phase, setPhaseState] = useState<Phase>('idle');
  const phaseRef = useRef<Phase>('idle');
  const setPhase = useCallback((p: Phase) => { phaseRef.current = p; setPhaseState(p); onPhase?.(p); }, [onPhase]);
  const [passing, setPassing] = useState<string | null>(null);
  const [arrivedKey, setArrivedKey] = useState<string | null>(null);

  const needle = useRef<HTMLDivElement>(null);
  const arc = useRef<SVGPathElement>(null);
  const rings = useRef<HTMLDivElement>(null);
  const dialBox = useRef<HTMLDivElement>(null);
  const spin = useRef<Animation[]>([]);
  const raf = useRef(0);
  const tripTarget = useRef(target);

  // The rings turn slowly at rest, through the Web Animations API, so a
  // trip can speed them up by their playback rate without a jump.
  useEffect(() => {
    const box = rings.current;
    if (!box || reducedMotion() || typeof box.animate !== 'function') return;
    const [bezel, ring] = Array.from(box.children) as HTMLElement[];
    spin.current = [
      bezel.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 180000, iterations: Infinity }),
      ring.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-360deg)' }], { duration: 90000, iterations: Infinity }),
    ];
    return () => { spin.current.forEach((a) => a.cancel()); spin.current = []; };
  }, []);

  const setRate = (rate: number) => spin.current.forEach((a) => {
    if (typeof a.updatePlaybackRate === 'function') a.updatePlaybackRate(rate); else a.playbackRate = rate;
  });

  const destAngle = angleOf(ordinal(target));
  // Where the needle is now, so a move starts from it and never jumps.
  const angleNow = useRef(destAngle);
  const placeNeedle = (angle: number) => {
    angleNow.current = angle;
    if (needle.current) needle.current.style.transform = `rotate(${angle}deg)`;
    if (arc.current) arc.current.setAttribute('d', arcPath(angle, ARC, 120));
  };
  // At rest, a new destination is reached in a short eased swing of the
  // needle and its arc together.
  const tween = useRef(0);
  const swingTo = (angle: number) => {
    cancelAnimationFrame(tween.current);
    const from = angleNow.current;
    if (reducedMotion() || Math.abs(angle - from) < 0.01) { placeNeedle(angle); return; }
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 480);
      placeNeedle(from + (angle - from) * easeInOut(p));
      if (p < 1) tween.current = requestAnimationFrame(step);
    };
    tween.current = requestAnimationFrame(step);
  };

  useEffect(() => () => { cancelAnimationFrame(raf.current); cancelAnimationFrame(tween.current); engine.current.intensity = 0; engine.current.active = false; }, [engine]);

  const arrive = useCallback((key: string) => {
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    engine.current.intensity = 0;
    engine.current.active = false;
    spin.current.forEach((a) => { if (typeof a.updatePlaybackRate === 'function') a.updatePlaybackRate(1); else a.playbackRate = 1; });
    cancelAnimationFrame(tween.current);
    placeNeedle(angleOf(ordinal(key)));
    setPassing(null);
    setArrivedKey(key);
    setPhase('arrived');
    onArrive(key);
  }, [angleOf, engine, onArrive, setPhase]);

  const go = (dest: string) => {
    if (!recorded.has(dest) || (phaseRef.current !== 'idle' && phaseRef.current !== 'arrived')) return;
    tripTarget.current = dest;
    if (reducedMotion()) { arrive(dest); return; }

    // The light starts from the dial, wherever the page has put it.
    const stage = dialBox.current?.closest('.tm-root') as HTMLElement | null;
    const dial = dialBox.current?.querySelector('.tm-dial') as HTMLElement | null;
    if (stage && dial) {
      const pane = stage.closest('[data-ws-pane]') as HTMLElement | null;
      // The trip is watched from the top of the page.
      if (pane && pane.scrollTop > 0) pane.scrollTo({ top: 0, behavior: 'auto' });
      const s = stage.getBoundingClientRect();
      const d = dial.getBoundingClientRect();
      // Rectangles are in the window's pixels; the canvas is in the page's,
      // which differ by the workspace's 90% (src/lib/workspace-scale.ts).
      const k = stage.offsetWidth ? s.width / stage.offsetWidth : 1;
      engine.current.cx = (d.left + d.width / 2 - s.left) / k;
      engine.current.cy = (d.top + d.height / 2 - s.top) / k;
    }

    cancelAnimationFrame(tween.current);
    const fromOrd = presentOrd;
    const toOrd = ordinal(dest);
    const trip = tripMs(fromOrd - toOrd);
    const startAngle = angleNow.current;
    const t0 = performance.now();
    setArrivedKey(null);
    setPhase('charging');
    setPassing(null);
    engine.current.intensity = 0;
    engine.current.active = true;
    engine.current.run?.();
    let lastShown = '';

    const frame = (now: number) => {
      const t = now - t0;
      if (t < CHARGE_MS) {
        const p = t / CHARGE_MS;
        engine.current.intensity = 0.18 * p;
        setRate(1 + 40 * p * p);
        // The needle swings to the present, ready to sweep back.
        placeNeedle(startAngle + (angleOf(fromOrd) - startAngle) * easeInOut(p));
      } else if (t < CHARGE_MS + trip) {
        if (phaseRef.current !== 'travelling') setPhase('travelling');
        const q = (t - CHARGE_MS) / trip;
        const e = easeInOut(q);
        const ord = fromOrd - (fromOrd - toOrd) * e;
        placeNeedle(angleOf(ord));
        engine.current.intensity = 0.18 + 0.82 * Math.sin(Math.PI * Math.min(1, q * 1.15));
        setRate(-(40 + 260 * Math.sin(Math.PI * q)));
        const shown = keyOf(Math.round(ord));
        if (shown !== lastShown) { lastShown = shown; setPassing(shown); }
      } else if (t < CHARGE_MS + trip + FLASH_MS) {
        if (phaseRef.current !== 'flash') { setPhase('flash'); setPassing(dest); placeNeedle(angleOf(toOrd)); }
        const f = (t - CHARGE_MS - trip) / FLASH_MS;
        engine.current.intensity = Math.max(0, 0.4 * (1 - f));
        setRate(1 + 20 * (1 - f));
      } else {
        arrive(dest);
        return;
      }
      raf.current = requestAnimationFrame(frame);
    };
    raf.current = requestAnimationFrame(frame);
  };

  const running = phase === 'charging' || phase === 'travelling' || phase === 'flash';
  const skip = () => arrive(tripTarget.current);

  // Escape ends a trip at once.
  useEffect(() => {
    if (!running) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); skip(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // A trip asked for from the list below: set the destination, then go.
  const lastRequest = useRef<number | null>(null);
  useEffect(() => {
    if (!request || request.n === lastRequest.current) return;
    lastRequest.current = request.n;
    if (!recorded.has(request.key)) return;
    setSeason(seasonOf(request.key));
    setYear(yearOf(request.key));
    if (phaseRef.current === 'arrived') setPhase('idle');
    // After the controls show the destination, so the trip starts from it.
    window.setTimeout(() => go(request.key), 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  // The needle's first position, before the first paint.
  useLayoutEffect(() => { placeNeedle(destAngle); /* once */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // While idle, the needle and the arc follow the destination.
  useLayoutEffect(() => {
    if (phaseRef.current === 'charging' || phaseRef.current === 'travelling' || phaseRef.current === 'flash') return;
    if (phaseRef.current === 'arrived') return;
    swingTo(destAngle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destAngle]);

  const choose = (sn: 'spring' | 'fall', y: number) => {
    setSeason(sn);
    setYear(y);
    if (phaseRef.current === 'arrived') setPhase('idle');
  };

  if (!semesters.length) return null;

  const windowKey = running ? (passing ?? currentKey) : phase === 'arrived' && arrivedKey ? arrivedKey : target;
  const caption = phase === 'charging' ? 'Charging' : running ? 'Passing' : phase === 'arrived' ? 'Arrived' : 'Destination';
  const distance = presentOrd - ordinal(target);
  const yearIndex = years.indexOf(year);
  const firstLabel = labelOf(keyOf(firstOrd));
  const ticks = Array.from({ length: span + 1 }, (_, i) => {
    const ord = firstOrd + i;
    return { ord, angle: angleOf(ord), recorded: recorded.has(keyOf(ord)) || ord === presentOrd };
  });
  const arrived = phase === 'arrived' && arrivedKey ? semesters.find((s) => s.key === arrivedKey) ?? null : null;

  return (
    <section
      ref={dialBox}
      data-ro
      aria-labelledby="tm-console-title"
      className="tm-console relative grid items-center gap-6 rounded-2xl border border-separator/80 bg-card/60 p-4 backdrop-blur-[2px] sm:p-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-10"
      data-phase={phase}
    >
      <h2 id="tm-console-title" className="sr-only">The machine</h2>
      <div className="flex justify-center">
        <Dial
          handles={{ needle, arc, rings }}
          firstOrd={firstOrd}
          presentOrd={presentOrd}
          ticks={ticks}
          season={seasonOf(windowKey) === 'fall' ? 'Fall' : 'Spring'}
          year={yearOf(windowKey)}
          caption={caption}
          phase={phase}
        />
      </div>

      <div className="min-w-0 space-y-5">
        {/* The three readings of an instrument: where you are, where you
            are going, and how far that is. */}
        <dl className="grid grid-cols-3 gap-2 text-left">
          {[
            ['Present', currentLabel],
            ['Destination', known ? labelOf(target) : 'No record'],
            ['Distance', known ? `${distance} ${distance === 1 ? 'semester' : 'semesters'} back` : '-'],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-separator/80 bg-background/60 px-3 py-2">
              <dt className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{k}</dt>
              <dd className={`mt-0.5 truncate font-serif text-base sm:text-lg ${k === 'Destination' ? 'text-accent' : 'text-foreground'}`}>{v}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
          <div>
            <span className="mb-1 block text-[10px] uppercase tracking-[0.22em] text-muted-foreground" id="tm-season-label">Season</span>
            <div className="inline-flex rounded-lg border border-separator p-0.5" role="radiogroup" aria-labelledby="tm-season-label">
              {(['spring', 'fall'] as const).map((sn) => (
                <button
                  key={sn}
                  type="button"
                  role="radio"
                  aria-checked={season === sn}
                  disabled={running}
                  onClick={() => choose(sn, year)}
                  className={`h-10 rounded-md px-4 text-sm transition-colors max-lg:h-11 ${season === sn ? 'bg-foreground text-background' : 'text-foreground/80 hover:bg-muted'}`}
                >
                  {sn === 'fall' ? 'Fall' : 'Spring'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="mb-1 block text-[10px] uppercase tracking-[0.22em] text-muted-foreground" id="tm-year-label">Year</span>
            <div className="flex items-center gap-1.5" role="group" aria-labelledby="tm-year-label">
              <button type="button" disabled={running || yearIndex <= 0} onClick={() => choose(season, years[yearIndex - 1])}
                className="flex h-11 w-10 items-center justify-center rounded-md border border-separator hover:bg-muted disabled:opacity-35 lg:h-10" aria-label="An earlier year">
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="inline-flex gap-1" aria-hidden="true">
                {String(year).split('').map((d, i) => (
                  <span key={i} className="relative flex h-11 w-8 items-center justify-center overflow-hidden rounded-md border border-separator bg-background/70 font-serif text-2xl tabular-nums lg:h-10">
                    <span key={`${i}-${d}`} className="tm-digit-in block">{d}</span>
                  </span>
                ))}
              </span>
              <span className="sr-only" aria-live="polite">{year}</span>
              <button type="button" disabled={running || yearIndex < 0 || yearIndex >= years.length - 1} onClick={() => choose(season, years[yearIndex + 1])}
                className="flex h-11 w-10 items-center justify-center rounded-md border border-separator hover:bg-muted disabled:opacity-35 lg:h-10" aria-label="A later year">
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-end gap-2 max-sm:w-full">
            {running && (
              <button type="button" onClick={skip} className="inline-flex h-11 items-center gap-1.5 rounded-md px-3 text-sm text-muted-foreground hover:text-foreground">
                <SkipForward className="h-4 w-4" aria-hidden="true" />Skip
              </button>
            )}
            <button
              type="button"
              onClick={() => go(target)}
              disabled={!known || running}
              className="tm-travel inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-accent px-6 font-serif text-lg text-accent-foreground transition-transform hover:-translate-y-px disabled:translate-y-0 disabled:opacity-45 max-sm:flex-1"
            >
              <Rewind className="h-5 w-5" aria-hidden="true" />
              {running ? 'Travelling' : `Travel to ${labelOf(target)}`}
            </button>
          </div>
        </div>

        <Rail
          firstOrd={firstOrd}
          presentOrd={presentOrd}
          recorded={recorded}
          destKey={target}
          passingKey={running ? passing : null}
          onPick={(k) => choose(seasonOf(k), yearOf(k))}
          disabled={running}
        />

        <p className="min-h-[1.5rem] text-sm" aria-live="polite">
          {!known && !running ? (
            <span className="text-muted-foreground">No record of {labelOf(target)}: the history runs from {firstLabel} to {labelOf(semesters[0].key)}.</span>
          ) : phase === 'charging' ? (
            <span className="text-muted-foreground">Charging.</span>
          ) : phase === 'travelling' || phase === 'flash' ? (
            <span className="text-muted-foreground">Passing {labelOf(windowKey)}.</span>
          ) : arrived ? (
            <span className="tm-arrival text-foreground">Arrived in {arrived.label}. Press Escape to stop a trip at any time.</span>
          ) : (
            <span className="text-muted-foreground">Ready. Choose a season and a year, or a semester on the rail, then travel.</span>
          )}
        </p>
      </div>
    </section>
  );
}
