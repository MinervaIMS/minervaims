// PayoffLab — <PlotSurface>: the reusable mini-GeoGebra chart surface.
// HiDPI 2D canvas; crosshair values come from client-side interpolation of
// the sampled arrays (no server round-trips on hover). The Minerva lockup is
// baked LARGE and CENTRED into the bitmap behind the data lines, so it is in
// every screenshot and every PNG export.

import {
  forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState,
} from "react";
import type { LineStyle } from "@/lib/payofflab/types";
import { colorVarFor, dashArray, resolveCssColor } from "@/lib/payofflab/colors";

export interface PlotSeries {
  id: string;
  label: string;
  x: number[];
  y: number[];
  style: LineStyle;
  axis: "left" | "right";
}

export interface PlotMarker {
  x: number;
  y?: number;
  label: string;
  kind: "breakeven" | "strike" | "extreme" | "note";
}

export interface CrosshairSample {
  x: number;
  values: Array<{ id: string; label: string; y: number; color: string }>;
}

export interface PlotSurfaceHandle {
  /** Render the current chart to a PNG blob (watermark + copyright baked in). */
  exportPng(title: string): Promise<Blob | null>;
}

interface PlotSurfaceProps {
  series: PlotSeries[];
  markers?: PlotMarker[];
  /** Series id whose sign controls background shading (Pro). */
  signShadeId?: string | null;
  labels?: boolean;
  xLabel: string;
  formatX?: (v: number) => string;
  formatY?: (v: number) => string;
  /** Snap targets for Shift+arrow crosshair jumps (strikes, break-evens). */
  snapXs?: number[];
  crosshairX?: number | null;
  onCrosshair?: (x: number | null, sample: CrosshairSample | null) => void;
  watermark?: HTMLImageElement | null;
  ariaLabel: string;
  className?: string;
}

const PAD = { top: 18, right: 54, bottom: 30, left: 58 };

function niceTicks(lo: number, hi: number, n = 5): number[] {
  if (!(hi > lo)) return [lo];
  const span = hi - lo;
  const step0 = span / n;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm = step0 / mag;
  const step = (norm >= 5 ? 10 : norm >= 2.2 ? 5 : norm >= 1.2 ? 2 : 1) * mag;
  const start = Math.ceil(lo / step) * step;
  const out: number[] = [];
  for (let v = start; v <= hi + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  return out;
}

function interp(xs: number[], ys: number[], x: number): number {
  const n = xs.length;
  if (n === 0) return NaN;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= x) lo = mid;
    else hi = mid;
  }
  const f = (x - xs[lo]) / (xs[hi] - xs[lo]);
  return ys[lo] + f * (ys[hi] - ys[lo]);
}

const fmtDefault = (v: number): string => {
  const a = Math.abs(v);
  if (a >= 1000) return v.toFixed(0);
  if (a >= 10) return v.toFixed(1);
  if (a >= 0.1) return v.toFixed(2);
  if (a === 0) return "0";
  return v.toPrecision(2);
};

export const PlotSurface = forwardRef<PlotSurfaceHandle, PlotSurfaceProps>(function PlotSurface(
  {
    series, markers = [], signShadeId = null, labels = true, xLabel,
    formatX = fmtDefault, formatY = fmtDefault, snapXs = [],
    crosshairX = undefined, onCrosshair, watermark = null, ariaLabel, className,
  },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [localX, setLocalX] = useState<number | null>(null);
  const chX = crosshairX !== undefined ? crosshairX : localX;

  // ---- domain ----
  const domain = useMemo(() => {
    let xLo = Infinity, xHi = -Infinity, lLo = Infinity, lHi = -Infinity, rLo = Infinity, rHi = -Infinity;
    for (const s of series) {
      if (s.x.length === 0) continue;
      xLo = Math.min(xLo, s.x[0]);
      xHi = Math.max(xHi, s.x[s.x.length - 1]);
      for (const y of s.y) {
        if (!isFinite(y)) continue;
        if (s.axis === "left") { lLo = Math.min(lLo, y); lHi = Math.max(lHi, y); }
        else { rLo = Math.min(rLo, y); rHi = Math.max(rHi, y); }
      }
    }
    if (!isFinite(xLo)) { xLo = 0; xHi = 1; }
    const padAxis = (lo: number, hi: number): [number, number] => {
      if (!isFinite(lo)) return [-1, 1];
      if (hi - lo < 1e-12) { const c = lo; return [c - Math.max(Math.abs(c) * 0.1, 1), c + Math.max(Math.abs(c) * 0.1, 1)]; }
      const pad = (hi - lo) * 0.08;
      return [lo - pad, hi + pad];
    };
    const [leftLo, leftHi] = padAxis(lLo, lHi);
    const [rightLo, rightHi] = padAxis(rLo, rHi);
    return { xLo, xHi, leftLo, leftHi, rightLo, rightHi, hasRight: isFinite(rLo) };
  }, [series]);

  // ---- resize ----
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: Math.max(80, r.width), h: Math.max(80, r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sampleAt = useCallback((x: number): CrosshairSample => {
    const el = wrapRef.current as HTMLElement;
    return {
      x,
      values: series.map((s) => ({
        id: s.id,
        label: s.label,
        y: interp(s.x, s.y, x),
        color: el ? resolveCssColor(el, colorVarFor(s.style.color)) : "#1F0F4D",
      })),
    };
  }, [series]);

  // ---- drawing ----
  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, forExport: boolean) => {
    const el = wrapRef.current as HTMLElement;
    if (!el) return;
    const css = (v: string) => resolveCssColor(el, v);
    const styles = getComputedStyle(el);
    const bg = forExport ? (styles.getPropertyValue("background-color") || "#fff") : null;

    const { xLo, xHi, leftLo, leftHi, rightLo, rightHi, hasRight } = domain;
    const padRight = hasRight ? PAD.right : 20;
    const iw = w - PAD.left - padRight;
    const ih = h - PAD.top - PAD.bottom;
    const px = (x: number) => PAD.left + ((x - xLo) / (xHi - xLo)) * iw;
    const pyL = (y: number) => PAD.top + (1 - (y - leftLo) / (leftHi - leftLo)) * ih;
    const pyR = (y: number) => PAD.top + (1 - (y - rightLo) / (rightHi - rightLo)) * ih;

    ctx.clearRect(0, 0, w, h);
    if (forExport) {
      ctx.fillStyle = document.documentElement.classList.contains("dark") ? "#0d0d0d" : "#ffffff";
      ctx.fillRect(0, 0, w, h);
    }

    // 1. sign-region shading (behind everything)
    if (signShadeId) {
      const s = series.find((q) => q.id === signShadeId);
      if (s && s.x.length > 1) {
        const pos = css("--pl-pos");
        const neg = css("--pl-neg");
        let runStart = s.x[0];
        let runSign = Math.sign(s.y[0]) || 0;
        const flush = (endX: number) => {
          if (runSign === 0) return;
          ctx.fillStyle = runSign > 0 ? pos : neg;
          ctx.fillRect(px(runStart), PAD.top, px(endX) - px(runStart), ih);
        };
        for (let i = 1; i < s.x.length; i++) {
          const sg = Math.sign(s.y[i]) || runSign;
          if (sg !== runSign && runSign !== 0 && sg !== 0) {
            // linear zero crossing
            const f = Math.abs(s.y[i - 1]) / (Math.abs(s.y[i - 1]) + Math.abs(s.y[i]));
            const xc = s.x[i - 1] + f * (s.x[i] - s.x[i - 1]);
            flush(xc);
            runStart = xc;
            runSign = sg;
          } else if (runSign === 0 && sg !== 0) {
            runStart = s.x[i - 1];
            runSign = sg;
          }
        }
        flush(s.x[s.x.length - 1]);
      }
    }

    // 2. watermark — large, centred, behind the data lines. Baked into the
    //    bitmap so it is present in every screenshot and export.
    if (watermark && watermark.complete && watermark.naturalWidth > 0) {
      const scale = Math.min((iw * 0.62) / watermark.naturalWidth, (ih * 0.62) / watermark.naturalHeight);
      const wmW = watermark.naturalWidth * scale;
      const wmH = watermark.naturalHeight * scale;
      ctx.save();
      ctx.globalAlpha = document.documentElement.classList.contains("dark") ? 0.09 : 0.065;
      ctx.drawImage(watermark, PAD.left + (iw - wmW) / 2, PAD.top + (ih - wmH) / 2, wmW, wmH);
      ctx.restore();
    }

    // 3. grid + axes
    const gridC = css("--pl-grid");
    const axisC = css("--pl-axis");
    const tickC = css("--pl-tick-text");
    ctx.lineWidth = 1;
    ctx.font = "10px ui-monospace, Menlo, monospace";
    const xTicks = niceTicks(xLo, xHi, 6);
    const yTicks = niceTicks(leftLo, leftHi, 5);
    ctx.strokeStyle = gridC;
    ctx.fillStyle = tickC;
    for (const t of xTicks) {
      const X = px(t);
      ctx.beginPath(); ctx.moveTo(X, PAD.top); ctx.lineTo(X, PAD.top + ih); ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillText(formatX(t), X, h - 12);
    }
    for (const t of yTicks) {
      const Y = pyL(t);
      ctx.beginPath(); ctx.moveTo(PAD.left, Y); ctx.lineTo(PAD.left + iw, Y); ctx.stroke();
      ctx.textAlign = "right";
      ctx.fillText(formatY(t), PAD.left - 6, Y + 3);
    }
    if (hasRight) {
      ctx.textAlign = "left";
      for (const t of niceTicks(rightLo, rightHi, 5)) {
        ctx.fillText(formatY(t), PAD.left + iw + 6, pyR(t) + 3);
      }
    }
    // zero line (left axis), dashed
    if (leftLo < 0 && leftHi > 0) {
      ctx.save();
      ctx.strokeStyle = axisC;
      ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(PAD.left, pyL(0)); ctx.lineTo(PAD.left + iw, pyL(0)); ctx.stroke();
      ctx.restore();
    }
    // frame
    ctx.strokeStyle = axisC;
    ctx.beginPath();
    ctx.moveTo(PAD.left, PAD.top); ctx.lineTo(PAD.left, PAD.top + ih); ctx.lineTo(PAD.left + iw, PAD.top + ih);
    ctx.stroke();
    // x-axis label
    ctx.fillStyle = tickC;
    ctx.textAlign = "center";
    ctx.font = "10px Carlito, Calibri, sans-serif";
    ctx.fillText(xLabel, PAD.left + iw / 2, h - 2);

    // 4. markers (strike guides, break-evens, extremes)
    for (const m of markers) {
      if (m.x < xLo || m.x > xHi) continue;
      const X = px(m.x);
      if (m.kind === "strike") {
        ctx.save();
        ctx.strokeStyle = gridC;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(X, PAD.top); ctx.lineTo(X, PAD.top + ih); ctx.stroke();
        ctx.restore();
        if (labels) {
          // Inside the plot, clear of the x-axis tick labels.
          ctx.fillStyle = tickC;
          ctx.textAlign = "left";
          ctx.fillText(m.label, X + 4, PAD.top + ih - 6);
        }
      } else if (m.kind === "breakeven") {
        const Y = m.y !== undefined ? pyL(m.y) : pyL(0);
        ctx.strokeStyle = css("--pl-crosshair");
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(X, Y, 3.2, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1;
        if (labels) {
          ctx.fillStyle = tickC;
          ctx.textAlign = "left";
          ctx.fillText(m.label, X + 6, Y - 6);
        }
      } else if (labels) {
        const Y = m.y !== undefined ? pyL(m.y) : PAD.top + 12;
        ctx.fillStyle = css("--pl-payoff");
        ctx.textAlign = m.x > (xLo + xHi) / 2 ? "right" : "left";
        ctx.fillText(m.label, m.x > (xLo + xHi) / 2 ? X - 4 : X + 4, Y - 6);
      }
    }

    // 5. data lines
    for (const s of series) {
      if (s.x.length < 2) continue;
      const color = css(colorVarFor(s.style.color));
      const py = s.axis === "left" ? pyL : pyR;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = s.style.width === 3 ? 2.6 : s.style.width === 1 ? 1.2 : 1.9;
      ctx.setLineDash(dashArray(s.style.dash, 1.4));
      ctx.lineJoin = "round";
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < s.x.length; i++) {
        const y = s.y[i];
        if (!isFinite(y)) { started = false; continue; }
        const X = px(s.x[i]);
        const Y = Math.max(PAD.top - 40, Math.min(PAD.top + ih + 40, py(y)));
        if (!started) { ctx.moveTo(X, Y); started = true; }
        else ctx.lineTo(X, Y);
      }
      ctx.stroke();
      ctx.restore();
      // right-end line label
      if (labels) {
        const lastY = s.y[s.y.length - 1];
        if (isFinite(lastY)) {
          ctx.fillStyle = color;
          ctx.font = "10px Carlito, Calibri, sans-serif";
          ctx.textAlign = "right";
          ctx.fillText(s.label, PAD.left + iw - 4, Math.max(PAD.top + 10, Math.min(PAD.top + ih - 4, py(lastY) - 5)));
        }
      }
    }

    // 6. crosshair
    if (chX !== null && chX !== undefined && chX >= xLo && chX <= xHi && !forExport) {
      const X = px(chX);
      ctx.save();
      ctx.strokeStyle = css("--pl-crosshair");
      ctx.globalAlpha = 0.6;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(X, PAD.top); ctx.lineTo(X, PAD.top + ih); ctx.stroke();
      ctx.restore();
      for (const s of series) {
        const y = interp(s.x, s.y, chX);
        if (!isFinite(y)) continue;
        const py = s.axis === "left" ? pyL : pyR;
        ctx.fillStyle = css(colorVarFor(s.style.color));
        ctx.beginPath();
        ctx.arc(X, Math.max(PAD.top, Math.min(PAD.top + ih, py(y))), 3.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 7. export footer (copyright baked into PNG alongside the watermark)
    if (forExport) {
      ctx.fillStyle = tickC;
      ctx.font = "9px Carlito, Calibri, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("© Minerva Investment Management Society · educational use only · Minerva PayoffLab", PAD.left, h - 2);
    }
  }, [domain, series, markers, signShadeId, labels, xLabel, formatX, formatY, chX, watermark]);

  // main render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.w === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(ctx, size.w, size.h, false);
  }, [draw, size]);

  // redraw when theme flips (dark-mode class on <html>)
  useEffect(() => {
    const obs = new MutationObserver(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx && size.w > 0) {
        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw(ctx, size.w, size.h, false);
      }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, [draw, size]);

  useImperativeHandle(ref, () => ({
    async exportPng(title: string) {
      const W = 1400;
      const H = 900;
      const off = document.createElement("canvas");
      const scale = 2;
      off.width = W * scale;
      off.height = H * scale;
      const ctx = off.getContext("2d");
      if (!ctx) return null;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      // headline
      draw(ctx, W, H, true);
      ctx.fillStyle = resolveCssColor(wrapRef.current as HTMLElement, "--pl-payoff");
      ctx.font = "600 16px 'EB Garamond', Georgia, serif";
      ctx.textAlign = "left";
      ctx.fillText(title, PAD.left, 14);
      return await new Promise<Blob | null>((resolve) => off.toBlob(resolve, "image/png"));
    },
  }), [draw]);

  // ---- interaction ----
  const xFromEvent = (clientX: number): number | null => {
    const el = wrapRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const iw = rect.width - PAD.left - (domain.hasRight ? PAD.right : 20);
    const f = (clientX - rect.left - PAD.left) / iw;
    if (f < -0.02 || f > 1.02) return null;
    return domain.xLo + Math.max(0, Math.min(1, f)) * (domain.xHi - domain.xLo);
  };

  const emit = (x: number | null) => {
    setLocalX(x);
    onCrosshair?.(x, x === null ? null : sampleAt(x));
  };

  const onKey = (e: React.KeyboardEvent) => {
    const span = domain.xHi - domain.xLo;
    const fine = span / 200;
    const cur = chX ?? (domain.xLo + span / 2);
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      if (e.shiftKey && snapXs.length > 0) {
        const sorted = [...snapXs].sort((a, b) => a - b);
        const next = dir === 1 ? sorted.find((s) => s > cur + 1e-9) : [...sorted].reverse().find((s) => s < cur - 1e-9);
        emit(next !== undefined ? next : cur);
      } else {
        emit(Math.max(domain.xLo, Math.min(domain.xHi, cur + dir * fine)));
      }
    } else if (e.key === "Home") { e.preventDefault(); emit(domain.xLo); }
    else if (e.key === "End") { e.preventDefault(); emit(domain.xHi); }
    else if (e.key === "Escape") { emit(null); }
  };

  return (
    <div
      ref={wrapRef}
      className={`pl-plot relative h-full w-full ${className ?? ""}`}
      role="img"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={onKey}
      onMouseMove={(e) => emit(xFromEvent(e.clientX))}
      onMouseLeave={() => emit(null)}
    >
      <canvas ref={canvasRef} className="block h-full w-full" aria-hidden="true" />
    </div>
  );
});

export { interp as interpolateSeries };
