// PayoffLab — client domain model. This file contains INPUTS ONLY (state,
// wire types); all pricing mathematics lives in the `pricing-engine`
// Supabase Edge Function and is never bundled client-side.

export type Level = "basic" | "advanced" | "pro";

export type XVar = "S" | "t" | "r";

export type GreekName =
  | "delta" | "gamma" | "theta" | "vega" | "rho"
  | "vanna" | "vomma" | "charm" | "speed" | "colour";

export const FIRST_ORDER_GREEKS: GreekName[] = ["delta", "gamma", "theta", "vega", "rho"];
export const SECOND_ORDER_GREEKS: GreekName[] = ["vanna", "vomma", "charm", "speed", "colour"];

export type DashPattern = "solid" | "dashed" | "dashdot" | "dotted";
export type LineWidth = 1 | 2 | 3;

export interface LineStyle {
  /** Palette id (resolved to a theme-aware colour at render time). */
  color: string;
  dash: DashPattern;
  width: LineWidth;
}

export interface Leg {
  id: string;
  instrument: string;
  side: 1 | -1;
  qty: number;
  params: Record<string, number | string>;
  /** True when the leg was added by a hedging action. */
  hedge?: boolean;
}

export type PricingModelId =
  | "auto" | "black-scholes" | "bachelier" | "merton-jump"
  | "binomial-crr" | "binomial-jr" | "trinomial";

export type VolModelState =
  | { kind: "constant" }
  | { kind: "term"; points: Array<{ t: number; sigma: number }> }
  | { kind: "garch"; sigmaLong: number; persistence: number }
  | { kind: "sabr"; alpha: number; beta: number; rhoSabr: number; nu: number }
  | { kind: "smile"; skew: number; curv: number }
  | { kind: "heston"; kappa: number; thetaV: number; xi: number; rhoSV: number }
  | { kind: "localvol"; skew: number; curv: number };

export type RateModelState =
  | { kind: "constant" }
  | { kind: "merton"; a: number; sigmaR: number }
  | { kind: "vasicek"; a: number; theta: number; sigmaR: number }
  | { kind: "cir"; a: number; theta: number; sigmaR: number };

export interface ModelState {
  pricing: PricingModelId;
  treeSteps: number;
  jump: { lambda: number; muJ: number; deltaJ: number };
  vol: VolModelState;
  rates: RateModelState;
  mcPaths: number;
  mcSteps: number;
  seed: number;
}

export interface FixedMarket {
  S: number;
  r: number;
  sigma: number;
  q: number;
}

export interface ChartState {
  id: string;
  title: string;
  legs: Leg[];
  xVar: XVar;
  /** Manual x-range override; null = auto range from the market state. */
  xRange: { min: number; max: number } | null;
  market: FixedMarket;
  showPayoff: boolean;
  showValue: boolean;
  /** Up to 3 aggregate Greek overlays. */
  greeks: GreekName[];
  /** Show payoff/value net of the initial premium (profit convention). */
  netPremium: boolean;
  labels: boolean;
  markers: boolean;
  signShading: boolean;
  /** Optional per-line style overrides, keyed by "payoff" | "value" | greek. */
  styles: Partial<Record<string, LineStyle>>;
  model: ModelState;
  /** Second model overlaid for comparison (e.g. Bachelier vs BS), or null. */
  compareModel: ModelState | null;
}

export interface LabState {
  v: 1;
  level: Level;
  charts: ChartState[];
  activeChart: number;
  focused: boolean;
  syncCrosshair: boolean;
}

// ---- wire types (mirror the edge function response) -----------------------

export interface GridScalars {
  price: number;
  legPrices: number[];
  greeks: Record<string, number>;
  breakEvens: number[];
  maxProfit: number | null;
  maxLoss: number | null;
  maxProfitUnbounded: boolean;
  maxLossUnbounded: boolean;
  horizon: number | null;
}

export interface GridResult {
  x: number[];
  value: number[];
  payoff: number[] | null;
  greeks: Record<string, number[]>;
  scalars: GridScalars;
  notes: string[];
}

export interface HedgeSolveResult {
  legs: Array<{ instrument: string; side: 1 | -1; qty: number; params: Record<string, number | string> }>;
  residual: Record<string, number>;
  note: string;
}

export interface HedgeSimResult {
  times: number[];
  path: number[];
  deltaHeld: number[];
  hedgedPnl: number[];
  unhedgedPnl: number[];
  gammaPnl: number[];
  thetaPnl: number[];
  residualPnl: number[];
  summary: {
    finalHedged: number;
    finalUnhedged: number;
    stdHedged: number;
    stdUnhedged: number;
  };
  notes: string[];
}

// ---- defaults --------------------------------------------------------------

export const DEFAULT_MODEL: ModelState = {
  pricing: "auto",
  treeSteps: 200,
  jump: { lambda: 0.5, muJ: -0.1, deltaJ: 0.2 },
  vol: { kind: "constant" },
  rates: { kind: "constant" },
  mcPaths: 8000,
  mcSteps: 64,
  seed: 42,
};

export const DEFAULT_MARKET: FixedMarket = { S: 100, r: 0.05, sigma: 0.2, q: 0 };

let idCounter = 0;
export function freshId(prefix: string): string {
  idCounter += 1;
  return `${prefix}${Date.now().toString(36)}${idCounter.toString(36)}`;
}

export function emptyChart(title = "Chart 1"): ChartState {
  return {
    id: freshId("c"),
    title,
    legs: [],
    xVar: "S",
    xRange: null,
    market: { ...DEFAULT_MARKET },
    showPayoff: true,
    showValue: true,
    greeks: [],
    netPremium: true,
    labels: true,
    markers: true,
    signShading: false,
    styles: {},
    model: JSON.parse(JSON.stringify(DEFAULT_MODEL)) as ModelState,
    compareModel: null,
  };
}

export function initialLabState(): LabState {
  return {
    v: 1,
    level: "basic",
    charts: [emptyChart()],
    activeChart: 0,
    focused: false,
    syncCrosshair: false,
  };
}

/** Auto x-range for a chart given its market state. */
export function autoRange(chart: ChartState): { min: number; max: number } {
  if (chart.xRange) return chart.xRange;
  switch (chart.xVar) {
    case "S": {
      const S = chart.market.S;
      return { min: Math.max(S * 0.5, 1e-6), max: S * 1.5 };
    }
    case "t": {
      // Sweep calendar time from now to the nearest expiry (fallback 1y).
      let T = Infinity;
      for (const leg of chart.legs) {
        const t = leg.params.T ?? leg.params.tenor ?? leg.params.T2 ?? leg.params.expiry;
        if (typeof t === "number" && t > 0) T = Math.min(T, t);
      }
      if (!isFinite(T)) T = 1;
      return { min: 0, max: T };
    }
    case "r":
      return { min: 0, max: Math.max(chart.market.r * 2, 0.12) };
  }
}
