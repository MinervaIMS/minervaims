// @ts-nocheck
/* ============================================================================
   AlumniGlobe.tsx — MIMS "From Milan to the World" alumni globe
   VERSION 4 · "SOFT ATLAS" (light)
   ----------------------------------------------------------------------------
   An interactive orthographic globe with REAL geography (land · sea · nation
   borders) for the /people/alumni page, replacing the companies-logo strip.

   • Great-circle arcs bow from Milan (home of Bocconi & MIMS) to every city
     with >= 2 MIMS alumni (17 destinations); indigo light-pulses travel along
     them sporadically.
   • Static on load, framed on Europe. Drag to spin · wheel / pinch to zoom ·
     double-click (or the "Europe" button) to fly back to Europe · once spun it
     keeps slowly auto-rotating. Hover a city to reveal its name.
   • "Soft Atlas" look: soft light-purple landmasses, navy borders & coastline,
     navy arcs with bright indigo light-pulses, on a near-white sphere.

   DEPENDENCIES (npm — Lovable will install them):
       d3-geo            (orthographic projection, path, graticule, distance)
       topojson-client   (merge / feature / mesh of the world-atlas topojson)
   World geography is fetched at runtime from:
       https://unpkg.com/world-atlas@2/countries-110m.json

   Drop-in: place where the companies-logo strip used to be on Alumni.tsx:
       <AlumniGlobe />
   Tailwind classes use the existing MIMS tokens (font-serif, text-heading,
   text-accent, border-separator, text-muted-foreground, text-body-lg).
   ========================================================================== */
import { useEffect, useRef } from "react";
import {
  geoOrthographic,
  geoPath,
  geoGraticule10,
  geoDistance,
} from "d3-geo";
import { merge as topoMerge, mesh as topoMesh } from "topojson-client";

/* ---- Data: Milan origin + every city with >= 2 MIMS alumni --------------- */
const ORIGIN = { name: "Milan", coord: [9.19, 45.4642] as [number, number] };
const CITIES: { name: string; coord: [number, number] }[] = [
  { name: "London", coord: [-0.1278, 51.5074] },
  { name: "Paris", coord: [2.3522, 48.8566] },
  { name: "Zurich", coord: [8.5417, 47.3769] },
  { name: "New York", coord: [-74.006, 40.7128] },
  { name: "Frankfurt", coord: [8.6821, 50.1109] },
  { name: "Rome", coord: [12.4964, 41.9028] },
  { name: "Dubai", coord: [55.2708, 25.2048] },
  { name: "Istanbul", coord: [28.9784, 41.0082] },
  { name: "Munich", coord: [11.582, 48.1351] },
  { name: "Geneva", coord: [6.1432, 46.2044] },
  { name: "Luxembourg", coord: [6.1319, 49.6116] },
  { name: "Helsinki", coord: [24.9384, 60.1699] },
  { name: "Warsaw", coord: [21.0122, 52.2297] },
  { name: "Chicago", coord: [-87.6298, 41.8781] },
  { name: "Tokyo", coord: [139.6503, 35.6762] },
  { name: "Berlin", coord: [13.405, 52.52] },
  { name: "Amsterdam", coord: [4.9041, 52.3676] },
];
const EUROPE: [number, number] = [10, 50]; // default + zoom focus [lng, lat]

/* ---- "Soft Atlas" theme (Version 4) -------------------------------------- */
const SERIF = 'Georgia, "Times New Roman", serif';
const THEME = {
  seaGrad: true, seaHi: "#FFFFFF", seaLo: "#F2F1F7",
  grid: "rgba(31,15,77,0.9)", gridAlpha: 0.07,
  land: "rgba(175,162,210,0.45)",
  border: "rgba(31,15,77,0.5)", borderWidth: 0.5, borderAlpha: 0.65,
  coast: "rgba(31,15,77,0.5)", coastWidth: 0.6,
  arc: "#1F0F4D", arcWidth: 1.4, arcAlpha: 0.6,
  flash: "#7E63D6", flashFade: "rgba(126,99,214,0)",
  dot: "#1F0F4D", dotHi: "#1F0F4D", origin: "#1F0F4D",
  rim: "rgba(31,15,77,0.28)", rimWidth: 1,
  labelFont: SERIF, labelBg: "#1F0F4D", labelText: "#FFFFFF", labelBorder: "#1F0F4D",
};

/* ---- Build reusable geography once from a world-atlas topojson object ----- */
function buildWorld(topo: any) {
  return {
    land: topoMerge(topo, topo.objects.countries.geometries),
    borders: topoMesh(topo, topo.objects.countries, (a: any, b: any) => a !== b),
    graticule: geoGraticule10(),
  };
}

/* ---- The globe engine (canvas, d3-geo orthographic) ----------------------- */
function createGlobe(canvas: HTMLCanvasElement, t: any, world: any) {
  const ctx = canvas.getContext("2d")!;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  let rotate: [number, number] = [-EUROPE[0], -EUROPE[1] + 8];
  let zoom = 1, baseScale = 100;
  let autoRotate = false, dragging = false, vLon = 0;
  let lastX = 0, lastY = 0;
  const mouse = { x: -1, y: -1 };
  let W = 0, H = 0, cx = 0, cy = 0, raf = 0;
  let hover: any = null, screenCities: any[] = [];
  let flashes: any[] = [], arcCache: any[] = [];

  const projection = geoOrthographic().clipAngle(90).precision(0.4);
  const path = geoPath(projection, ctx);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) { requestAnimationFrame(resize); return; }
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = w; H = h; cx = w / 2; cy = h / 2;
    baseScale = Math.min(w, h) * 0.46;
    applyProjection();
  }
  function applyProjection() {
    projection.rotate(rotate).translate([cx, cy]).scale(baseScale * zoom);
  }

  /* ---------- arcs as screen-space bows + travelling flashes ---------- */
  function visible(coord: [number, number]) {
    const center: [number, number] = [-rotate[0], -rotate[1]];
    return geoDistance(coord, center) < Math.PI / 2 - 0.02;
  }
  function bow(p0: number[], p1: number[], lift: number) {
    const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
    const len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len, ny = dx / len;
    if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny; }
    const off = lift * len + 14;
    return [mx + nx * off, my + ny * off];
  }
  function qbez(p0: number[], c: number[], p1: number[], s: number) {
    const u = 1 - s;
    return [
      u * u * p0[0] + 2 * u * s * c[0] + s * s * p1[0],
      u * u * p0[1] + 2 * u * s * c[1] + s * s * p1[1],
    ];
  }
  function buildArcCache() {
    arcCache = [];
    const o = projection(ORIGIN.coord);
    const oVis = visible(ORIGIN.coord);
    for (let i = 0; i < CITIES.length; i++) {
      const c = CITIES[i];
      const cVis = visible(c.coord);
      if (!oVis || !cVis) { arcCache.push(null); continue; }
      const p1 = projection(c.coord);
      if (!o || !p1) { arcCache.push(null); continue; }
      const lift = 0.18 + 0.05 * (i % 3);
      arcCache.push({ p0: o, p1, ctrl: bow(o, p1, lift) });
    }
  }
  function drawArcs() {
    ctx.lineCap = "round";
    for (let i = 0; i < arcCache.length; i++) {
      const a = arcCache[i];
      if (!a) continue;
      ctx.lineWidth = t.arcWidth || 1.4;
      ctx.strokeStyle = t.arc;
      ctx.globalAlpha = t.arcAlpha != null ? t.arcAlpha : 0.55;
      ctx.beginPath();
      ctx.moveTo(a.p0[0], a.p0[1]);
      ctx.quadraticCurveTo(a.ctrl[0], a.ctrl[1], a.p1[0], a.p1[1]);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function drawFlashes(now: number) {
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      const s = (now - f.t0) / f.dur;
      if (s >= 1) { flashes.splice(i, 1); continue; }
      const a = arcCache[f.arc];
      if (!a) continue;
      const head = qbez(a.p0, a.ctrl, a.p1, s);
      const trail = 0.12;
      const tail = qbez(a.p0, a.ctrl, a.p1, Math.max(0, s - trail));
      const grad = ctx.createLinearGradient(tail[0], tail[1], head[0], head[1]);
      grad.addColorStop(0, t.flashFade || "rgba(255,255,255,0)");
      grad.addColorStop(1, t.flash || "#ffffff");
      const env = Math.sin(s * Math.PI);
      ctx.globalAlpha = env;
      ctx.strokeStyle = grad as any;
      ctx.lineWidth = (t.arcWidth || 1.4) + 1.4;
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(tail[0], tail[1]); ctx.lineTo(head[0], head[1]); ctx.stroke();
      ctx.globalAlpha = env;
      ctx.fillStyle = t.flash || "#ffffff";
      ctx.shadowColor = t.flash || "#ffffff";
      ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(head[0], head[1], 2.2, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }
  function maybeSpawnFlash(now: number) {
    if (flashes.length >= 5) return;
    if (Math.random() < 0.025) {
      const live: number[] = [];
      for (let i = 0; i < arcCache.length; i++) if (arcCache[i]) live.push(i);
      if (!live.length) return;
      flashes.push({ arc: live[(Math.random() * live.length) | 0], t0: now, dur: 1100 + Math.random() * 900 });
    }
  }

  /* ---------- cities + hover ---------- */
  function drawCities() {
    screenCities = [];
    const all: any[] = [{ name: ORIGIN.name, coord: ORIGIN.coord, origin: true }];
    for (let i = 0; i < CITIES.length; i++) all.push({ name: CITIES[i].name, coord: CITIES[i].coord, origin: false });
    let hoverIdx = -1, best = 18 * 18;
    for (let j = 0; j < all.length; j++) {
      if (!visible(all[j].coord)) continue;
      const p = projection(all[j].coord);
      if (!p) continue;
      all[j].p = p; screenCities.push(all[j]);
      const dx = p[0] - mouse.x, dy = p[1] - mouse.y, d2 = dx * dx + dy * dy;
      if (d2 < best) { best = d2; hoverIdx = screenCities.length - 1; }
    }
    hover = hoverIdx >= 0 ? screenCities[hoverIdx] : null;
    for (let k = 0; k < screenCities.length; k++) {
      const s = screenCities[k], isH = hover === s;
      if (s.origin) {
        ctx.fillStyle = t.origin;
        ctx.beginPath(); ctx.arc(s.p[0], s.p[1], 4.8, 0, 7); ctx.fill();
        ctx.globalAlpha = 0.5; ctx.strokeStyle = t.origin; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.arc(s.p[0], s.p[1], 9, 0, 7); ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = isH ? t.dotHi : t.dot;
        ctx.beginPath(); ctx.arc(s.p[0], s.p[1], isH ? 4.2 : 2.8, 0, 7); ctx.fill();
        if (isH) {
          ctx.globalAlpha = 0.5; ctx.strokeStyle = t.dotHi; ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.arc(s.p[0], s.p[1], 7.5, 0, 7); ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }
    canvas.style.cursor = hover ? "pointer" : dragging ? "grabbing" : "grab";
  }
  function drawLabel() {
    if (!hover) return;
    ctx.font = "600 13px " + (t.labelFont || "Georgia, serif");
    const w = ctx.measureText(hover.name).width, padX = 9, lh = 22;
    let bx = hover.p[0] + 13, by = hover.p[1] - lh - 7;
    if (bx + w + padX * 2 > W) bx = hover.p[0] - 13 - (w + padX * 2);
    if (by < 2) by = hover.p[1] + 13;
    ctx.fillStyle = t.labelBg; ctx.strokeStyle = t.labelBorder; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.rect(bx, by, w + padX * 2, lh); ctx.fill(); ctx.stroke();
    ctx.fillStyle = t.labelText; ctx.textBaseline = "middle";
    ctx.fillText(hover.name, bx + padX, by + lh / 2 + 1);
  }

  /* ---------- geography ---------- */
  function drawGeo() {
    ctx.beginPath(); path({ type: "Sphere" } as any);
    if (t.seaGrad) {
      const g = ctx.createRadialGradient(
        cx - baseScale * 0.3 * zoom, cy - baseScale * 0.35 * zoom, baseScale * 0.1,
        cx, cy, baseScale * zoom
      );
      g.addColorStop(0, t.seaHi); g.addColorStop(1, t.seaLo);
      ctx.fillStyle = g;
    } else { ctx.fillStyle = t.sea; }
    ctx.fill();
    if (t.grid) {
      ctx.beginPath(); path(world.graticule);
      ctx.strokeStyle = t.grid; ctx.lineWidth = 0.6;
      ctx.globalAlpha = t.gridAlpha != null ? t.gridAlpha : 0.5; ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (t.land) { ctx.beginPath(); path(world.land); ctx.fillStyle = t.land; ctx.fill(); }
    if (t.border) {
      ctx.beginPath(); path(world.borders);
      ctx.strokeStyle = t.border; ctx.lineWidth = t.borderWidth || 0.5;
      ctx.globalAlpha = t.borderAlpha != null ? t.borderAlpha : 0.6; ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (t.coast) {
      ctx.beginPath(); path(world.land);
      ctx.strokeStyle = t.coast; ctx.lineWidth = t.coastWidth || 0.7; ctx.stroke();
    }
    if (t.rim) {
      ctx.beginPath(); path({ type: "Sphere" } as any);
      ctx.strokeStyle = t.rim; ctx.lineWidth = t.rimWidth || 1; ctx.stroke();
    }
  }

  function render(now: number) {
    ctx.clearRect(0, 0, W, H);
    applyProjection();
    drawGeo();
    buildArcCache();
    drawArcs();
    drawFlashes(now);
    drawCities();
    drawLabel();
  }
  function frame(now: number) {
    if (!dragging) {
      if (Math.abs(vLon) > 0.01) { rotate[0] += vLon; vLon *= 0.93; }
      else if (autoRotate) rotate[0] += 0.12;
    }
    maybeSpawnFlash(now);
    try { render(now); } catch (e) { /* keep looping */ }
    raf = requestAnimationFrame(frame);
  }

  /* ---------- interaction ---------- */
  function pt(e: any) {
    const r = canvas.getBoundingClientRect();
    const s = (e.touches && e.touches[0]) || e;
    return { x: s.clientX - r.left, y: s.clientY - r.top };
  }
  function down(e: any) { dragging = true; const p = pt(e); lastX = p.x; lastY = p.y; e.preventDefault?.(); }
  function move(e: any) {
    const p = pt(e); mouse.x = p.x; mouse.y = p.y;
    if (dragging) {
      const k = 0.32 / zoom;
      const dx = p.x - lastX, dy = p.y - lastY;
      rotate[0] += dx * k;
      rotate[1] = Math.max(-89, Math.min(89, rotate[1] - dy * k));
      vLon = dx * k; lastX = p.x; lastY = p.y; autoRotate = true;
    }
  }
  function up() { dragging = false; }
  function leave() { mouse.x = -1; mouse.y = -1; }
  function setZoom(z: number) { zoom = Math.max(1, Math.min(5, z)); }
  function wheel(e: any) { e.preventDefault(); setZoom(zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)); }

  let pinch0 = 0, zoom0 = 1;
  function touchstart(e: any) {
    if (e.touches.length === 2) {
      pinch0 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      zoom0 = zoom;
    } else down(e);
  }
  function touchmove(e: any) {
    if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (pinch0) setZoom(zoom0 * d / pinch0);
    } else move(e);
  }
  function flyToEurope() {
    autoRotate = false; vLon = 0;
    const startR = rotate.slice() as [number, number], startZ = zoom, t0 = performance.now(), dur = 700;
    const targetR: [number, number] = [-EUROPE[0], -EUROPE[1] + 8], targetZ = 2.4;
    function step(now: number) {
      const u = Math.min(1, (now - t0) / dur);
      const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      rotate[0] = startR[0] + (targetR[0] - startR[0]) * e;
      rotate[1] = startR[1] + (targetR[1] - startR[1]) * e;
      zoom = startZ + (targetZ - startZ) * e;
      if (u < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function dblclick() { flyToEurope(); }

  canvas.addEventListener("mousedown", down);
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
  canvas.addEventListener("mouseleave", leave);
  canvas.addEventListener("wheel", wheel, { passive: false });
  canvas.addEventListener("touchstart", touchstart, { passive: false });
  canvas.addEventListener("touchmove", touchmove, { passive: false });
  window.addEventListener("touchend", up);
  canvas.addEventListener("dblclick", dblclick);
  const ro = "ResizeObserver" in window ? new ResizeObserver(resize) : null;
  ro?.observe(canvas);
  window.addEventListener("resize", resize);
  resize();
  raf = requestAnimationFrame(frame);

  return {
    zoomIn: () => setZoom(zoom * 1.3),
    zoomOut: () => setZoom(zoom / 1.3),
    flyToEurope,
    destroy: () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      canvas.removeEventListener("mousedown", down);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      canvas.removeEventListener("mouseleave", leave);
      canvas.removeEventListener("wheel", wheel);
      canvas.removeEventListener("touchstart", touchstart);
      canvas.removeEventListener("touchmove", touchmove);
      window.removeEventListener("touchend", up);
      canvas.removeEventListener("dblclick", dblclick);
      window.removeEventListener("resize", resize);
    },
  };
}

/* ---- React component ------------------------------------------------------ */
export default function AlumniGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<any>(null);

  useEffect(() => {
    let disposed = false;
    let api: any = null;
    fetch("https://unpkg.com/world-atlas@2/countries-110m.json")
      .then((r) => r.json())
      .then((topo) => {
        if (disposed || !canvasRef.current) return;
        const world = buildWorld(topo);
        api = createGlobe(canvasRef.current, THEME, world);
        apiRef.current = api;
      })
      .catch(() => { /* leave the static frame in place on network failure */ });
    return () => { disposed = true; api?.destroy?.(); apiRef.current = null; };
  }, []);

  return (
    <div className="mb-16 sm:mb-20">
      <div className="relative w-full" style={{ height: "clamp(360px, 46vw, 560px)" }}>
        <canvas ref={canvasRef} className="block h-full w-full" />
        {/* zoom / Europe controls */}
        <div className="absolute right-3.5 top-3.5 z-10 flex flex-col gap-1.5">
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => apiRef.current?.zoomIn()}
            className="flex h-[34px] w-[34px] items-center justify-center border border-separator text-accent transition-colors hover:bg-accent hover:text-white hover:border-accent"
          >
            +
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => apiRef.current?.zoomOut()}
            className="flex h-[34px] w-[34px] items-center justify-center border border-separator text-accent transition-colors hover:bg-accent hover:text-white hover:border-accent"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => apiRef.current?.flyToEurope()}
            className="flex h-7 items-center justify-center border border-separator px-2.5 text-[11px] uppercase tracking-wide text-accent transition-colors hover:bg-accent hover:text-white hover:border-accent"
          >
            Europe
          </button>
        </div>
      </div>
    </div>
  );
}
