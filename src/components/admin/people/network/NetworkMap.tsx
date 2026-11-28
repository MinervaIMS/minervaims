import { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';
import type { NetworkPerson, NetworkTieRow } from '@/lib/people-network-api';

// =====================================================================
// The map of the network (People > Network, Steps 111 and 112).
// ---------------------------------------------------------------------
// Each person where the analysis laid them out (the same places for
// everyone, computed on the server), coloured by their division and sized
// by their overall position; the ties drawn faintly, stronger ones darker.
// Choosing a person lights up their own ties; choosing a division in the
// key keeps it in full colour and greys the rest.
//
// Zoom with the buttons, or a pinch on a trackpad, around the pointer;
// drag to move. People keep their size on screen at every zoom, so a dense
// centre opens up rather than growing.
//
// Two canvases: the drawing, redone only when something it shows
// changes, and above it the name under the pointer. A pointer is read as
// a share of the box it is drawn in, so the workspace's 90% scale
// (Step 103) cannot move it off its person.
// =====================================================================

const HEIGHT_DESK = 560;
const HEIGHT_PHONE = 400;
const PAD = 26;
/** Names always written on the map: the first of the overall ranking. */
const LABELLED = 10;
const MIN_ZOOM = 1;
const MAX_ZOOM = 6;

function cssColour(el: Element, value: string): string {
  const m = /^var\((--[a-z0-9-]+)\)$/.exec(value);
  if (!m) return value;
  const v = getComputedStyle(el).getPropertyValue(m[1]).trim();
  return v || '#888888';
}

function hslVar(el: Element, name: string, alpha = 1): string {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v ? `hsl(${v} / ${alpha})` : `rgba(120,120,120,${alpha})`;
}

interface View { k: number; tx: number; ty: number }

export function NetworkMap({ people, ties, selected, onSelect, colourOf, focus = null }: {
  people: NetworkPerson[];
  ties: NetworkTieRow[];
  selected: number | null;
  onSelect: (index: number | null) => void;
  /** The colour of a person: their division's. */
  colourOf: (person: NetworkPerson) => string;
  /** A division to keep in colour, the rest greyed. */
  focus?: string | null;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLCanvasElement>(null);
  const over = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [view, setView] = useState<View>({ k: 1, tx: 0, ty: 0 });
  const drag = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null);
  const height = width && width < 640 ? HEIGHT_PHONE : HEIGHT_DESK;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Where each person is drawn at zoom 1, in the canvas's own pixels.
  const placed = useMemo(() => {
    const w = Math.max(0, width - 2 * PAD);
    const h = Math.max(0, height - 2 * PAD);
    // The layout is square; it may stretch sideways by half again to use
    // a wide box, which keeps who is near whom.
    const sideY = Math.min(w, h);
    const sideX = Math.min(w, sideY * 1.5);
    const ox = PAD + (w - sideX) / 2;
    const oy = PAD + (h - sideY) / 2;
    return people.map((p) => (p.x === null || p.y === null
      ? null
      : { x: ox + p.x * sideX, y: oy + p.y * sideY, r: 2.5 + 8 * Math.pow(Math.max(0, p.overall), 3) }));
  }, [people, width, height]);

  /** On screen, at the current zoom. */
  const screen = useMemo(() => placed.map((pt) => (pt ? { x: pt.x * view.k + view.tx, y: pt.y * view.k + view.ty, r: pt.r } : null)), [placed, view]);

  const maxWeight = useMemo(() => ties.reduce((m, t) => Math.max(m, t[2]), 0) || 1, [ties]);

  useEffect(() => {
    const canvas = base.current;
    const el = wrap.current;
    if (!canvas || !el || !width) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const chosen = selected !== null;
    const inFocus = (i: number) => focus === null || (people[i]?.division ?? 'other') === focus;
    // Ties, weakest first so the strong ones sit on top.
    const order = ties.map((_, i) => i).sort((a, b) => ties[a][2] - ties[b][2]);
    ctx.lineWidth = 1;
    for (const i of order) {
      const t = ties[i];
      const a = screen[t[0]];
      const b = screen[t[1]];
      if (!a || !b) continue;
      if (chosen && (t[0] === selected || t[1] === selected)) continue;
      const focus = inFocus(t[0]) && inFocus(t[1]);
      const dim = chosen || !focus;
      const alpha = (dim ? 0.025 : 0.05) + (dim ? 0.04 : 0.3) * Math.sqrt(t[2] / maxWeight);
      ctx.strokeStyle = hslVar(el, '--foreground', alpha);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    if (chosen) {
      ctx.lineWidth = 1.6;
      for (const t of ties) {
        if (t[0] !== selected && t[1] !== selected) continue;
        const a = screen[t[0]];
        const b = screen[t[1]];
        if (!a || !b) continue;
        ctx.strokeStyle = hslVar(el, '--accent', 0.25 + 0.65 * Math.sqrt(t[2] / maxWeight));
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
    // People, the smallest first.
    const byStatus = people.map((_, i) => i).sort((a, b) => people[a].overall - people[b].overall);
    const ring = hslVar(el, '--background', 1);
    const neighbours = new Set<number>();
    if (chosen) for (const t of ties) { if (t[0] === selected) neighbours.add(t[1]); if (t[1] === selected) neighbours.add(t[0]); }
    for (const i of byStatus) {
      const pt = screen[i];
      if (!pt) continue;
      if (pt.x < -20 || pt.y < -20 || pt.x > width + 20 || pt.y > height + 20) continue;
      const lit = chosen ? i === selected || neighbours.has(i) : inFocus(i);
      ctx.globalAlpha = lit ? 1 : 0.18;
      ctx.fillStyle = cssColour(el, colourOf(people[i]));
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = ring; ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (chosen && screen[selected!]) {
      const pt = screen[selected!]!;
      ctx.lineWidth = 2.5; ctx.strokeStyle = hslVar(el, '--accent', 1);
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r + 4, 0, Math.PI * 2); ctx.stroke();
    }
    // Names: the chosen person, then the ranking (more of it when zoomed
    // in). A name that would cover one already written tries the other
    // side, then above and below, and is left out if no place is free.
    const font = getComputedStyle(el).fontFamily || 'sans-serif';
    ctx.font = `12px ${font}`;
    ctx.textBaseline = 'middle';
    const labelled = Math.round(LABELLED * view.k * view.k);
    const named = people.map((p, i) => ({ p, i }))
      .filter(({ p, i }) => i === selected || (p.rank_overall <= labelled && (chosen ? neighbours.has(i) : inFocus(i))))
      .sort((a, b) => (a.i === selected ? -1 : b.i === selected ? 1 : a.p.rank_overall - b.p.rank_overall));
    const taken: { x: number; y: number; w: number; h: number }[] = [];
    const clash = (r: { x: number; y: number; w: number; h: number }) =>
      r.x < 2 || r.x + r.w > width - 2 || r.y < 2 || r.y + r.h > height - 2
      || taken.some((t) => r.x < t.x + t.w && t.x < r.x + r.w && r.y < t.y + t.h && t.y < r.y + r.h);
    for (const { p, i } of named) {
      const pt = screen[i];
      if (!pt) continue;
      const text = p.name;
      const tw = ctx.measureText(text).width;
      const tries = [
        { x: pt.x + pt.r + 4, y: pt.y - 8 },
        { x: pt.x - pt.r - 4 - tw, y: pt.y - 8 },
        { x: pt.x - tw / 2, y: pt.y - pt.r - 18 },
        { x: pt.x - tw / 2, y: pt.y + pt.r + 2 },
      ].map((o) => ({ x: o.x, y: o.y, w: tw, h: 16 }));
      const spot = tries.find((r) => !clash(r)) ?? (i === selected ? tries[0] : null);
      if (!spot) continue;
      taken.push(spot);
      ctx.lineWidth = 3; ctx.strokeStyle = ring; ctx.strokeText(text, spot.x, spot.y + 8);
      ctx.fillStyle = hslVar(el, '--foreground', 0.9); ctx.fillText(text, spot.x, spot.y + 8);
    }
  }, [people, ties, screen, selected, width, height, maxWeight, colourOf, focus, view.k]);

  useEffect(() => {
    const canvas = over.current;
    const el = wrap.current;
    if (!canvas || !el || !width) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (hover === null || !screen[hover]) return;
    const pt = screen[hover]!;
    const p = people[hover];
    const font = getComputedStyle(el).fontFamily || 'sans-serif';
    ctx.font = `13px ${font}`;
    const text = `${p.name}  #${p.rank_overall}`;
    const w = ctx.measureText(text).width + 14;
    const x = Math.min(Math.max(4, pt.x - w / 2), width - w - 4);
    const y = Math.max(4, pt.y - pt.r - 30);
    ctx.fillStyle = hslVar(el, '--foreground', 0.92);
    ctx.fillRect(x, y, w, 22);
    ctx.fillStyle = hslVar(el, '--background', 1);
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + 7, y + 11);
    ctx.lineWidth = 2; ctx.strokeStyle = hslVar(el, '--accent', 1);
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r + 2, 0, Math.PI * 2); ctx.stroke();
  }, [hover, screen, people, width, height]);

  /** A pointer's place in the canvas's own pixels. */
  const local = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const canvas = over.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return { x: ((clientX - rect.left) / rect.width) * width, y: ((clientY - rect.top) / rect.height) * height };
  };

  /** The person under a pointer, within a finger's reach. */
  const at = (clientX: number, clientY: number): number | null => {
    const q = local(clientX, clientY);
    if (!q) return null;
    let best: number | null = null;
    let bestD = 14 * 14;
    screen.forEach((pt, i) => {
      if (!pt) return;
      const d = (pt.x - q.x) ** 2 + (pt.y - q.y) ** 2 - pt.r * pt.r;
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  };

  /** Zoom by a factor around a point of the canvas, keeping the drawing in the box. */
  const zoomAt = (factor: number, cx: number, cy: number) => {
    setView((v) => {
      const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.k * factor));
      if (k === MIN_ZOOM) return { k, tx: 0, ty: 0 };
      const f = k / v.k;
      return clampView({ k, tx: cx - (cx - v.tx) * f, ty: cy - (cy - v.ty) * f });
    });
  };
  /** The buttons zoom around the chosen person, or the middle of the map. */
  const zoomAround = (factor: number) => {
    const pt = selected !== null ? screen[selected] : null;
    zoomAt(factor, pt ? pt.x : width / 2, pt ? pt.y : height / 2);
  };
  const clampView = (v: View): View => {
    const minX = width - width * v.k;
    const minY = height - height * v.k;
    return { k: v.k, tx: Math.min(0, Math.max(minX, v.tx)), ty: Math.min(0, Math.max(minY, v.ty)) };
  };

  // A pinch on a trackpad (and Ctrl with the wheel) zooms; the wheel alone
  // scrolls the page. A listener of its own, because React's wheel
  // handler is passive and could not keep the page itself from zooming.
  const pinch = useRef<(e: WheelEvent) => void>(() => {});
  pinch.current = (e: WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const q = local(e.clientX, e.clientY);
    if (q) zoomAt(Math.exp(-e.deltaY * 0.01), q.x, q.y);
  };
  useEffect(() => {
    const canvas = over.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => pinch.current(e);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  // Two fingers on a touch screen zoom around the point between them.
  const fingers = useRef(new Map<number, { x: number; y: number }>());
  const spread = useRef<{ x: number; y: number; d: number } | null>(null);
  const spreadOf = (): { x: number; y: number; d: number } | null => {
    const [a, b] = [...fingers.current.values()];
    if (!a || !b) return null;
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) };
  };

  return (
    <div ref={wrap} className="relative w-full select-none" style={{ height }} data-network-map>
      <canvas ref={base} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <canvas
        ref={over}
        data-ro
        role="img"
        aria-label={`Map of the network: ${people.length} people. The ranking lists the same people as text.`}
        className={`absolute inset-0 h-full w-full ${hover !== null ? 'cursor-pointer' : view.k > 1 ? 'cursor-grab' : ''}`}
        style={{ touchAction: view.k > 1 ? 'none' : 'pan-y' }}
        onPointerDown={(e) => {
          fingers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (fingers.current.size === 2) {
            // Two fingers: a pinch, not a press or a drag.
            drag.current = null;
            spread.current = spreadOf();
            return;
          }
          drag.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty, moved: false };
        }}
        onPointerMove={(e) => {
          if (fingers.current.has(e.pointerId)) fingers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (fingers.current.size === 2) {
            const now = spreadOf();
            if (now && spread.current && spread.current.d > 0) {
              const q = local(now.x, now.y);
              if (q) zoomAt(now.d / spread.current.d, q.x, q.y);
            }
            spread.current = now;
            return;
          }
          const d = drag.current;
          if (d && view.k > 1 && (e.buttons & 1 || e.pointerType === 'touch')) {
            const rect = over.current!.getBoundingClientRect();
            const sx = width / (rect.width || width);
            const dx = (e.clientX - d.x) * sx;
            const dy = (e.clientY - d.y) * sx;
            if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
            if (d.moved) setView((v) => clampView({ k: v.k, tx: d.tx + dx, ty: d.ty + dy }));
            return;
          }
          if (e.pointerType === 'mouse') setHover(at(e.clientX, e.clientY));
        }}
        onPointerUp={(e) => {
          const pinching = fingers.current.size > 1 || spread.current !== null;
          fingers.current.delete(e.pointerId);
          if (fingers.current.size === 0) spread.current = null;
          const d = drag.current;
          drag.current = null;
          if (pinching || d?.moved || !d) return;
          onSelect(at(e.clientX, e.clientY));
        }}
        onPointerCancel={(e) => {
          fingers.current.delete(e.pointerId);
          if (fingers.current.size < 2) spread.current = null;
          drag.current = null;
        }}
        onPointerLeave={(e) => {
          setHover(null);
          if (e.pointerType === 'mouse') drag.current = null;
        }}
      />
      <div className="absolute left-2 top-2 flex flex-col border border-separator bg-background" data-ro>
        <button type="button" aria-label="Zoom in" onClick={() => zoomAround(1.5)} className="flex h-11 w-11 items-center justify-center lg:h-9 lg:w-9 text-foreground hover:bg-muted/50 disabled:opacity-40" disabled={view.k >= MAX_ZOOM}>
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomAround(1 / 1.5)} className="flex h-11 w-11 items-center justify-center lg:h-9 lg:w-9 border-t border-separator text-foreground hover:bg-muted/50 disabled:opacity-40" disabled={view.k <= MIN_ZOOM}>
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" aria-label="Show the whole network" onClick={() => setView({ k: 1, tx: 0, ty: 0 })} className="flex h-11 w-11 items-center justify-center lg:h-9 lg:w-9 border-t border-separator text-foreground hover:bg-muted/50 disabled:opacity-40" disabled={view.k === 1}>
          <Maximize2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default NetworkMap;
