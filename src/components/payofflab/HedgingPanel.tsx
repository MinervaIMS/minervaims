// PayoffLab — Hedging module (§9). One-click hedge actions add real,
// labelled legs to the portfolio (undoable); the discrete-time delta-hedging
// simulation lives in its own sub-panel with a plain-English readout and a
// gamma/theta decomposition of the residual P/L.

import { useMemo, useRef, useState } from "react";
import type { ChartState, GridResult, HedgeSimResult, Leg } from "@/lib/payofflab/types";
import { freshId } from "@/lib/payofflab/types";
import { fetchHedgeSim, fetchHedgeSolve } from "@/lib/payofflab/api";
import { INSTRUMENTS_BY_ID } from "@/lib/payofflab/catalog";
import { defaultStyle } from "@/lib/payofflab/colors";
import { useLab } from "./context";
import { InfoDot } from "./InfoDot";
import { fmtNum } from "./LabChart";
import { NumberField } from "./Rail";
import { PlotSurface } from "./PlotSurface";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

type HedgeKind = "delta" | "delta-gamma" | "vega";

export function HedgingPanel({
  chart, chartIndex, activeGrid,
}: {
  chart: ChartState;
  chartIndex: number;
  activeGrid: GridResult | null;
}) {
  const { dispatch, openLearn, watermark } = useLab();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [residual, setResidual] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [simOpen, setSimOpen] = useState(false);

  const baseLegs = chart.legs.filter((l) => !l.hedge);
  const hedgeLegs = chart.legs.filter((l) => l.hedge);
  const hasMc = chart.legs.some((l) => INSTRUMENTS_BY_ID[l.instrument]?.usesMc);

  const applyHedge = async (kind: HedgeKind) => {
    if (baseLegs.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetchHedgeSolve({ ...chart, legs: baseLegs }, kind);
      const added: Leg[] = res.legs.map((l) => ({ ...l, id: freshId("h"), hedge: true }));
      dispatch({ type: "set-legs", index: chartIndex, legs: [...baseLegs, ...added] });
      setNote(res.note);
      setResidual(res.residual);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hedge failed");
    } finally {
      setBusy(false);
    }
  };

  const undoHedge = () => {
    dispatch({ type: "set-legs", index: chartIndex, legs: baseLegs });
    setNote(null);
    setResidual(null);
  };

  const spotGreeks = activeGrid?.scalars.greeks;

  return (
    <div className="flex flex-col gap-3 text-[11px]">
      <p className="leading-snug text-muted-foreground">
        Each action adds real, labelled legs so the aggregate curves show the hedge working — and it can be undone.
        <button type="button" className="ml-1 text-accent underline underline-offset-2" onClick={() => openLearn("hedging-intro")}>
          How to use this
        </button>
      </p>
      <div className="flex gap-1.5">
        {(
          [
            { kind: "delta" as const, label: "Delta", info: "hedge-delta" },
            { kind: "delta-gamma" as const, label: "Δ–Γ", info: "hedge-delta-gamma" },
            { kind: "vega" as const, label: "Vega", info: "hedge-vega" },
          ]
        ).map((h) => (
          <span key={h.kind} className="flex flex-1 items-center gap-1">
            <button
              type="button"
              className="flex-1 border border-accent py-1.5 text-accent hover:bg-accent hover:text-accent-foreground disabled:opacity-40"
              disabled={busy || baseLegs.length === 0 || chart.legs.length >= 7}
              onClick={() => applyHedge(h.kind)}
            >
              {h.label}
            </button>
            <InfoDot id={h.info} />
          </span>
        ))}
      </div>
      {hedgeLegs.length > 0 && (
        <button type="button" className="self-start text-muted-foreground underline underline-offset-2 hover:text-accent" onClick={undoHedge}>
          Undo hedge ({hedgeLegs.length} leg{hedgeLegs.length > 1 ? "s" : ""})
        </button>
      )}
      {note && <div className="border-l-2 border-accent bg-secondary px-2.5 py-1.5 leading-snug text-muted-foreground">{note}</div>}
      {error && <div className="text-destructive">{error}</div>}
      {(residual || spotGreeks) && (
        <div className="flex flex-col gap-0.5">
          <div className="pl-eye mb-0.5">Residual Greeks at spot</div>
          {(["delta", "gamma", "vega", "theta"] as const).map((g) => {
            const v = (residual ?? spotGreeks ?? {})[g];
            return (
              <div key={g} className="flex justify-between">
                <span className="text-muted-foreground capitalize">{g}</span>
                <span className="pl-num text-foreground">{fmtNum(v, 4)}</span>
              </div>
            );
          })}
        </div>
      )}
      <button
        type="button"
        className="bg-accent py-2 font-serif text-[13px] text-accent-foreground disabled:opacity-40"
        disabled={baseLegs.length === 0 || hasMc}
        title={hasMc ? "The simulation supports closed-form portfolios only" : undefined}
        onClick={() => setSimOpen(true)}
      >
        Open delta-hedging simulation →
      </button>
      {hasMc && <div className="text-[10px] text-muted-foreground">The simulation supports closed-form portfolios only.</div>}
      <HedgeSimDialog chart={chart} open={simOpen} onClose={() => setSimOpen(false)} watermark={watermark} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function HedgeSimDialog({
  chart, open, onClose, watermark,
}: {
  chart: ChartState;
  open: boolean;
  onClose: () => void;
  watermark: HTMLImageElement | null;
}) {
  const { openLearn } = useLab();
  const [sigmaReal, setSigmaReal] = useState(chart.market.sigma);
  const [sigmaHedge, setSigmaHedge] = useState(chart.market.sigma);
  const [rehedges, setRehedges] = useState(52);
  const [seed, setSeed] = useState(1);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<HedgeSimResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const genRef = useRef(0);

  const run = async () => {
    const gen = ++genRef.current;
    setRunning(true);
    setError(null);
    try {
      const res = await fetchHedgeSim(chart, { sigmaReal, sigmaHedge, rehedges, seed });
      if (gen === genRef.current) setResult(res);
    } catch (e) {
      if (gen === genRef.current) setError(e instanceof Error ? e.message : "Simulation failed");
    } finally {
      if (gen === genRef.current) setRunning(false);
    }
  };

  const pnlSeries = useMemo(() => {
    if (!result) return [];
    return [
      { id: "value", label: "Hedged P/L", x: result.times, y: result.hedgedPnl, style: defaultStyle("vega"), axis: "left" as const },
      { id: "payoff", label: "Unhedged P/L", x: result.times, y: result.unhedgedPnl, style: { ...defaultStyle("payoff"), color: "vermillion" }, axis: "left" as const },
    ];
  }, [result]);

  const pathSeries = useMemo(() => {
    if (!result) return [];
    const cum = (arr: number[]) => {
      const out: number[] = [];
      let s = 0;
      for (const v of arr) { s += v; out.push(s); }
      return out;
    };
    return [
      { id: "delta", label: "Underlying path", x: result.times, y: result.path, style: defaultStyle("delta"), axis: "left" as const },
      { id: "gamma", label: "Σ ½Γ(ΔS)²", x: result.times.slice(1), y: cum(result.gammaPnl), style: defaultStyle("gamma"), axis: "right" as const },
      { id: "theta", label: "Σ Θδt", x: result.times.slice(1), y: cum(result.thetaPnl), style: defaultStyle("theta"), axis: "right" as const },
    ];
  }, [result]);

  const s = result?.summary;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="payofflab max-w-4xl gap-0 rounded-none border-separator p-0">
        <DialogHeader className="border-b border-separator px-6 py-4">
          <DialogTitle className="font-serif text-xl tracking-tight text-accent">Discrete delta-hedging simulation</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            One seeded path at the realised volatility, re-hedged at fixed intervals with model-vol deltas — plus a
            200-path ensemble for the dispersion statistics.
            <button type="button" className="ml-1.5 text-accent underline underline-offset-2" onClick={() => openLearn("hedge-sim")}>
              Why discrete hedging leaves risk
            </button>
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-[240px_1fr] gap-0">
          <div className="flex flex-col gap-3 border-r border-separator px-5 py-4 text-[11px]">
            <label className="flex flex-col gap-1">
              <span className="flex items-center gap-1 text-muted-foreground">Realised vol σ_real <InfoDot id="hedge-sim" /></span>
              <NumberField value={sigmaReal} percent min={0.01} max={2} step={0.01} ariaLabel="Realised volatility" onChange={setSigmaReal} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="flex items-center gap-1 text-muted-foreground">Hedge (model) vol σ_hedge <InfoDot id="hedge-sim" /></span>
              <NumberField value={sigmaHedge} percent min={0.01} max={2} step={0.01} ariaLabel="Hedging volatility" onChange={setSigmaHedge} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground">Re-hedges over the horizon</span>
              <select
                className="border border-border bg-background px-2 py-1.5 text-xs"
                value={rehedges}
                aria-label="Re-hedge frequency"
                onChange={(e) => setRehedges(Number(e.target.value))}
              >
                <option value={12}>Monthly (12)</option>
                <option value={52}>Weekly (52)</option>
                <option value={252}>Daily (252)</option>
                <option value={730}>Twice daily (730)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground">Path seed</span>
              <NumberField value={seed} min={0} max={99999} step={1} ariaLabel="Path seed" onChange={(v) => setSeed(Math.round(v))} />
            </label>
            <button type="button" className="mt-1 bg-accent py-2 font-serif text-[13px] text-accent-foreground disabled:opacity-50" disabled={running} onClick={run}>
              {running ? "Simulating…" : "Run simulation"}
            </button>
            {error && <div className="text-destructive">{error}</div>}
            {s && (
              <div className="flex flex-col gap-1 border-t border-separator pt-3">
                <div className="flex justify-between"><span className="text-muted-foreground">Hedged P/L (this path)</span><span className="pl-num">{fmtNum(s.finalHedged)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Unhedged P/L</span><span className="pl-num">{fmtNum(s.finalUnhedged)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Hedged σ-P/L</span><span className="pl-num" style={{ color: "var(--pl-pos-strong)" }}>±{fmtNum(Math.abs(s.stdHedged)).replace("+", "")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Unhedged σ-P/L</span><span className="pl-num" style={{ color: "var(--pl-neg-strong)" }}>±{fmtNum(Math.abs(s.stdUnhedged)).replace("+", "")}</span></div>
              </div>
            )}
          </div>
          <div className="payofflab flex min-h-[440px] flex-col gap-1 px-4 py-3">
            {result ? (
              <>
                <div className="pl-eye">Hedged vs unhedged cumulative P/L</div>
                <div className="min-h-0 flex-1">
                  <PlotSurface
                    series={pnlSeries}
                    xLabel="Time (years)"
                    ariaLabel="Hedged versus unhedged cumulative profit and loss along the simulated path"
                    watermark={watermark}
                    formatX={(v) => v.toFixed(2)}
                  />
                </div>
                <div className="pl-eye mt-1">Underlying path & P/L decomposition (right axis: Σ½Γ(ΔS)² vs ΣΘδt)</div>
                <div className="min-h-0 flex-1">
                  <PlotSurface
                    series={pathSeries}
                    xLabel="Time (years)"
                    ariaLabel="Simulated underlying path with cumulative gamma and theta profit contributions"
                    watermark={watermark}
                    formatX={(v) => v.toFixed(2)}
                  />
                </div>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  {plainEnglish(result, sigmaReal, sigmaHedge, rehedges)}
                </p>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                Choose the volatilities and re-hedge frequency, then run.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function plainEnglish(r: HedgeSimResult, sReal: number, sHedge: number, n: number): string {
  const s = r.summary;
  const ratio = s.stdUnhedged > 1e-9 ? s.stdHedged / s.stdUnhedged : 0;
  const freq = n >= 730 ? "twice a day" : n >= 252 ? "daily" : n >= 52 ? "weekly" : "monthly";
  let msg = `Re-hedging ${freq} cut the P/L dispersion to ${(ratio * 100).toFixed(0)}% of the unhedged position's (±${Math.abs(s.stdHedged).toFixed(2)} vs ±${Math.abs(s.stdUnhedged).toFixed(2)}). `;
  msg += `On this path the hedged book finished at ${s.finalHedged >= 0 ? "+" : ""}${s.finalHedged.toFixed(2)}: the gap between the gamma term Σ½Γ(ΔS)² and the theta term ΣΘδt that continuous re-hedging would have closed exactly. `;
  if (Math.abs(sReal - sHedge) > 1e-9) {
    msg += `You hedged at σ = ${(sHedge * 100).toFixed(0)}% while the world moved at ${(sReal * 100).toFixed(0)}% — that volatility gap leaks through the gamma term, biasing the hedged P/L ${sReal > sHedge ? "against a short-gamma book" : "in a short-gamma book's favour"}.`;
  } else {
    msg += `Increase the re-hedge frequency and the residual shrinks like 1/√n; drop it to monthly and watch the gamma risk reappear.`;
  }
  return msg;
}
