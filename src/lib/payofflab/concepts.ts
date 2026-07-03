// PayoffLab — guided "Concepts" presets (§10): one click loads a configured
// chart plus a Learn walkthrough. Prominent on the empty state.

import type { ChartState, Level } from "./types";
import { emptyChart, freshId } from "./types";
import { STRATEGY_PRESETS } from "./catalog";

export interface Concept {
  id: string;
  label: string;
  category: "Strategy" | "Greeks" | "Hedging" | "Models" | "Exotics";
  tier: Level;
  blurb: string;
  /** Learn-drawer entry opened alongside the chart. */
  learnId: string;
  /** Mini-sparkline path (200×64 viewBox) for the concept card. */
  spark: { d: string; colorVar: string; d2?: string };
  build: () => ChartState[];
}

function withLegs(chart: ChartState, presetId: string): ChartState {
  const preset = STRATEGY_PRESETS.find((p) => p.id === presetId);
  if (!preset) return chart;
  chart.legs = preset.build(chart.market.S).map((l) => ({ ...l, id: freshId("l") }));
  chart.title = preset.label;
  return chart;
}

export const CONCEPTS: Concept[] = [
  {
    id: "bull-call-spread",
    label: "Build a bull call spread",
    category: "Strategy",
    tier: "basic",
    blurb: "Capped upside, defined risk",
    learnId: "concept-bull-call-spread",
    spark: { d: "M6,46 L88,46 L150,16 L194,16", colorVar: "--pl-payoff" },
    build: () => {
      const c = withLegs(emptyChart(), "bull-call-spread");
      c.greeks = ["delta"];
      return [c];
    },
  },
  {
    id: "long-straddle",
    label: "Long straddle",
    category: "Strategy",
    tier: "basic",
    blurb: "Betting on volatility itself",
    learnId: "concept-straddle",
    spark: { d: "M6,14 L100,46 L194,14", colorVar: "--pl-payoff" },
    build: () => {
      const c = withLegs(emptyChart(), "straddle");
      c.greeks = ["vega"];
      return [c];
    },
  },
  {
    id: "gamma-near-expiry",
    label: "Watch gamma explode near expiry",
    category: "Greeks",
    tier: "pro",
    blurb: "Why gamma spikes at the strike",
    learnId: "concept-gamma-expiry",
    spark: { d: "M6,40 C70,40 80,10 100,10 C120,10 130,40 194,40", colorVar: "--pl-gamma" },
    build: () => {
      const c = emptyChart("Gamma toward expiry");
      c.legs = [{ id: freshId("l"), instrument: "euro-option", side: 1, qty: 1, params: { cp: "call", K: 100, T: 1 } }];
      c.xVar = "t";
      c.showPayoff = false;
      c.greeks = ["gamma", "vega"];
      c.signShading = false;
      return [c];
    },
  },
  {
    id: "delta-hedge-short-call",
    label: "Delta-hedge a short call",
    category: "Hedging",
    tier: "advanced",
    blurb: "Re-hedging & residual P/L",
    learnId: "concept-delta-hedge",
    spark: { d: "M6,50 C70,20 130,20 194,50", colorVar: "--pl-delta" },
    build: () => {
      const c = emptyChart("Short call — to be hedged");
      c.legs = [{ id: freshId("l"), instrument: "euro-option", side: -1, qty: 1, params: { cp: "call", K: 100, T: 1 } }];
      c.greeks = ["delta"];
      return [c];
    },
  },
  {
    id: "bachelier-vs-bs",
    label: "Bachelier vs Black–Scholes",
    category: "Models",
    tier: "advanced",
    blurb: "When the model choice matters",
    learnId: "concept-bachelier",
    spark: { d: "M6,44 C90,44 120,20 194,14", colorVar: "--pl-value", d2: "M6,42 C90,42 120,26 194,20" },
    build: () => {
      const c = emptyChart("Bachelier vs Black–Scholes");
      c.legs = [{ id: freshId("l"), instrument: "euro-option", side: 1, qty: 1, params: { cp: "call", K: 100, T: 1 } }];
      c.showPayoff = true;
      c.compareModel = { ...c.model, pricing: "bachelier" };
      return [c];
    },
  },
  {
    id: "digital-vs-vanilla",
    label: "Digital vs vanilla call",
    category: "Exotics",
    tier: "advanced",
    blurb: "The knock-on payoff step",
    learnId: "concept-digital",
    spark: { d: "M6,46 L120,46 L120,16 L194,16", colorVar: "--pl-payoff" },
    build: () => {
      const c1 = emptyChart("Digital call");
      c1.legs = [{ id: freshId("l"), instrument: "digital-cash", side: 1, qty: 1, params: { cp: "call", K: 100, T: 1, payout: 10 } }];
      c1.greeks = ["gamma"];
      const c2 = emptyChart("Vanilla call");
      c2.legs = [{ id: freshId("l"), instrument: "euro-option", side: 1, qty: 1, params: { cp: "call", K: 100, T: 1 } }];
      c2.greeks = ["gamma"];
      return [c1, c2];
    },
  },
  {
    id: "knock-out-barrier",
    label: "Knock-out barrier",
    category: "Exotics",
    tier: "advanced",
    blurb: "A vanilla that can die",
    learnId: "inst-barrier",
    spark: { d: "M6,46 L80,46 L150,14 L150,46 L194,46", colorVar: "--pl-payoff" },
    build: () => {
      const c = emptyChart("Up-and-out call");
      c.legs = [{ id: freshId("l"), instrument: "barrier", side: 1, qty: 1, params: { cp: "call", dir: "up-out", K: 100, H: 120, T: 1, rebate: 0 } }];
      c.greeks = ["delta"];
      return [c];
    },
  },
  {
    id: "time-decay",
    label: "Time decay of an ATM option",
    category: "Greeks",
    tier: "basic",
    blurb: "Theta: value bleeding to intrinsic",
    learnId: "concept-time-decay",
    spark: { d: "M6,14 C70,18 140,30 194,52", colorVar: "--pl-theta" },
    build: () => {
      const c = emptyChart("Value vs time");
      c.legs = [{ id: freshId("l"), instrument: "euro-option", side: 1, qty: 1, params: { cp: "call", K: 100, T: 1 } }];
      c.xVar = "t";
      c.greeks = ["theta"];
      return [c];
    },
  },
];
