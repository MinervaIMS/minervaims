// PayoffLab — one chart card: serif header, progress bar, the PlotSurface,
// and the legend-as-readout strip whose values track the crosshair.

import { forwardRef, useMemo, useState } from "react";
import type { ChartState, GridResult } from "@/lib/payofflab/types";
import { defaultStyle } from "@/lib/payofflab/colors";
import { GREEK_META, INSTRUMENTS_BY_ID } from "@/lib/payofflab/catalog";
import { useLab } from "./context";
import { InfoDot } from "./InfoDot";
import { PlotSurface, interpolateSeries } from "./PlotSurface";
import type { CrosshairSample, PlotMarker, PlotSeries, PlotSurfaceHandle } from "./PlotSurface";

const X_LABELS: Record<string, string> = {
  S: "Underlying price S",
  t: "Calendar time t (years from now)",
  r: "Interest rate r",
};

export function fmtNum(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || !isFinite(v)) return "–";
  const a = Math.abs(v);
  const d = a >= 100 ? Math.max(0, digits - 1) : a < 0.05 && a > 0 ? 4 : digits;
  return (v > 0 ? "+" : "") + v.toFixed(d);
}

export function buildSeries(chart: ChartState, grid: GridResult, compare: GridResult | null): PlotSeries[] {
  const out: PlotSeries[] = [];
  const cost = chart.netPremium ? grid.scalars.price : 0;
  if (chart.showValue) {
    out.push({
      id: "value",
      label: chart.netPremium ? "Value (net)" : "Value now",
      x: grid.x,
      y: grid.value.map((v) => v - cost),
      style: chart.styles.value ?? defaultStyle("value"),
      axis: "left",
    });
  }
  if (chart.showPayoff && grid.payoff) {
    out.push({
      id: "payoff",
      label: chart.netPremium ? "Payoff − cost" : "Payoff at expiry",
      x: grid.x,
      y: grid.payoff.map((v) => v - cost),
      style: chart.styles.payoff ?? defaultStyle("payoff"),
      axis: "left",
    });
  }
  if (compare && chart.compareModel) {
    const cmpCost = chart.netPremium ? compare.scalars.price : 0;
    out.push({
      id: "compare",
      label: modelShortName(chart.compareModel.pricing),
      x: compare.x,
      y: compare.value.map((v) => v - cmpCost),
      style: chart.styles.compare ?? defaultStyle("compare"),
      axis: "left",
    });
  }
  for (const g of chart.greeks) {
    const ys = grid.greeks[g];
    if (!ys) continue;
    out.push({
      id: g,
      label: GREEK_META[g]?.label ?? g,
      x: grid.x,
      y: ys,
      style: chart.styles[g] ?? defaultStyle(g),
      axis: "right",
    });
  }
  return out;
}

function modelShortName(p: string): string {
  switch (p) {
    case "bachelier": return "Bachelier";
    case "merton-jump": return "Jump-diffusion";
    case "binomial-crr": return "Binomial (CRR)";
    case "binomial-jr": return "Binomial (JR)";
    case "trinomial": return "Trinomial";
    default: return "Black–Scholes";
  }
}

interface LabChartProps {
  chart: ChartState;
  index: number;
  grid: GridResult | null;
  compare: GridResult | null;
  loading: boolean;
  progress: number;
  showProgress: boolean;
  error: string | null;
  active: boolean;
  onCrosshairSample: (s: CrosshairSample | null) => void;
}

export const LabChart = forwardRef<PlotSurfaceHandle, LabChartProps>(function LabChart(
  { chart, index, grid, compare, loading, progress, showProgress, error, active, onCrosshairSample },
  ref,
) {
  const { state, dispatch, sharedX, setSharedX, watermark } = useLab();
  const [localSample, setLocalSample] = useState<CrosshairSample | null>(null);

  const series = useMemo(
    () => (grid ? buildSeries(chart, grid, compare) : []),
    [chart, grid, compare],
  );

  const markers = useMemo<PlotMarker[]>(() => {
    if (!grid || !chart.markers || chart.xVar !== "S") return [];
    const out: PlotMarker[] = [];
    for (const leg of chart.legs) {
      const K = leg.params.K;
      if (typeof K === "number") out.push({ x: K, label: `K ${K}`, kind: "strike" });
      const H = leg.params.H;
      if (typeof H === "number") out.push({ x: H, label: `H ${H}`, kind: "strike" });
    }
    if (chart.netPremium) {
      for (const be of grid.scalars.breakEvens) {
        out.push({ x: be, y: 0, label: `B/E ${be.toFixed(1)}`, kind: "breakeven" });
      }
    }
    return out;
  }, [grid, chart]);

  const snapXs = useMemo(() => markers.map((m) => m.x), [markers]);

  const fmtX = useMemo(() => {
    if (chart.xVar === "r") return (v: number) => `${(v * 100).toFixed(1)}%`;
    if (chart.xVar === "t") return (v: number) => `${v.toFixed(2)}y`;
    return (v: number) => (Math.abs(v) >= 1000 ? v.toFixed(0) : v.toFixed(Math.abs(v) < 10 ? 2 : 1));
  }, [chart.xVar]);

  const effX = state.syncCrosshair ? sharedX : undefined;
  const sample = useMemo<CrosshairSample | null>(() => {
    if (state.syncCrosshair && sharedX !== null && series.length > 0) {
      return {
        x: sharedX,
        values: series.map((s) => ({ id: s.id, label: s.label, y: interpolateSeries(s.x, s.y, sharedX), color: "" })),
      };
    }
    return localSample;
  }, [state.syncCrosshair, sharedX, series, localSample]);

  const pathNote = grid?.notes.includes("path-dependent-payoff");
  const firstExpiryNote = grid?.notes.includes("payoff-at-first-expiry");
  const usesS = chart.legs.some((l) => INSTRUMENTS_BY_ID[l.instrument]?.axes.includes("S"));

  return (
    <div
      className={`relative flex min-h-0 flex-col bg-background p-3 ${active && state.charts.length > 1 ? "ring-1 ring-inset ring-accent/35" : ""}`}
      onMouseDown={() => dispatch({ type: "set-active", index })}
    >
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2.5 font-serif text-base tracking-tight text-foreground">
          {chart.title}
          {active && state.charts.length > 1 && (
            <span className="pl-pill pl-pill--live" role="status">
              <span className="dot" aria-hidden="true" />
              Active
            </span>
          )}
        </span>
        <span className="pl-eye flex items-center gap-1.5">
          {X_LABELS[chart.xVar]}
          <InfoDot id="x-axis" />
        </span>
      </div>
      {showProgress && (
        <div className="pl-progress absolute left-0 right-0 top-0 z-10" role="progressbar" aria-label="Computing">
          <div style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
      <div className="relative min-h-0 flex-1">
        {chart.legs.length === 0 ? (
          <div className="flex h-full items-center justify-center border border-dashed border-border text-sm text-muted-foreground">
            Chart {index + 1}: add an asset from the rail, or load a concept
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center px-8">
            <div className="max-w-md border border-border p-5 text-center">
              <div className="pl-pill pl-pill--off mb-3">
                <span className="dot" aria-hidden="true" />
                Pricing engine unreachable
              </div>
              <p className="mb-2 text-sm leading-relaxed text-foreground">{error}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                The charts are computed by the <b>pricing-engine</b> Supabase Edge Function. If this is a fresh
                deployment, make sure that function is deployed and publicly invocable, then change any input (or press
                the button below) to retry.
              </p>
              <button
                type="button"
                className="mt-3 border border-accent px-5 py-1.5 text-xs text-accent transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={() => dispatch({ type: "update-chart", index, patch: { model: { ...chart.model, seed: chart.model.seed + 1 } } })}
              >
                Retry now
              </button>
            </div>
          </div>
        ) : (
          <PlotSurface
            ref={ref}
            series={series}
            markers={markers}
            signShadeId={chart.signShading && chart.greeks.length > 0 ? chart.greeks[0] : null}
            labels={chart.labels}
            xLabel={X_LABELS[chart.xVar]}
            formatX={fmtX}
            snapXs={snapXs}
            crosshairX={effX}
            onCrosshair={(x, s) => {
              setLocalSample(s);
              onCrosshairSample(s);
              if (state.syncCrosshair) setSharedX(x);
            }}
            watermark={watermark}
            ariaLabel={`${chart.title}: ${series.map((s) => s.label).join(", ")} against ${X_LABELS[chart.xVar]}. Use arrow keys to move the crosshair; Shift+arrows snap to strikes and break-evens.`}
          />
        )}
        {loading && chart.legs.length > 0 && !showProgress && (
          <div className="absolute right-2 top-1 text-[10px] uppercase tracking-widest text-muted-foreground">…</div>
        )}
      </div>
      {(pathNote || firstExpiryNote || chart.xVar === "t") && chart.legs.length > 0 && (
        <div className="mt-1 flex items-center gap-1.5 text-xs leading-snug text-muted-foreground">
          {pathNote ? (
            <>
              This payoff depends on the whole price path, so no terminal-payoff line can be drawn; the chart shows the
              mark-to-market value instead.
              <InfoDot id="path-dependent-payoff" />
            </>
          ) : chart.xVar === "t" ? (
            <>The value line converges to intrinsic value as t reaches expiry.<InfoDot id="concept-time-decay" /></>
          ) : (
            <>Payoff drawn at the first expiry; longer-dated legs are marked to model.<InfoDot id="payoff-vs-value" /></>
          )}
        </div>
      )}
      {/* legend-as-readout */}
      {grid && chart.legs.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-separator pt-1.5 text-xs">
          {series.map((s) => {
            const v = sample ? sample.values.find((q) => q.id === s.id)?.y : undefined;
            const restVal = v === undefined
              ? (chart.xVar === "S" && usesS ? interpolateSeries(s.x, s.y, chart.market.S) : s.y[s.y.length - 1])
              : v;
            return (
              <span key={s.id} className="flex items-center gap-1.5 text-foreground">
                <LegendSwatch styleId={s.style.color} dash={s.style.dash} />
                {s.label}
                <b className="pl-num">{fmtNum(restVal)}</b>
              </span>
            );
          })}
          <span className="pl-num ml-auto text-muted-foreground">
            {sample
              ? `${chart.xVar} = ${fmtX(sample.x)}`
              : chart.xVar === "S"
                ? `S = ${fmtX(chart.market.S)}`
                : ""}
          </span>
        </div>
      )}
    </div>
  );
});

export function LegendSwatch({ styleId, dash }: { styleId: string; dash: string }) {
  const border = dash === "dashed" || dash === "dashdot" ? "dashed" : dash === "dotted" ? "dotted" : "solid";
  return (
    <span
      aria-hidden="true"
      className="inline-block w-4 flex-none"
      style={{
        borderTop: `2.2px ${border} var(${cssVarFor(styleId)})`,
      }}
    />
  );
}

function cssVarFor(colorId: string): string {
  // Mirrors colorVarFor without resolving — CSS handles the theme.
  const map: Record<string, string> = {
    payoff: "--pl-payoff", value: "--pl-value", compare: "--pl-compare",
    delta: "--pl-delta", gamma: "--pl-gamma", theta: "--pl-theta", vega: "--pl-vega", rho: "--pl-rho",
    vanna: "--pl-vega", vomma: "--pl-vega", charm: "--pl-delta", speed: "--pl-gamma", colour: "--pl-gamma",
    navy: "--pl-payoff", violet: "--pl-value", blue: "--pl-delta", amber: "--pl-gamma",
    green: "--pl-vega", pink: "--pl-theta", sky: "--pl-rho", vermillion: "--pl-neg-strong",
  };
  return map[colorId] ?? "--pl-payoff";
}
