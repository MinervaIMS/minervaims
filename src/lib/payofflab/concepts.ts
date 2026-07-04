// PayoffLab guided "Concepts" presets (§10). One click loads a configured
// chart together with a Learn walkthrough. The welcome screen groups these
// by category.

import type { ChartState, Level, XVar } from "./types";
import { emptyChart, freshId } from "./types";
import { STRATEGY_PRESETS } from "./catalog";

export type ConceptCategory = "Strategies" | "The Greeks" | "Hedging" | "Models" | "Exotics" | "Rates & volatility";

export const CONCEPT_CATEGORIES: ConceptCategory[] = [
  "Strategies", "The Greeks", "Hedging", "Models", "Exotics", "Rates & volatility",
];

export interface Concept {
  id: string;
  label: string;
  category: ConceptCategory;
  tier: Level;
  blurb: string;
  /** Learn-drawer entry opened alongside the chart. */
  learnId: string;
  /** Mini-sparkline path (200x64 viewBox) for the concept card. */
  spark: { d: string; colorVar: string; d2?: string };
  build: () => ChartState[];
}

function fromStrategy(presetId: string, title?: string): ChartState {
  const chart = emptyChart();
  const preset = STRATEGY_PRESETS.find((p) => p.id === presetId);
  if (!preset) return chart;
  chart.legs = preset.build(chart.market.S).map((l) => ({ ...l, id: freshId("l") }));
  chart.title = title ?? preset.label;
  return chart;
}

function single(
  title: string,
  instrument: string,
  params: Record<string, number | string>,
  opts: { side?: 1 | -1; xVar?: XVar; greeks?: ChartState["greeks"]; showPayoff?: boolean } = {},
): ChartState {
  const c = emptyChart(title);
  c.legs = [{ id: freshId("l"), instrument, side: opts.side ?? 1, qty: 1, params }];
  if (opts.xVar) c.xVar = opts.xVar;
  if (opts.greeks) c.greeks = opts.greeks;
  if (opts.showPayoff !== undefined) c.showPayoff = opts.showPayoff;
  return c;
}

export const CONCEPTS: Concept[] = [
  // ------------------------------------------------------------ Strategies
  {
    id: "bull-call-spread", label: "Build a bull call spread", category: "Strategies", tier: "basic",
    blurb: "Capped upside, defined risk", learnId: "concept-bull-call-spread",
    spark: { d: "M6,46 L88,46 L150,16 L194,16", colorVar: "--pl-payoff" },
    build: () => { const c = fromStrategy("bull-call-spread"); c.greeks = ["delta"]; return [c]; },
  },
  {
    id: "long-straddle", label: "Long straddle", category: "Strategies", tier: "basic",
    blurb: "Profit from movement in either direction", learnId: "concept-straddle",
    spark: { d: "M6,14 L100,46 L194,14", colorVar: "--pl-payoff" },
    build: () => { const c = fromStrategy("straddle"); c.greeks = ["vega"]; return [c]; },
  },
  {
    id: "covered-call", label: "Covered call", category: "Strategies", tier: "basic",
    blurb: "Own the stock, sell the upside for income", learnId: "concept-covered-call",
    spark: { d: "M6,52 L120,18 L194,18", colorVar: "--pl-payoff" },
    build: () => { const c = fromStrategy("covered-call"); c.greeks = ["delta"]; return [c]; },
  },
  {
    id: "protective-put", label: "Protective put", category: "Strategies", tier: "basic",
    blurb: "A floor under the portfolio, priced in vega", learnId: "concept-protective-put",
    spark: { d: "M6,34 L96,34 L194,8", colorVar: "--pl-payoff" },
    build: () => { const c = fromStrategy("protective-put"); c.greeks = ["delta"]; return [c]; },
  },
  {
    id: "butterfly", label: "Butterfly: betting on a pin", category: "Strategies", tier: "basic",
    blurb: "Maximum payout if S finishes at the middle strike", learnId: "concept-butterfly",
    spark: { d: "M6,46 L70,46 L100,12 L130,46 L194,46", colorVar: "--pl-payoff" },
    build: () => { const c = fromStrategy("butterfly"); c.greeks = ["gamma"]; return [c]; },
  },
  {
    id: "collar", label: "Collar a stock position", category: "Strategies", tier: "basic",
    blurb: "Floor and cap, often close to zero cost", learnId: "concept-collar",
    spark: { d: "M6,40 L60,40 L140,14 L194,14", colorVar: "--pl-payoff" },
    build: () => { const c = fromStrategy("collar"); c.greeks = ["delta"]; return [c]; },
  },
  {
    id: "calendar", label: "Calendar spread", category: "Strategies", tier: "basic",
    blurb: "Selling fast decay, owning slow decay", learnId: "concept-calendar",
    spark: { d: "M6,40 C70,38 90,16 100,16 C110,16 130,38 194,40", colorVar: "--pl-value" },
    build: () => { const c = fromStrategy("calendar"); c.greeks = ["theta"]; return [c]; },
  },
  // ------------------------------------------------------------ The Greeks
  {
    id: "delta-hedge-ratio", label: "Delta is the hedge ratio", category: "The Greeks", tier: "basic",
    blurb: "The slope of the value curve, from 0 to 1", learnId: "greek-delta",
    spark: { d: "M6,52 C70,50 100,32 120,20 C150,8 180,6 194,6", colorVar: "--pl-delta" },
    build: () => [single("Call delta across S", "euro-option", { cp: "call", K: 100, T: 1 }, { greeks: ["delta"] })],
  },
  {
    id: "time-decay", label: "Time decay of an ATM option", category: "The Greeks", tier: "basic",
    blurb: "Theta: time value bleeding to intrinsic", learnId: "concept-time-decay",
    spark: { d: "M6,14 C70,18 140,30 194,52", colorVar: "--pl-theta" },
    build: () => [single("Value against time", "euro-option", { cp: "call", K: 100, T: 1 }, { xVar: "t", greeks: ["theta"] })],
  },
  {
    id: "gamma-near-expiry", label: "Watch gamma explode near expiry", category: "The Greeks", tier: "pro",
    blurb: "Why gamma spikes at the strike as time runs out", learnId: "concept-gamma-expiry",
    spark: { d: "M6,40 C70,40 80,10 100,10 C120,10 130,40 194,40", colorVar: "--pl-gamma" },
    build: () => {
      const c = single("Gamma toward expiry", "euro-option", { cp: "call", K: 100, T: 1 }, { xVar: "t", greeks: ["gamma", "vega"], showPayoff: false });
      return [c];
    },
  },
  {
    id: "vega-term", label: "Vega grows with maturity", category: "The Greeks", tier: "advanced",
    blurb: "Long-dated ATM options carry the volatility risk", learnId: "greek-vega",
    spark: { d: "M6,52 C60,40 120,22 194,10", colorVar: "--pl-vega" },
    build: () => [single("Vega against time to expiry", "euro-option", { cp: "call", K: 100, T: 2 }, { xVar: "t", greeks: ["vega"], showPayoff: false })],
  },
  {
    id: "gamma-sign-flip", label: "Where a spread flips convexity", category: "The Greeks", tier: "pro",
    blurb: "Long gamma below, short gamma above", learnId: "concept-bull-call-spread",
    spark: { d: "M6,32 C60,32 70,12 100,12 C130,12 140,52 194,52", colorVar: "--pl-gamma" },
    build: () => {
      const c = fromStrategy("bull-call-spread", "Bull call spread: sign of gamma");
      c.greeks = ["gamma"];
      c.signShading = true;
      return [c];
    },
  },
  // -------------------------------------------------------------- Hedging
  {
    id: "delta-hedge-short-call", label: "Delta-hedge a short call", category: "Hedging", tier: "pro",
    blurb: "Re-hedging in steps and the residual P/L", learnId: "concept-delta-hedge",
    spark: { d: "M6,50 C70,20 130,20 194,50", colorVar: "--pl-delta" },
    build: () => [single("Short call, to be hedged", "euro-option", { cp: "call", K: 100, T: 1 }, { side: -1, greeks: ["delta"] })],
  },
  {
    id: "gamma-vs-theta", label: "Gamma pays, theta charges", category: "Hedging", tier: "pro",
    blurb: "The two sides of a hedged option book", learnId: "hedge-sim",
    spark: { d: "M6,20 C70,22 130,30 194,44", colorVar: "--pl-gamma", d2: "M6,44 C70,42 130,34 194,20" },
    build: () => [single("Long call: gamma against theta", "euro-option", { cp: "call", K: 100, T: 0.5 }, { greeks: ["gamma", "theta"] })],
  },
  // --------------------------------------------------------------- Models
  {
    id: "bachelier-vs-bs", label: "Bachelier vs Black-Scholes", category: "Models", tier: "advanced",
    blurb: "When the model choice actually matters", learnId: "concept-bachelier",
    spark: { d: "M6,44 C90,44 120,20 194,14", colorVar: "--pl-value", d2: "M6,42 C90,42 120,26 194,20" },
    build: () => {
      const c = single("Bachelier vs Black-Scholes", "euro-option", { cp: "call", K: 100, T: 1 });
      c.compareModel = { ...c.model, pricing: "bachelier" };
      return [c];
    },
  },
  {
    id: "binomial-convergence", label: "Binomial converges to Black-Scholes", category: "Models", tier: "advanced",
    blurb: "Watch a 50-step tree hug the closed form", learnId: "model-binomial",
    spark: { d: "M6,40 C60,38 120,24 194,16", colorVar: "--pl-value", d2: "M6,44 L40,36 L80,40 L120,26 L160,22 L194,18" },
    build: () => {
      const c = single("Tree against closed form", "euro-option", { cp: "call", K: 100, T: 1 });
      c.model = { ...c.model, pricing: "binomial-crr", treeSteps: 50 };
      c.compareModel = { ...c.model, pricing: "black-scholes" };
      return [c];
    },
  },
  {
    id: "jump-smile", label: "Jumps fatten the tails", category: "Models", tier: "advanced",
    blurb: "Merton jump-diffusion against plain diffusion", learnId: "model-jump",
    spark: { d: "M6,44 C60,44 100,30 194,10", colorVar: "--pl-value", d2: "M6,46 C60,46 100,36 194,20" },
    build: () => {
      const c = single("Jump-diffusion vs Black-Scholes", "euro-option", { cp: "put", K: 80, T: 0.5 });
      c.model = { ...c.model, pricing: "merton-jump" };
      c.compareModel = { ...c.model, pricing: "black-scholes" };
      return [c];
    },
  },
  {
    id: "heston-value", label: "Price under stochastic volatility", category: "Models", tier: "advanced",
    blurb: "Heston by Monte Carlo, with the progress bar", learnId: "vol-heston",
    spark: { d: "M6,50 C50,42 90,30 130,22 C160,16 180,12 194,10", colorVar: "--pl-vega" },
    build: () => {
      const c = single("Call under Heston", "euro-option", { cp: "call", K: 100, T: 1 });
      c.model = { ...c.model, vol: { kind: "heston", kappa: 2, thetaV: 0.04, xi: 0.5, rhoSV: -0.7 } };
      return [c];
    },
  },
  // -------------------------------------------------------------- Exotics
  {
    id: "digital-vs-vanilla", label: "Digital vs vanilla call", category: "Exotics", tier: "advanced",
    blurb: "A payoff step instead of a kink", learnId: "concept-digital",
    spark: { d: "M6,46 L120,46 L120,16 L194,16", colorVar: "--pl-payoff" },
    build: () => {
      const c1 = single("Digital call", "digital-cash", { cp: "call", K: 100, T: 1, payout: 10 }, { greeks: ["gamma"] });
      const c2 = single("Vanilla call", "euro-option", { cp: "call", K: 100, T: 1 }, { greeks: ["gamma"] });
      return [c1, c2];
    },
  },
  {
    id: "knock-out-barrier", label: "Knock-out barrier", category: "Exotics", tier: "advanced",
    blurb: "A vanilla that dies if S touches the barrier", learnId: "inst-barrier",
    spark: { d: "M6,46 L80,46 L150,14 L150,46 L194,46", colorVar: "--pl-payoff" },
    build: () => [single("Up-and-out call", "barrier", { cp: "call", dir: "up-out", K: 100, H: 120, T: 1, rebate: 0 }, { greeks: ["delta"] })],
  },
  {
    id: "asian-averaging", label: "Averaging tames volatility", category: "Exotics", tier: "advanced",
    blurb: "Why an Asian option is cheaper than a vanilla", learnId: "inst-asian",
    spark: { d: "M6,44 C70,42 130,26 194,14", colorVar: "--pl-value", d2: "M6,46 C70,44 130,32 194,22" },
    build: () => {
      const c1 = single("Arithmetic Asian call", "asian-arithmetic", { cp: "call", K: 100, T: 1 });
      const c2 = single("Vanilla call (same terms)", "euro-option", { cp: "call", K: 100, T: 1 });
      return [c1, c2];
    },
  },
  {
    id: "lookback-hindsight", label: "Buying hindsight", category: "Exotics", tier: "advanced",
    blurb: "The lookback pays the best price the path offered", learnId: "inst-lookback",
    spark: { d: "M6,40 C50,44 90,20 130,28 C160,32 180,14 194,12", colorVar: "--pl-value" },
    build: () => [single("Floating-strike lookback call", "lookback-float", { cp: "call", T: 1 })],
  },
  // --------------------------------------------------- Rates & volatility
  {
    id: "swap-duration", label: "A swap's value against rates", category: "Rates & volatility", tier: "advanced",
    blurb: "Duration made visible: the par rate is the zero crossing", learnId: "inst-swap",
    spark: { d: "M6,10 C70,22 130,38 194,54", colorVar: "--pl-rho" },
    build: () => [single("Payer swap against r", "swap", { notional: 100, K: 0.05, tenor: 5, freq: 0.5 }, { xVar: "r", greeks: [] })],
  },
  {
    id: "cap-insurance", label: "A cap is rate insurance", category: "Rates & volatility", tier: "advanced",
    blurb: "A strip of call options on future fixings", learnId: "inst-capfloor",
    spark: { d: "M6,50 C70,48 120,34 194,12", colorVar: "--pl-rho" },
    build: () => [single("Interest-rate cap against r", "cap-floor", { kind: "cap", notional: 100, K: 0.05, tenor: 3, freq: 0.5, sigmaBlack: 0.25 }, { xVar: "r" })],
  },
  {
    id: "variance-swap-vega", label: "Trading volatility itself", category: "Rates & volatility", tier: "advanced",
    blurb: "The variance swap: pure vega, no delta", learnId: "inst-varswap",
    spark: { d: "M6,32 L194,32", colorVar: "--pl-vega", d2: "M6,52 C70,44 130,26 194,12" },
    build: () => [single("Variance swap value against time", "variance-swap", { notional: 100, Kvol: 0.2, T: 1 }, { xVar: "t" })],
  },
];
