// Minerva PayoffLab — /lab. A desktop-only, single-page derivatives
// payoff-and-pricing laboratory. Three regions (§3): left control rail,
// chart grid (up to 4 independent mini-GeoGebra surfaces), right Learn
// drawer. All pricing mathematics lives in the `pricing-engine` Supabase
// Edge Function — this bundle contains inputs and rendering only.

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import type { GreekName, LabState } from "@/lib/payofflab/types";
import { decodeState } from "@/lib/payofflab/share";
import { useEntitlements } from "@/lib/payofflab/entitlements";
import { LabProvider, useLab } from "@/components/payofflab/context";
import { LabChart, fmtNum } from "@/components/payofflab/LabChart";
import type { CrosshairSample, PlotSurfaceHandle } from "@/components/payofflab/PlotSurface";
import { useChartData } from "@/components/payofflab/useChartData";
import { Rail } from "@/components/payofflab/Rail";
import { LearnDrawer } from "@/components/payofflab/LearnDrawer";
import { EmptyState } from "@/components/payofflab/EmptyState";
import { Tour, TOUR_KEY } from "@/components/payofflab/Tour";
import { InfoDot } from "@/components/payofflab/InfoDot";
import { PageLoader } from "@/components/shared/PageLoader";
import type { GridResult } from "@/lib/payofflab/types";
import logoColor from "@/assets/logo-color.svg";
import logoWhite from "@/assets/logo-white.svg";
import "@/components/payofflab/payofflab.css";

// NOTE (§15): the reusable bottom-right round CTA to /lab exists at
// src/components/payofflab/FloatingLabCta.tsx but is deliberately NOT
// mounted in the global Layout yet — the tool is reachable only by route.

const DESKTOP_MIN_PX = 1280;

export default function PayoffLab() {
  const location = useLocation();
  const [initial, setInitial] = useState<LabState | null | "loading">("loading");
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= DESKTOP_MIN_PX,
  );

  useEffect(() => {
    document.title = "PayoffLab — Minerva Investment Management Society";
    const onResize = () => setIsDesktop(window.innerWidth >= DESKTOP_MIN_PX);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const s = params.get("s");
    if (!s) {
      setInitial(null);
      return;
    }
    let cancelled = false;
    decodeState(s).then((st) => {
      if (!cancelled) setInitial(st);
    });
    return () => {
      cancelled = true;
    };
  }, [location.search]);

  if (!isDesktop) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-8">
        <div className="max-w-md text-center">
          <div className="pl-eye mb-3 text-xs uppercase tracking-[0.13em] text-muted-foreground">Minerva PayoffLab</div>
          <h1 className="mb-3 font-serif text-2xl tracking-tight text-foreground">Built for a wide screen</h1>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            PayoffLab is a desktop tool built around wide, precise charts and a full control rail. Please reopen it on a
            larger screen.
          </p>
        </div>
      </div>
    );
  }

  if (initial === "loading") return <PageLoader />;

  return (
    <LabProvider initial={initial ?? undefined}>
      <LabShell />
    </LabProvider>
  );
}

function LabShell() {
  const { state, dispatch, openGlossary, isDark, learn } = useLab();
  const ent = useEntitlements();
  const [tourOpen, setTourOpen] = useState(() => !localStorage.getItem(TOUR_KEY));
  const [addSignal, setAddSignal] = useState(0);
  const [samples, setSamples] = useState<Record<number, CrosshairSample | null>>({});
  const [grids, setGrids] = useState<Record<number, GridResult | null>>({});
  const surfaceRefs = useRef<Array<PlotSurfaceHandle | null>>([null, null, null, null]);
  const exportRef = useRef<PlotSurfaceHandle | null>(null);

  const allEmpty = state.charts.every((c) => c.legs.length === 0);
  const activeGrid = grids[state.activeChart] ?? null;
  const activeChart = state.charts[state.activeChart];
  const activeSample = samples[state.activeChart] ?? null;

  // Keep the export handle pointing at the active chart's surface.
  useEffect(() => {
    exportRef.current = surfaceRefs.current[state.activeChart];
  });

  const visible = state.focused ? [state.activeChart] : state.charts.map((_, i) => i);
  const gridClass = visible.length === 1 ? "grid-cols-1 grid-rows-1"
    : visible.length === 2 ? "grid-cols-2 grid-rows-1"
    : "grid-cols-2 grid-rows-2";

  const scal = activeGrid?.scalars ?? null;
  const strip: Array<{ label: string; value: string; colorVar?: string; info?: string }> = useMemo(() => {
    if (!scal) return [];
    const g = scal.greeks;
    const out: Array<{ label: string; value: string; colorVar?: string; info?: string }> = [
      { label: "Price (net)", value: fmtNum(scal.price), colorVar: "--pl-payoff", info: "net-premium" },
      { label: "Delta", value: fmtNum(g.delta, 3), colorVar: "--pl-delta", info: "greek-delta" },
      { label: "Gamma", value: fmtNum(g.gamma, 4), colorVar: "--pl-gamma", info: "greek-gamma" },
      { label: "Vega", value: fmtNum(g.vega, 3), colorVar: "--pl-vega", info: "greek-vega" },
      { label: "Theta", value: fmtNum(g.theta, 3), colorVar: "--pl-theta", info: "greek-theta" },
      { label: "Rho", value: fmtNum(g.rho, 3), colorVar: "--pl-rho", info: "greek-rho" },
    ];
    if (scal.breakEvens.length > 0) {
      out.push({ label: scal.breakEvens.length > 1 ? "Break-evens" : "Break-even", value: scal.breakEvens.map((b) => b.toFixed(1)).join(" / "), info: "net-premium" });
    }
    if (scal.maxProfit !== null || scal.maxLoss !== null) {
      out.push({
        label: "Max profit / loss",
        value: `${scal.maxProfitUnbounded ? "∞" : fmtNum(scal.maxProfit)} / ${scal.maxLossUnbounded ? "−∞" : fmtNum(scal.maxLoss)}`,
        info: "net-premium",
      });
    }
    return out;
  }, [scal]);

  return (
    // The site header is fixed at 84px (plus safe-area); the lab fills the
    // remaining viewport as an app-like surface with its own internal scroll.
    <div
      className="payofflab flex flex-col bg-background"
      style={{ height: "calc(100vh - 84px - env(safe-area-inset-top))", minHeight: 640 }}
    >
      {/* top bar */}
      <div className="flex h-[54px] flex-none items-center gap-3.5 border-b border-separator px-5">
        <img src={isDark ? logoWhite : logoColor} alt="" className="h-6 w-auto" />
        <span className="font-serif text-[19px] tracking-tight text-accent">PayoffLab</span>
        <span className="border-l border-separator pl-3 text-[11px] text-muted-foreground">
          Minerva Investment Management Society
        </span>
        <div className="ml-auto flex items-center gap-4 text-xs">
          <button type="button" className="text-foreground underline-offset-2 hover:underline" onClick={openGlossary}>
            Glossary
          </button>
          <button type="button" className="text-foreground underline-offset-2 hover:underline" onClick={() => setTourOpen(true)}>
            Tour
          </button>
          <a href="/disclaimer" className="text-muted-foreground underline-offset-2 hover:underline">
            Disclaimer
          </a>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <Rail activeGrid={activeGrid} exportRef={exportRef} onStartTour={() => setTourOpen(true)} />

        {/* main canvas area */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {allEmpty ? (
            <EmptyState onAddAsset={() => setAddSignal((n) => n + 1)} onStartTour={() => setTourOpen(true)} />
          ) : (
            <div className={`grid min-h-0 flex-1 gap-px bg-separator ${gridClass}`}>
              {visible.map((i) => (
                <ChartCell
                  key={state.charts[i].id}
                  index={i}
                  active={i === state.activeChart}
                  onGrid={(g) => setGrids((prev) => (prev[i] === g ? prev : { ...prev, [i]: g }))}
                  onSample={(s) => setSamples((prev) => ({ ...prev, [i]: s }))}
                  surfaceRef={(h) => {
                    surfaceRefs.current[i] = h;
                    if (i === state.activeChart) exportRef.current = h;
                  }}
                />
              ))}
            </div>
          )}

          {/* numeric readout strip (active chart) */}
          {!allEmpty && strip.length > 0 && (
            <div className="flex h-[56px] flex-none items-stretch overflow-x-auto border-t border-separator" data-tour="readout">
              {strip.map((cell) => (
                <div key={cell.label} className="flex flex-col justify-center border-r border-separator px-4">
                  <span className="pl-eye flex items-center gap-1 whitespace-nowrap" style={cell.colorVar ? { color: `var(${cell.colorVar})` } : undefined}>
                    {cell.label}
                    {cell.info && <InfoDot id={cell.info} />}
                  </span>
                  <span className="pl-num whitespace-nowrap text-[15px] text-foreground">{cell.value}</span>
                </div>
              ))}
              <div className="pl-num ml-auto flex items-center whitespace-nowrap px-4 text-[11px] text-muted-foreground">
                {activeSample
                  ? `crosshair · ${activeChart.xVar} = ${activeSample.x.toFixed(activeChart.xVar === "r" ? 4 : 2)}`
                  : "hover a chart to read the crosshair"}
              </div>
            </div>
          )}

          {/* persistent disclaimer (§14) */}
          <div className="flex h-[30px] flex-none items-center gap-2 overflow-hidden border-t border-separator px-4 text-[10.5px] text-muted-foreground">
            <span className="truncate">
              Educational tool — results may contain errors and must not be used for trading or investment decisions.
              Didactic use only.
            </span>
            <span className="ml-auto whitespace-nowrap">© Minerva Investment Management Society — educational use only</span>
          </div>
        </div>

        {learn.open && <LearnDrawer />}
      </div>

      <Tour open={tourOpen} onClose={() => setTourOpen(false)} />
      {/* open the add-asset expander when the empty state asks for it */}
      <AddAssetSignal signal={addSignal} />
      {!ent.shareLinks && null}
    </div>
  );
}

/** Bridges the empty state's CTA to the rail's add-asset expander. */
function AddAssetSignal({ signal }: { signal: number }) {
  useEffect(() => {
    if (signal === 0) return;
    const el = document.querySelector('[data-tour="add-asset"] button');
    if (el instanceof HTMLElement && el.getAttribute("aria-expanded") === "false") el.click();
    el?.scrollIntoView({ block: "center" });
  }, [signal]);
  return null;
}

function ChartCell({
  index, active, onGrid, onSample, surfaceRef,
}: {
  index: number;
  active: boolean;
  onGrid: (g: GridResult | null) => void;
  onSample: (s: CrosshairSample | null) => void;
  surfaceRef: (h: PlotSurfaceHandle | null) => void;
}) {
  const { state } = useLab();
  const chart = state.charts[index];
  // Always request the first-order set for the readout strip; overlays add theirs.
  const extra = useMemo<GreekName[]>(() => [], []);
  const data = useChartData(chart, extra);

  useEffect(() => {
    onGrid(data.grid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.grid]);

  return (
    <LabChart
      ref={surfaceRef}
      chart={chart}
      index={index}
      grid={data.grid}
      compare={data.compare}
      loading={data.loading}
      progress={data.progress}
      showProgress={data.showProgress}
      error={data.error}
      active={active}
      onCrosshairSample={onSample}
    />
  );
}
