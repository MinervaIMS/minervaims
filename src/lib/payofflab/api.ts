// PayoffLab — thin client for the `pricing-engine` edge function.
// Sends inputs, receives sampled arrays; caches identical requests and
// deduplicates in-flight calls so crosshair/UI work never re-queries.

import { supabase } from "@/integrations/supabase/client";
import type {
  ChartState, GreekName, GridResult, HedgeSimResult, HedgeSolveResult, XVar,
} from "./types";
import { autoRange } from "./types";
import { INSTRUMENTS_BY_ID } from "./catalog";

interface GridRequestBody {
  action: "grid";
  legs: Array<{ instrument: string; side: 1 | -1; qty: number; params: Record<string, number | string> }>;
  model: ChartState["model"];
  market: ChartState["market"];
  xVar: XVar;
  xMin: number;
  xMax: number;
  n: number;
  greeks: GreekName[];
  wantPayoff: boolean;
}

const cache = new Map<string, GridResult>();
const inflight = new Map<string, Promise<unknown>>();
const CACHE_MAX = 120;

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const key = JSON.stringify(body);
  if (body.action === "grid" && cache.has(key)) return cache.get(key) as T;
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const p = (async () => {
    const { data, error } = await supabase.functions.invoke("pricing-engine", { body });
    if (error) {
      let msg = error.message || "Pricing request failed";
      // supabase-js surfaces non-2xx as FunctionsHttpError with a Response.
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") {
        try {
          const parsed = await ctx.json();
          if (parsed?.error) msg = parsed.error;
        } catch { /* keep default message */ }
      }
      throw new Error(msg);
    }
    if (data && typeof data === "object" && "error" in data && (data as { error?: string }).error) {
      throw new Error((data as { error: string }).error);
    }
    if (body.action === "grid") {
      if (cache.size >= CACHE_MAX) {
        const first = cache.keys().next().value;
        if (first !== undefined) cache.delete(first);
      }
      cache.set(key, data as GridResult);
    }
    return data as T;
  })();
  inflight.set(key, p);
  try {
    return await p;
  } finally {
    inflight.delete(key);
  }
}

export function gridBodyFor(chart: ChartState, greeks: GreekName[]): GridRequestBody {
  const range = autoRange(chart);
  const heavy = chart.legs.some((l) => INSTRUMENTS_BY_ID[l.instrument]?.usesMc) ||
    chart.model.vol.kind === "heston" || chart.model.vol.kind === "localvol" ||
    chart.model.pricing.startsWith("binomial") || chart.model.pricing === "trinomial" ||
    chart.legs.some((l) => l.instrument === "amer-option");
  return {
    action: "grid",
    legs: chart.legs.map((l) => ({ instrument: l.instrument, side: l.side, qty: l.qty, params: l.params })),
    model: chart.model,
    market: chart.market,
    xVar: chart.xVar,
    xMin: range.min,
    xMax: range.max,
    n: heavy ? 81 : 201,
    greeks,
    wantPayoff: chart.showPayoff,
  };
}

export function fetchGrid(chart: ChartState, greeks: GreekName[]): Promise<GridResult> {
  return invoke<GridResult>(gridBodyFor(chart, greeks) as unknown as Record<string, unknown>);
}

/** Grid for the comparison model overlay (value line only). */
export function fetchCompareGrid(chart: ChartState): Promise<GridResult> {
  if (!chart.compareModel) return Promise.reject(new Error("no comparison model"));
  const body = gridBodyFor(chart, []);
  return invoke<GridResult>({ ...body, model: chart.compareModel, wantPayoff: false } as unknown as Record<string, unknown>);
}

export function fetchHedgeSolve(
  chart: ChartState, kind: "delta" | "delta-gamma" | "vega",
): Promise<HedgeSolveResult> {
  return invoke<HedgeSolveResult>({
    action: "hedge-solve",
    legs: chart.legs.filter((l) => !l.hedge).map((l) => ({ instrument: l.instrument, side: l.side, qty: l.qty, params: l.params })),
    model: chart.model,
    market: chart.market,
    kind,
    hedgeOptionT: 1,
  });
}

export function fetchHedgeSim(
  chart: ChartState,
  opts: { sigmaReal: number; sigmaHedge: number; rehedges: number; seed: number },
): Promise<HedgeSimResult> {
  return invoke<HedgeSimResult>({
    action: "hedge-sim",
    legs: chart.legs.filter((l) => !l.hedge).map((l) => ({ instrument: l.instrument, side: l.side, qty: l.qty, params: l.params })),
    model: chart.model,
    market: chart.market,
    statPaths: 200,
    ...opts,
  });
}

/** Rough latency guess used to decide when to show the progress bar (§12). */
export function estimateLatencyMs(chart: ChartState): number {
  const mc = chart.legs.some((l) => INSTRUMENTS_BY_ID[l.instrument]?.usesMc) ||
    chart.model.vol.kind === "heston" || chart.model.vol.kind === "localvol";
  const tree = chart.model.pricing.startsWith("binomial") || chart.model.pricing === "trinomial" ||
    chart.legs.some((l) => l.instrument === "amer-option");
  if (mc) return 2500 + chart.model.mcPaths * chart.model.mcSteps * (1 + chart.greeks.length) / 400;
  if (tree) return 900;
  return 350;
}
