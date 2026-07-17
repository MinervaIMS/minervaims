// PayoffLab — line-colour semantics. Each Greek keeps ONE hue everywhere in
// the app (muscle memory), drawn from the colour-blind-safe Okabe–Ito set;
// derivative Greeks share their parent's hue and differ by dash pattern, so
// colour is never the only signal. Actual values resolve from CSS custom
// properties (set in payofflab.css for light and dark), read at render time.

import type { DashPattern, GreekName, LineStyle } from "./types";

/** CSS variable per line id; resolved with getComputedStyle at draw time. */
export const LINE_COLOR_VARS: Record<string, string> = {
  payoff: "--pl-payoff",
  value: "--pl-value",
  compare: "--pl-compare",
  delta: "--pl-delta",
  gamma: "--pl-gamma",
  theta: "--pl-theta",
  vega: "--pl-vega",
  rho: "--pl-rho",
  vanna: "--pl-vega",   // ∂Δ/∂σ: vega family
  vomma: "--pl-vega",   // ∂ν/∂σ: vega family
  charm: "--pl-delta",  // ∂Δ/∂t: delta family
  speed: "--pl-gamma",  // ∂Γ/∂S: gamma family
  colour: "--pl-gamma", // ∂Γ/∂t: gamma family
};

const DEFAULT_DASH: Record<string, DashPattern> = {
  payoff: "solid",
  value: "solid",
  compare: "dashed",
  delta: "solid",
  gamma: "solid",
  theta: "solid",
  vega: "solid",
  rho: "solid",
  vanna: "dashed",
  vomma: "dotted",
  charm: "dashed",
  speed: "dashed",
  colour: "dotted",
};

export function defaultStyle(lineId: string): LineStyle {
  return {
    color: lineId in LINE_COLOR_VARS ? lineId : "payoff",
    dash: DEFAULT_DASH[lineId] ?? "solid",
    width: lineId === "payoff" ? 3 : 2,
  };
}

/** Curated user-selectable palette (ids -> CSS vars), colour-blind safe. */
export const USER_PALETTE: Array<{ id: string; varName: string; label: string }> = [
  { id: "navy", varName: "--pl-payoff", label: "Navy" },
  { id: "violet", varName: "--pl-value", label: "Violet" },
  { id: "blue", varName: "--pl-delta", label: "Blue" },
  { id: "amber", varName: "--pl-gamma", label: "Amber" },
  { id: "green", varName: "--pl-vega", label: "Green" },
  { id: "pink", varName: "--pl-theta", label: "Pink" },
  { id: "sky", varName: "--pl-rho", label: "Sky" },
  { id: "vermillion", varName: "--pl-neg-strong", label: "Vermillion" },
];

export function colorVarFor(styleColor: string): string {
  const pal = USER_PALETTE.find((p) => p.id === styleColor);
  if (pal) return pal.varName;
  return LINE_COLOR_VARS[styleColor] ?? "--pl-payoff";
}

/** Resolve a CSS variable to a concrete colour string on an element. */
export function resolveCssColor(el: HTMLElement, varName: string): string {
  const raw = getComputedStyle(el).getPropertyValue(varName).trim();
  return raw || "#1F0F4D";
}

export function dashArray(dash: DashPattern, width: number): number[] {
  switch (dash) {
    case "dashed": return [6 * width, 4 * width];
    case "dashdot": return [6 * width, 3 * width, 1.5 * width, 3 * width];
    case "dotted": return [1.5 * width, 3 * width];
    default: return [];
  }
}

export function greekFamilyNote(g: GreekName): string | null {
  if (g === "charm") return "delta family (dashed)";
  if (g === "speed") return "gamma family (dashed)";
  if (g === "colour") return "gamma family (dotted)";
  if (g === "vanna") return "vega family (dashed)";
  if (g === "vomma") return "vega family (dotted)";
  return null;
}
