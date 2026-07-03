// PayoffLab — instrument catalogue: labels, tiers, parameter schemas and
// textbook defaults (§11). Pure metadata — no pricing mathematics here.

import type { GreekName, Leg, Level, XVar } from "./types";
import { freshId } from "./types";

export interface ParamSpec {
  key: string;
  label: string;
  kind: "number" | "select";
  default: number | string;
  min?: number;
  max?: number;
  step?: number;
  /** Display unit hint: "%", "y", "×", "" */
  unit?: string;
  /** Rendered as a percentage in the UI (stored as a decimal). */
  percent?: boolean;
  options?: Array<{ value: string; label: string }>;
  /** Learn-drawer entry id for the ⓘ affordance. */
  info: string;
}

export type InstrumentCategory =
  | "Building blocks" | "Options" | "Digitals" | "FX & cross-asset"
  | "Exotics — closed form" | "Exotics — Monte Carlo" | "Rates & volatility";

export interface InstrumentSpec {
  id: string;
  label: string;
  category: InstrumentCategory;
  tier: Level;                 // minimum level at which it appears
  params: ParamSpec[];
  axes: XVar[];                // supported x-axes
  pathDependent?: boolean;
  usesMc?: boolean;
  /** Whether the pricing-formula selector applies (vanilla family). */
  pricingSelectable?: boolean;
  /** One-line teaching note shown in the add-asset flow. */
  note: string;
  info: string;
}

const cp = (dflt: "call" | "put" = "call"): ParamSpec => ({
  key: "cp", label: "Option type", kind: "select", default: dflt,
  options: [{ value: "call", label: "Call" }, { value: "put", label: "Put" }],
  info: "call-put",
});
const K = (dflt = 100): ParamSpec => ({ key: "K", label: "Strike K", kind: "number", default: dflt, min: 0.0001, step: 1, info: "strike" });
const T = (dflt = 1): ParamSpec => ({ key: "T", label: "Maturity T", kind: "number", default: dflt, min: 0.01, max: 50, step: 0.25, unit: "y", info: "maturity" });
const S2 = (dflt = 100): ParamSpec => ({ key: "S2", label: "Asset 2 spot S₂", kind: "number", default: dflt, min: 0.0001, step: 1, info: "second-asset" });
const sigma2 = (dflt = 0.25): ParamSpec => ({ key: "sigma2", label: "Asset 2 vol σ₂", kind: "number", default: dflt, min: 0.01, max: 3, step: 0.01, percent: true, info: "second-asset" });
const rho = (dflt = 0.5): ParamSpec => ({ key: "rho", label: "Correlation ρ", kind: "number", default: dflt, min: -0.99, max: 0.99, step: 0.05, info: "correlation" });
const q2 = (dflt = 0): ParamSpec => ({ key: "q2", label: "Asset 2 yield q₂", kind: "number", default: dflt, min: 0, max: 0.5, step: 0.005, percent: true, info: "dividend-yield" });
const notional = (dflt = 100): ParamSpec => ({ key: "notional", label: "Notional", kind: "number", default: dflt, min: 0.01, step: 10, info: "notional" });

export const INSTRUMENT_CATALOG: InstrumentSpec[] = [
  // --- building blocks ---
  {
    id: "cash", label: "Cash (money market)", category: "Building blocks", tier: "basic",
    params: [notional()], axes: ["t", "r"],
    note: "A deposit accruing continuously at the short rate r. The simplest time-value building block.",
    info: "inst-cash",
  },
  {
    id: "stock", label: "Stock / underlying asset", category: "Building blocks", tier: "basic",
    params: [], axes: ["S", "t", "r"],
    note: "One unit of the underlying. Its payoff diagram is the 45° line — the reference every option bends.",
    info: "inst-stock",
  },
  {
    id: "forward", label: "Forward", category: "Building blocks", tier: "basic",
    params: [K(), T()], axes: ["S", "t", "r"],
    note: "An obligation to buy at K at maturity. Value now: S·e^(−qτ) − K·e^(−rτ). No optionality, so no curvature.",
    info: "inst-forward",
  },
  {
    id: "future", label: "Future", category: "Building blocks", tier: "basic",
    params: [K(), T()], axes: ["S", "t", "r"],
    note: "Like a forward but settled daily, so its value is the undiscounted gap between the futures price and yours.",
    info: "inst-future",
  },
  // --- vanilla options ---
  {
    id: "euro-option", label: "European option", category: "Options", tier: "basic",
    params: [cp(), K(), T()], axes: ["S", "t", "r"], pricingSelectable: true,
    note: "The right, not the obligation, to trade at K at expiry. The hockey-stick payoff every strategy is built from.",
    info: "inst-euro",
  },
  {
    id: "amer-option", label: "American option", category: "Options", tier: "basic",
    params: [
      cp("put"), K(), T(),
      { key: "divAmount", label: "Discrete dividend", kind: "number", default: 0, min: 0, step: 0.5, info: "discrete-dividend" },
      { key: "divTime", label: "Dividend date", kind: "number", default: 0.5, min: 0.01, max: 50, step: 0.25, unit: "y", info: "discrete-dividend" },
    ],
    axes: ["S", "t", "r"], pricingSelectable: true,
    note: "Exercisable at any time, priced on a lattice. Worth at least its European twin — never less.",
    info: "inst-amer",
  },
  // --- digitals ---
  {
    id: "digital-cash", label: "Digital (cash-or-nothing)", category: "Digitals", tier: "advanced",
    params: [cp(), K(), T(), { key: "payout", label: "Cash payout", kind: "number", default: 10, min: 0.01, step: 1, info: "digital-payout" }],
    axes: ["S", "t", "r"],
    note: "Pays a fixed amount if it finishes in the money — a pure bet on the event, with a discontinuous payoff step.",
    info: "inst-digital-cash",
  },
  {
    id: "digital-asset", label: "Share digital (asset-or-nothing)", category: "Digitals", tier: "advanced",
    params: [cp(), K(), T()], axes: ["S", "t", "r"],
    note: "Delivers the asset itself if in the money. A vanilla call is a share digital minus K cash digitals.",
    info: "inst-digital-asset",
  },
  // --- FX & cross-asset ---
  {
    id: "fx-option", label: "Currency option (Garman–Kohlhagen)", category: "FX & cross-asset", tier: "advanced",
    params: [
      cp(), { ...K(1.1), step: 0.01 }, T(),
      { key: "rf", label: "Foreign rate r_f", kind: "number", default: 0.03, min: -0.05, max: 0.5, step: 0.0025, percent: true, info: "foreign-rate" },
    ],
    axes: ["S", "t", "r"],
    note: "An option on an exchange rate: the foreign interest rate plays the role of a dividend yield. Set S to the FX spot (e.g. 1.10).",
    info: "inst-fx",
  },
  {
    id: "black-option", label: "Option on a future (Black-76)", category: "FX & cross-asset", tier: "advanced",
    params: [cp(), K(), T()], axes: ["S", "t", "r"],
    note: "S is the futures price; carrying cost is zero because a futures position costs nothing to hold.",
    info: "inst-black",
  },
  {
    id: "foreign-equity", label: "Foreign asset struck in domestic", category: "FX & cross-asset", tier: "advanced",
    params: [
      cp(), K(110), T(),
      { key: "X", label: "FX spot X", kind: "number", default: 1.1, min: 0.0001, step: 0.01, info: "fx-spot" },
      { key: "sigmaX", label: "FX vol σ_X", kind: "number", default: 0.1, min: 0.001, max: 2, step: 0.01, percent: true, info: "fx-vol" },
      { key: "rhoX", label: "Corr(S, X) ρ", kind: "number", default: 0.3, min: -0.99, max: 0.99, step: 0.05, info: "correlation" },
    ],
    axes: ["S", "t", "r"],
    note: "You are paid in domestic currency on a foreign stock: the composite asset X·S is what is really optioned.",
    info: "inst-foreign-equity",
  },
  {
    id: "quanto", label: "Quanto option", category: "FX & cross-asset", tier: "advanced",
    params: [
      cp(), K(), T(),
      { key: "rf", label: "Foreign rate r_f", kind: "number", default: 0.03, min: -0.05, max: 0.5, step: 0.0025, percent: true, info: "foreign-rate" },
      { key: "sigmaX", label: "FX vol σ_X", kind: "number", default: 0.1, min: 0.001, max: 2, step: 0.01, percent: true, info: "fx-vol" },
      { key: "rhoX", label: "Corr(S, X) ρ", kind: "number", default: 0.3, min: -0.99, max: 0.99, step: 0.05, info: "correlation" },
      { key: "Xbar", label: "Fixed FX rate X̄", kind: "number", default: 1, min: 0.0001, step: 0.01, info: "fx-spot" },
    ],
    axes: ["S", "t", "r"],
    note: "The FX rate is frozen at X̄, so currency risk is removed — at the price of a drift correction −ρσ_Sσ_X.",
    info: "inst-quanto",
  },
  {
    id: "exchange", label: "Exchange option (Margrabe)", category: "FX & cross-asset", tier: "advanced",
    params: [S2(100), sigma2(), rho(), q2(), T()], axes: ["S", "t", "r"],
    note: "The right to swap asset 2 for asset 1. No strike — the second asset IS the strike.",
    info: "inst-exchange",
  },
  {
    id: "deferred-exchange", label: "Deferred exchange option", category: "FX & cross-asset", tier: "advanced",
    params: [S2(100), sigma2(), rho(), q2(), T(),
      { key: "Tpay", label: "Settlement date", kind: "number", default: 1.5, min: 0.01, max: 50, step: 0.25, unit: "y", info: "maturity" }],
    axes: ["S", "t", "r"],
    note: "The exchange is decided at T but settled later — with deterministic rates, an extra discount factor.",
    info: "inst-exchange",
  },
  {
    id: "forward-start", label: "Forward-start option", category: "FX & cross-asset", tier: "advanced",
    params: [cp(),
      { key: "alpha", label: "Strike ratio α", kind: "number", default: 1, min: 0.1, max: 3, step: 0.05, unit: "×", info: "forward-start-alpha" },
      { key: "tStart", label: "Strike-set date", kind: "number", default: 0.25, min: 0.01, max: 50, step: 0.25, unit: "y", info: "forward-start-alpha" },
      T()],
    axes: ["S", "t", "r"],
    note: "The strike is fixed later, at α times the then-spot. The building block of cliquets.",
    info: "inst-forward-start",
  },
  // --- exotics, closed form ---
  {
    id: "barrier", label: "Barrier option", category: "Exotics — closed form", tier: "advanced",
    params: [cp(),
      { key: "dir", label: "Barrier type", kind: "select", default: "up-out",
        options: [
          { value: "down-out", label: "Down-and-out" }, { value: "down-in", label: "Down-and-in" },
          { value: "up-out", label: "Up-and-out" }, { value: "up-in", label: "Up-and-in" },
        ], info: "barrier-direction" },
      K(),
      { key: "H", label: "Barrier H", kind: "number", default: 120, min: 0.0001, step: 1, info: "barrier-level" },
      T(),
      { key: "rebate", label: "Rebate", kind: "number", default: 0, min: 0, step: 0.5, info: "barrier-rebate" }],
    axes: ["S", "t", "r"],
    note: "A vanilla that switches on (in) or off (out) if S touches H. Knock-in plus knock-out equals the vanilla.",
    info: "inst-barrier",
  },
  {
    id: "lookback-float", label: "Lookback (floating strike)", category: "Exotics — closed form", tier: "advanced",
    params: [cp(), T()], axes: ["S", "t", "r"], pathDependent: true,
    note: "Buy at the minimum, sell at the maximum — the strike is the best price the path ever offered.",
    info: "inst-lookback",
  },
  {
    id: "lookback-fixed", label: "Lookback (fixed strike)", category: "Exotics — closed form", tier: "advanced",
    params: [cp(), K(), T()], axes: ["S", "t", "r"], pathDependent: true,
    note: "A vanilla whose settlement uses the extreme of the path rather than the terminal price.",
    info: "inst-lookback",
  },
  {
    id: "compound", label: "Compound option (Geske)", category: "Exotics — closed form", tier: "advanced",
    params: [
      { key: "kind", label: "Structure", kind: "select", default: "call-on-call",
        options: [
          { value: "call-on-call", label: "Call on call" }, { value: "put-on-call", label: "Put on call" },
          { value: "call-on-put", label: "Call on put" }, { value: "put-on-put", label: "Put on put" },
        ], info: "compound-structure" },
      { key: "K1", label: "Compound strike K₁", kind: "number", default: 5, min: 0.0001, step: 0.5, info: "strike" },
      { key: "t1", label: "Decision date t₁", kind: "number", default: 0.5, min: 0.01, max: 50, step: 0.25, unit: "y", info: "maturity" },
      { key: "K2", label: "Underlying strike K₂", kind: "number", default: 100, min: 0.0001, step: 1, info: "strike" },
      T(1)],
    axes: ["S", "t", "r"],
    note: "An option on an option — priced with the bivariate normal because two exercise events must both go right.",
    info: "inst-compound",
  },
  {
    id: "chooser", label: "Chooser option", category: "Exotics — closed form", tier: "advanced",
    params: [K(),
      { key: "tChoose", label: "Choice date", kind: "number", default: 0.25, min: 0.01, max: 50, step: 0.25, unit: "y", info: "maturity" },
      T()],
    axes: ["S", "t", "r"],
    note: "Pick call or put later, once you have seen where S went. Cheaper than the straddle it approximates.",
    info: "inst-chooser",
  },
  {
    id: "rainbow", label: "Option on max / min of two assets", category: "Exotics — closed form", tier: "advanced",
    params: [
      { key: "kind", label: "Payoff", kind: "select", default: "call-max",
        options: [
          { value: "call-max", label: "Call on max" }, { value: "call-min", label: "Call on min" },
          { value: "put-max", label: "Put on max" }, { value: "put-min", label: "Put on min" },
        ], info: "rainbow-kind" },
      K(), S2(100), sigma2(), rho(), q2(), T()],
    axes: ["S", "t", "r"],
    note: "Stulz's two-colour rainbow: the payoff picks the better (or worse) of two assets before comparing with K.",
    info: "inst-rainbow",
  },
  {
    id: "asian-geometric", label: "Asian (geometric average)", category: "Exotics — closed form", tier: "advanced",
    params: [cp(), K(), T()], axes: ["S", "t", "r"], pathDependent: true,
    note: "Averages tame volatility: the geometric average of lognormals stays lognormal, so a closed form survives.",
    info: "inst-asian",
  },
  {
    id: "product-option", label: "Product option", category: "Exotics — closed form", tier: "advanced",
    params: [cp(), K(),
      { key: "S2", label: "Asset 2 spot S₂", kind: "number", default: 1, min: 0.0001, step: 0.1, info: "second-asset" },
      sigma2(), rho(), q2(), T()],
    axes: ["S", "t", "r"],
    note: "Pays on S₁·S₂ — a product of lognormals is lognormal, so Black's formula applies exactly.",
    info: "inst-product",
  },
  // --- exotics, Monte Carlo ---
  {
    id: "asian-arithmetic", label: "Asian (arithmetic average)", category: "Exotics — Monte Carlo", tier: "advanced",
    params: [cp(), K(), T()], axes: ["S", "t", "r"], pathDependent: true, usesMc: true,
    note: "The market-standard Asian. No closed form exists; priced by Monte Carlo with a geometric control variate.",
    info: "inst-asian",
  },
  {
    id: "basket", label: "Basket option", category: "Exotics — Monte Carlo", tier: "advanced",
    params: [cp(), K(), S2(100), sigma2(), rho(), q2(),
      { key: "w1", label: "Weight w₁", kind: "number", default: 0.5, min: 0, max: 1, step: 0.05, info: "basket-weights" },
      { key: "w2", label: "Weight w₂", kind: "number", default: 0.5, min: 0, max: 1, step: 0.05, info: "basket-weights" },
      T()],
    axes: ["S", "t", "r"], usesMc: true,
    note: "An option on a weighted sum of assets. Sums of lognormals are not lognormal — hence Monte Carlo.",
    info: "inst-basket",
  },
  {
    id: "spread-option", label: "Spread option", category: "Exotics — Monte Carlo", tier: "advanced",
    params: [cp(), { ...K(5), label: "Strike K", default: 5 },
      { key: "S2", label: "Asset 2 spot S₂", kind: "number", default: 95, min: 0.0001, step: 1, info: "second-asset" },
      sigma2(0.25), rho(), q2(),
      { key: "method", label: "Method", kind: "select", default: "kirk",
        options: [{ value: "kirk", label: "Kirk (fast approximation)" }, { value: "mc", label: "Monte Carlo (exact)" }],
        info: "spread-method" },
      T()],
    axes: ["S", "t", "r"], usesMc: true,
    note: "Pays on S₁ − S₂ − K. Kirk's approximation is fast; switch to Monte Carlo for the exact answer.",
    info: "inst-spread",
  },
  // --- rates & volatility ---
  {
    id: "variance-swap", label: "Variance swap", category: "Rates & volatility", tier: "advanced",
    params: [notional(),
      { key: "Kvol", label: "Strike (vol terms)", kind: "number", default: 0.2, min: 0.01, max: 2, step: 0.01, percent: true, info: "variance-strike" },
      T()],
    axes: ["t", "r"], pathDependent: true,
    note: "Pure exposure to realised variance — the cleanest way to trade volatility itself. Pair with the vega overlay.",
    info: "inst-varswap",
  },
  {
    id: "vol-swap", label: "Volatility swap", category: "Rates & volatility", tier: "advanced",
    params: [notional(),
      { key: "Kvol", label: "Strike K_vol", kind: "number", default: 0.2, min: 0.01, max: 2, step: 0.01, percent: true, info: "variance-strike" },
      T()],
    axes: ["t", "r"], pathDependent: true,
    note: "Pays on realised vol, not variance — the square root brings a concavity (convexity) correction.",
    info: "inst-varswap",
  },
  {
    id: "fra", label: "Forward rate agreement", category: "Rates & volatility", tier: "advanced",
    params: [notional(),
      { key: "K", label: "Fixed rate K", kind: "number", default: 0.05, min: -0.05, max: 0.5, step: 0.0025, percent: true, info: "fixed-rate" },
      { key: "T1", label: "Start T₁", kind: "number", default: 0.5, min: 0.01, max: 50, step: 0.25, unit: "y", info: "maturity" },
      { key: "T2", label: "End T₂", kind: "number", default: 1, min: 0.02, max: 50, step: 0.25, unit: "y", info: "maturity" }],
    axes: ["t", "r"],
    note: "Lock a borrowing rate today for a future period. Value is linear in the forward rate — plot it against r.",
    info: "inst-fra",
  },
  {
    id: "swap", label: "Interest-rate swap (payer)", category: "Rates & volatility", tier: "advanced",
    params: [notional(),
      { key: "K", label: "Fixed rate K", kind: "number", default: 0.05, min: -0.05, max: 0.5, step: 0.0025, percent: true, info: "fixed-rate" },
      { key: "tenor", label: "Tenor", kind: "number", default: 5, min: 0.5, max: 50, step: 0.5, unit: "y", info: "tenor" },
      { key: "freq", label: "Payment interval", kind: "number", default: 0.5, min: 0.25, max: 1, step: 0.25, unit: "y", info: "tenor" }],
    axes: ["t", "r"],
    note: "Pay fixed, receive floating. Its value against r is the cleanest picture of duration you will ever see.",
    info: "inst-swap",
  },
  {
    id: "cap-floor", label: "Cap / floor", category: "Rates & volatility", tier: "advanced",
    params: [
      { key: "kind", label: "Type", kind: "select", default: "cap",
        options: [{ value: "cap", label: "Cap" }, { value: "floor", label: "Floor" }], info: "inst-capfloor" },
      notional(),
      { key: "K", label: "Strike rate K", kind: "number", default: 0.05, min: -0.05, max: 0.5, step: 0.0025, percent: true, info: "fixed-rate" },
      { key: "tenor", label: "Tenor", kind: "number", default: 3, min: 0.5, max: 50, step: 0.5, unit: "y", info: "tenor" },
      { key: "freq", label: "Reset interval", kind: "number", default: 0.5, min: 0.25, max: 1, step: 0.25, unit: "y", info: "tenor" },
      { key: "sigmaBlack", label: "Black vol σ", kind: "number", default: 0.25, min: 0.01, max: 3, step: 0.01, percent: true, info: "black-vol" }],
    axes: ["t", "r"],
    note: "A strip of options on future floating rates — insurance against rates rising (cap) or falling (floor).",
    info: "inst-capfloor",
  },
  {
    id: "swaption", label: "Swaption", category: "Rates & volatility", tier: "advanced",
    params: [
      { key: "kind", label: "Type", kind: "select", default: "payer",
        options: [{ value: "payer", label: "Payer" }, { value: "receiver", label: "Receiver" }], info: "inst-swaption" },
      notional(),
      { key: "K", label: "Strike rate K", kind: "number", default: 0.05, min: -0.05, max: 0.5, step: 0.0025, percent: true, info: "fixed-rate" },
      { key: "expiry", label: "Option expiry", kind: "number", default: 1, min: 0.05, max: 30, step: 0.25, unit: "y", info: "maturity" },
      { key: "tenor", label: "Swap tenor", kind: "number", default: 5, min: 0.5, max: 50, step: 0.5, unit: "y", info: "tenor" },
      { key: "freq", label: "Payment interval", kind: "number", default: 0.5, min: 0.25, max: 1, step: 0.25, unit: "y", info: "tenor" },
      { key: "sigmaBlack", label: "Black vol σ", kind: "number", default: 0.25, min: 0.01, max: 3, step: 0.01, percent: true, info: "black-vol" }],
    axes: ["t", "r"],
    note: "An option to enter a swap — Black's formula on the forward swap rate, weighted by the annuity.",
    info: "inst-swaption",
  },
  {
    id: "trs", label: "Total return swap (equity)", category: "Rates & volatility", tier: "advanced",
    params: [notional(),
      { key: "K", label: "Fixed rate K", kind: "number", default: 0.05, min: -0.05, max: 0.5, step: 0.0025, percent: true, info: "fixed-rate" },
      { key: "S0", label: "Reference price S₀", kind: "number", default: 100, min: 0.0001, step: 1, info: "strike" },
      { key: "tenor", label: "Tenor", kind: "number", default: 1, min: 0.25, max: 30, step: 0.25, unit: "y", info: "tenor" },
      { key: "freq", label: "Payment interval", kind: "number", default: 0.5, min: 0.25, max: 1, step: 0.25, unit: "y", info: "tenor" }],
    axes: ["S", "t", "r"],
    note: "Receive the equity's total return, pay a fixed rate — equity exposure without owning the shares.",
    info: "inst-trs",
  },
];

export const INSTRUMENTS_BY_ID: Record<string, InstrumentSpec> = Object.fromEntries(
  INSTRUMENT_CATALOG.map((s) => [s.id, s]),
);

export function defaultLegFor(spec: InstrumentSpec, side: 1 | -1 = 1): Leg {
  const params: Record<string, number | string> = {};
  for (const p of spec.params) params[p.key] = p.default;
  return { id: freshId("l"), instrument: spec.id, side, qty: 1, params };
}

export function legLabel(leg: Leg): string {
  const spec = INSTRUMENTS_BY_ID[leg.instrument];
  const side = leg.side === 1 ? "Long" : "Short";
  const bits: string[] = [];
  if (typeof leg.params.cp === "string") bits.push(leg.params.cp === "put" ? "put" : "call");
  if (typeof leg.params.K === "number") bits.push(`K ${leg.params.K}`);
  const base = spec ? spec.label.split(" (")[0] : leg.instrument;
  const qty = leg.qty !== 1 ? ` ×${leg.qty}` : "";
  return `${side} ${bits.length ? `${base.toLowerCase()} · ${bits.join(" · ")}` : base.toLowerCase()}${qty}`;
}

// ---------------------------------------------------------------------------
// Strategy presets (one-click multi-leg templates).
// ---------------------------------------------------------------------------

export interface StrategyPreset {
  id: string;
  label: string;
  tier: Level;
  description: string;
  build: (S: number) => Array<Pick<Leg, "instrument" | "side" | "qty" | "params">>;
}

const euro = (cpv: "call" | "put", side: 1 | -1, K: number, T = 1, qty = 1) => ({
  instrument: "euro-option", side, qty, params: { cp: cpv, K, T },
});

export const STRATEGY_PRESETS: StrategyPreset[] = [
  { id: "bull-call-spread", label: "Bull call spread", tier: "basic", description: "Long call at K, short call above — capped upside for a lower premium.", build: (S) => [euro("call", 1, S), euro("call", -1, Math.round(S * 1.2))] },
  { id: "bear-put-spread", label: "Bear put spread", tier: "basic", description: "Long put at K, short put below — a defined-risk bearish view.", build: (S) => [euro("put", 1, S), euro("put", -1, Math.round(S * 0.8))] },
  { id: "straddle", label: "Long straddle", tier: "basic", description: "Call plus put at the same strike — long volatility, direction-agnostic.", build: (S) => [euro("call", 1, S), euro("put", 1, S)] },
  { id: "strangle", label: "Long strangle", tier: "basic", description: "Out-of-the-money call and put — cheaper than the straddle, needs a bigger move.", build: (S) => [euro("call", 1, Math.round(S * 1.1)), euro("put", 1, Math.round(S * 0.9))] },
  { id: "butterfly", label: "Butterfly", tier: "basic", description: "Long wings, short double body — a bet that S pins the middle strike.", build: (S) => [euro("call", 1, Math.round(S * 0.9)), euro("call", -1, S, 1, 2), euro("call", 1, Math.round(S * 1.1))] },
  { id: "condor", label: "Iron-wing condor", tier: "basic", description: "A butterfly with the body split — profits across a range instead of a point.", build: (S) => [euro("call", 1, Math.round(S * 0.85)), euro("call", -1, Math.round(S * 0.95)), euro("call", -1, Math.round(S * 1.05)), euro("call", 1, Math.round(S * 1.15))] },
  { id: "collar", label: "Collar", tier: "basic", description: "Stock plus protective put, financed by a covered call.", build: (S) => [{ instrument: "stock", side: 1 as const, qty: 1, params: {} }, euro("put", 1, Math.round(S * 0.9)), euro("call", -1, Math.round(S * 1.1))] },
  { id: "risk-reversal", label: "Risk reversal", tier: "basic", description: "Short put funds a long call — synthetic long exposure, skew in one picture.", build: (S) => [euro("call", 1, Math.round(S * 1.05)), euro("put", -1, Math.round(S * 0.95))] },
  { id: "covered-call", label: "Covered call", tier: "basic", description: "Own the stock, sell the upside — income at the cost of the rally.", build: (S) => [{ instrument: "stock", side: 1 as const, qty: 1, params: {} }, euro("call", -1, Math.round(S * 1.1))] },
  { id: "protective-put", label: "Protective put", tier: "basic", description: "Own the stock, own the floor — insurance priced in vega.", build: (S) => [{ instrument: "stock", side: 1 as const, qty: 1, params: {} }, euro("put", 1, S)] },
  { id: "calendar", label: "Calendar spread", tier: "basic", description: "Short the near expiry, long the far one — trading the term structure of time value.", build: (S) => [euro("call", -1, S, 0.5), euro("call", 1, S, 1)] },
];

// ---------------------------------------------------------------------------
// Greek metadata (colour families & availability per level).
// ---------------------------------------------------------------------------

export const GREEK_META: Record<GreekName, { label: string; symbol: string; tier: Level; info: string }> = {
  delta: { label: "Delta", symbol: "Δ", tier: "basic", info: "greek-delta" },
  gamma: { label: "Gamma", symbol: "Γ", tier: "basic", info: "greek-gamma" },
  theta: { label: "Theta", symbol: "Θ", tier: "advanced", info: "greek-theta" },
  vega: { label: "Vega", symbol: "ν", tier: "advanced", info: "greek-vega" },
  rho: { label: "Rho", symbol: "ρ", tier: "advanced", info: "greek-rho" },
  vanna: { label: "Vanna", symbol: "∂Δ/∂σ", tier: "pro", info: "greek-vanna" },
  vomma: { label: "Vomma", symbol: "∂ν/∂σ", tier: "pro", info: "greek-vomma" },
  charm: { label: "Charm", symbol: "∂Δ/∂t", tier: "pro", info: "greek-charm" },
  speed: { label: "Speed", symbol: "∂Γ/∂S", tier: "pro", info: "greek-speed" },
  colour: { label: "Colour", symbol: "∂Γ/∂t", tier: "pro", info: "greek-colour" },
};

export const LEVEL_ORDER: Record<Level, number> = { basic: 0, advanced: 1, pro: 2 };

export function availableAtLevel<T extends { tier: Level }>(items: T[], level: Level): T[] {
  return items.filter((i) => LEVEL_ORDER[i.tier] <= LEVEL_ORDER[level]);
}
