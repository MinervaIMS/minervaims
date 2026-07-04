// Minerva PayoffLab, served at /lab. A desktop-only, full-viewport
// derivatives laboratory with three regions: the control rail on the left,
// the chart grid in the middle and the Learn drawer on the right. The route
// is chromeless (no site navbar or footer); the lab carries its own header
// with a link back to the society website. All pricing mathematics lives in
// the `pricing-engine` Supabase Edge Function; this bundle contains inputs
// and rendering only.

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight, Home } from "lucide-react";
import type { GreekName, GridResult, LabState } from "@/lib/payofflab/types";
import { decodeState } from "@/lib/payofflab/share";
import { useEntitlements } from "@/lib/payofflab/entitlements";
import { LabProvider, useLab } from "@/components/payofflab/context";
import type { EngineStatus } from "@/components/payofflab/context";
import { LabChart, fmtNum } from "@/components/payofflab/LabChart";
import type { CrosshairSample, PlotSurfaceHandle } from "@/components/payofflab/PlotSurface";
import { useChartData } from "@/components/payofflab/useChartData";
import { Rail } from "@/components/payofflab/Rail";
import { LearnDrawer } from "@/components/payofflab/LearnDrawer";
import { EmptyState } from "@/components/payofflab/EmptyState";
import { Tour, TOUR_KEY } from "@/components/payofflab/Tour";
import { InfoDot } from "@/components/payofflab/InfoDot";
import { PageLoader } from "@/components/shared/PageLoader";
import logoColor from "@/assets/logo-color.svg";
import logoWhite from "@/assets/logo-white.svg";
import "@/components/payofflab/payofflab.css";

// NOTE (§15): the reusable bottom-right round CTA to /lab exists at
// src/components/payofflab/FloatingLabCta.tsx but is deliberately NOT
// mounted in the global Layout yet. The tool is reachable only by route.

const DESKTOP_MIN_PX = 1280;

export default function PayoffLab() {
  const location = useLocation();
  const [initial, setInitial] = useState<LabState | null | "loading">("loading");
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= DESKTOP_MIN_PX,
  );

  useEffect(() => {
    document.title = "PayoffLab · Minerva Investment Management Society";
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
      <div className="flex min-h-screen items-center justify-center bg-background px-8">
        <div className="max-w-md text-center">
          <div className="mb-3 text-xs uppercase tracking-[0.13em] text-muted-foreground">Minerva PayoffLab</div>
          <h1 className="mb-3 font-serif text-2xl tracking-tight text-foreground">Built for a wide screen</h1>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            PayoffLab is a desktop tool built around wide, precise charts and a full control rail. Please reopen it on a
            larger screen.
          </p>
          <Link to="/" className="mt-6 inline-block border border-accent px-6 py-2.5 font-serif text-sm text-accent">
            Back to the society website
          </Link>
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

function StatusPill({ status }: { status: EngineStatus }) {
  const cfg = {
    live: { cls: "pl-pill--live", label: "Engine live" },
    computing: { cls: "pl-pill--busy", label: "Computing" },
    offline: { cls: "pl-pill--off", label: "Engine offline" },
    idle: { cls: "pl-pill--idle", label: "Standing by" },
  }[status];
  return (
    <span className={`pl-pill ${cfg.cls}`} role="status" aria-live="polite">
      <span className="dot" aria-hidden="true" />
      {cfg.label}
    </span>
  );
}

function LabShell() {
  const { state, openGlossary, isDark, learn, view, setView, engineStatus, setEngineStatus } = useLab();
  const ent = useEntitlements();
  const [tourOpen, setTourOpen] = useState(() => !localStorage.getItem(TOUR_KEY));
  const [addSignal, setAddSignal] = useState(0);
  const [samples, setSamples] = useState<Record<number, CrosshairSample | null>>({});
  const [grids, setGrids] = useState<Record<number, GridResult | null>>({});
  const surfaceRefs = useRef<Array<PlotSurfaceHandle | null>>([null, null, null, null]);
  const exportRef = useRef<PlotSurfaceHandle | null>(null);

  const showHome = view === "home";
  const activeGrid = grids[state.activeChart] ?? null;
  const activeChart = state.charts[state.activeChart];
  const activeSample = samples[state.activeChart] ?? null;

  useEffect(() => {
    exportRef.current = surfaceRefs.current[state.activeChart];
  });

  const visible = state.focused ? [state.activeChart] : state.charts.map((_, i) => i);
  const gridClass = visible.length === 1 ? "grid-cols-1 grid-rows-1"
    : visible.length === 2 ? "grid-cols-2 grid-rows-1"
    : "grid-cols-2 grid-rows-2";

  const scal = activeGrid?.scalars ?? null;
  const strip = useMemo(() => {
    if (!scal) return [] as Array<{ label: string; value: string; colorVar?: string; info?: string }>;
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
    <div className="payofflab flex h-screen min-h-[640px] flex-col bg-background">
      {/* ------------------------------------------------------- top bar */}
      <div className="flex h-[58px] flex-none items-center gap-4 border-b border-separator px-5">
        {/* left cluster: tool identity + Lab Home */}
        <div className="flex items-center gap-3">
          <img src={isDark ? logoWhite : logoColor} alt="Minerva emblem" className="h-7 w-auto" />
          <span className="font-serif text-xl tracking-tight text-accent">PayoffLab</span>
        </div>
        <button
          type="button"
          onClick={() => setView(showHome ? "bench" : "home")}
          className="flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:border-accent hover:text-accent"
          title={showHome ? "Back to the workbench" : "Back to the welcome screen and the Concepts library"}
        >
          <Home size={12} aria-hidden="true" />
          {showHome ? "Workbench" : "Lab Home"}
        </button>

        {/* middle-left: reserved advertising slot. Keep this element where
            it is; drop the creative inside and it becomes visible. */}
        <div className="pl-ad-slot ml-2 min-w-0 flex-1" data-slot="payofflab-topbar-ad" aria-hidden="true" />

        {/* right cluster: society identity + status */}
        <div className="ml-auto flex flex-none items-center gap-4">
          <StatusPill status={engineStatus} />
          <span className="hidden border-l border-separator pl-4 font-serif text-[15px] tracking-tight text-foreground min-[1400px]:inline">
            Minerva Investment Management Society
          </span>
          <span className="border-l border-separator pl-4 font-serif text-[15px] tracking-tight text-foreground min-[1400px]:hidden">
            Minerva IMS
          </span>
          <Link
            to="/"
            className="flex items-center gap-1 bg-accent px-3.5 py-1.5 font-serif text-[13px] text-accent-foreground transition-colors hover:bg-accent/90"
          >
            Society website <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {!showHome && <Rail activeGrid={activeGrid} exportRef={exportRef} onStartTour={() => setTourOpen(true)} />}

        {/* main canvas area */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {showHome ? (
            <EmptyState
              onAddAsset={() => {
                setView("bench");
                setAddSignal((n) => n + 1);
              }}
              onStartTour={() => {
                setView("bench");
                setTourOpen(true);
              }}
            />
          ) : (
            <>
              <div className={`grid min-h-0 flex-1 gap-px bg-separator ${gridClass}`}>
                {visible.map((i) => (
                  <ChartCell
                    key={state.charts[i].id}
                    index={i}
                    active={i === state.activeChart}
                    onGrid={(g) => setGrids((prev) => (prev[i] === g ? prev : { ...prev, [i]: g }))}
                    onStatus={setEngineStatus}
                    onSample={(s) => setSamples((prev) => ({ ...prev, [i]: s }))}
                    surfaceRef={(h) => {
                      surfaceRefs.current[i] = h;
                      if (i === state.activeChart) exportRef.current = h;
                    }}
                  />
                ))}
              </div>

              {/* numeric readout strip for the active chart */}
              {strip.length > 0 && (
                <div className="flex h-[58px] flex-none items-stretch overflow-x-auto border-t border-separator" data-tour="readout">
                  {strip.map((cell) => (
                    <div key={cell.label} className="flex flex-col justify-center border-r border-separator px-4">
                      <span className="pl-eye flex items-center gap-1 whitespace-nowrap" style={cell.colorVar ? { color: `var(${cell.colorVar})` } : undefined}>
                        {cell.label}
                        {cell.info && <InfoDot id={cell.info} />}
                      </span>
                      <span className="pl-num whitespace-nowrap text-base text-foreground">{cell.value}</span>
                    </div>
                  ))}
                  <div className="pl-num ml-auto flex items-center whitespace-nowrap px-4 text-xs text-muted-foreground">
                    {activeSample
                      ? `crosshair · ${activeChart.xVar} = ${activeSample.x.toFixed(activeChart.xVar === "r" ? 4 : 2)}`
                      : "hover a chart to read the crosshair"}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ------------------------------------------- status bar (§14) */}
          <div className="flex h-[32px] flex-none items-center gap-3 overflow-hidden border-t border-separator bg-secondary/60 px-4 text-[11px] text-muted-foreground">
            <button type="button" className="hover:text-accent hover:underline" onClick={openGlossary}>
              Glossary
            </button>
            <span aria-hidden="true">·</span>
            <button type="button" className="hover:text-accent hover:underline" onClick={() => { setView("bench"); setTourOpen(true); }}>
              Guided tour
            </button>
            <span aria-hidden="true">·</span>
            <Link to="/disclaimer" className="hover:text-accent hover:underline">
              Disclaimer
            </Link>
            <span className="hidden truncate border-l border-separator pl-3 min-[1500px]:inline">
              Educational tool. Results may contain errors and must not be used for trading or investment decisions.
            </span>
            <span className="ml-auto whitespace-nowrap">© Minerva Investment Management Society, educational use only</span>
          </div>
        </div>

        {!showHome && learn.open && <LearnDrawer />}
      </div>

      <Tour open={tourOpen} onClose={() => setTourOpen(false)} />
      <AddAssetSignal signal={addSignal} />
      {!ent.shareLinks && null}
    </div>
  );
}

/** Bridges the welcome screen's call to action to the rail's add-asset expander. */
function AddAssetSignal({ signal }: { signal: number }) {
  useEffect(() => {
    if (signal === 0) return;
    // The rail mounts on the next frame when leaving the home view.
    const t = setTimeout(() => {
      const el = document.querySelector('[data-tour="add-asset"] button');
      if (el instanceof HTMLElement && el.getAttribute("aria-expanded") === "false") el.click();
      el?.scrollIntoView({ block: "center" });
    }, 60);
    return () => clearTimeout(t);
  }, [signal]);
  return null;
}

function ChartCell({
  index, active, onGrid, onStatus, onSample, surfaceRef,
}: {
  index: number;
  active: boolean;
  onGrid: (g: GridResult | null) => void;
  onStatus: (s: EngineStatus) => void;
  onSample: (s: CrosshairSample | null) => void;
  surfaceRef: (h: PlotSurfaceHandle | null) => void;
}) {
  const { state } = useLab();
  const chart = state.charts[index];
  const extra = useMemo<GreekName[]>(() => [], []);
  const data = useChartData(chart, extra);

  useEffect(() => {
    onGrid(data.grid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.grid]);

  useEffect(() => {
    if (chart.legs.length === 0) return;
    if (data.loading) onStatus("computing");
    else if (data.error) onStatus("offline");
    else if (data.grid) onStatus("live");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.loading, data.error, data.grid]);

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
