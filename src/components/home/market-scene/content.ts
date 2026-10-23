// =====================================================================
// What the homepage scene shows, kept apart from how it is drawn.
// ---------------------------------------------------------------------
// THE FUND LINE IS REAL: see fund-series.ts, which reads the funds'
// published monthly returns. EVERYTHING ELSE HERE IS ILLUSTRATIVE. No
// other figure is market data, and nothing in this file is fetched: the
// scene must never wait on the network, and a background quoting live
// numbers would be a claim the page has to keep true.
//
// It is illustrative in the way a textbook example is, though, not in the
// way filler text is. The DCF below is COMPUTED from its assumptions, so
// its free cash flows, discount factors, terminal value and implied price
// all tie out; somebody from Equity Research pausing on it will find a
// model, not a picture of one. The formulas are the real ones, typeset
// properly.
//
// The spread follows the divisions: derivatives pricing and portfolio
// maths for Investment Research and Portfolio Management, statistics and
// machine learning for Quantitative Research, the macro monitor and
// policy rules for Macro Research, and the DCF for Equity Research.
// =====================================================================

/**
 * `1,345.4`: one decimal and a thousands comma, as the tables print.
 *
 * By hand rather than with `toLocaleString`, which builds a formatter on
 * every call and initialises the locale data on the first: tens of
 * milliseconds on a slow phone, for a table of sixty numbers.
 */
export function oneDecimal(v: number) {
  const [whole, frac] = Math.abs(v).toFixed(1).split('.');
  return `${v < 0 ? '-' : ''}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${frac}`;
}

/** Small, fast, seedable PRNG (mulberry32), so every cycle is reproducible. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal draw (Box-Muller) from a uniform source. */
export function gauss(r: () => number) {
  const u = Math.max(r(), 1e-9);
  const v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ---------------------------------------------------------------------
// Formulas, in a small subset of TeX (see typeset.ts).
// ---------------------------------------------------------------------

export type FormulaTopic = 'derivatives' | 'statistics' | 'ml' | 'portfolio' | 'valuation' | 'macro';

export const FORMULAS: Record<FormulaTopic, string[]> = {
  derivatives: [
    'C = S_0 N(d_1) - K e^{-rT} N(d_2)',
    'd_1 = \\frac{\\op{ln}(S_0/K) + (r + σ^2/2)T}{σ\\sqrt{T}}',
    'dS_t = μ S_t\\,dt + σ S_t\\,dW_t',
    '\\frac{∂V}{∂t} + \\frac{1}{2}σ^2 S^2 \\frac{∂^2V}{∂S^2} + rS\\frac{∂V}{∂S} - rV = 0',
    'C - P = S_0 - K e^{-rT}',
    'Γ = \\frac{N′(d_1)}{S_0 σ\\sqrt{T}}',
    'F_0 = S_0\\,e^{(r - q)T}',
  ],
  statistics: [
    '\\hat{β} = (X^{\\op{T}}X)^{-1} X^{\\op{T}} y',
    'P(A | B) = \\frac{P(B | A)\\,P(A)}{P(B)}',
    'f(x) = \\frac{1}{σ\\sqrt{2π}}\\,e^{-(x - μ)^2/2σ^2}',
    'R^2 = 1 - \\frac{SS_{\\op{res}}}{SS_{\\op{tot}}}',
    's^2 = \\frac{1}{n - 1} ∑_{i=1}^{n} (x_i - \\bar{x})^2',
  ],
  ml: [
    'θ_{t+1} = θ_t - η ∇_θ L(θ_t)',
    'L = -∑_i y_i\\,\\op{log}\\,\\hat{y}_i',
    'σ(z)_i = \\frac{e^{z_i}}{∑_j e^{z_j}}',
    'h_t = \\op{tanh}(W_h h_{t-1} + W_x x_t + b)',
    '\\op{Attention}(Q, K, V) = \\op{softmax}\\left(\\frac{QK^{\\op{T}}}{\\sqrt{d_k}}\\right)V',
  ],
  portfolio: [
    'E[R_i] = R_f + β_i (E[R_m] - R_f)',
    '\\op{SR} = \\frac{E[R_p - R_f]}{σ_p}',
    'σ_p^2 = w^{\\op{T}} Σ w',
    'α = R_p - [R_f + β(R_m - R_f)]',
  ],
  valuation: [
    '\\op{WACC} = \\frac{E}{V} r_E + \\frac{D}{V} r_D (1 - t)',
    '\\op{TV} = \\frac{\\op{FCF}_{n+1}}{\\op{WACC} - g}',
    '\\op{EV} = ∑_{t=1}^{n} \\frac{\\op{FCF}_t}{(1 + \\op{WACC})^t} + \\frac{\\op{TV}}{(1 + \\op{WACC})^n}',
    '\\op{FCF} = \\op{EBIT}(1 - t) + \\op{D&A} - \\op{Capex} - Δ\\op{NWC}',
  ],
  macro: [
    'i_t = r^{\u2217} + π_t + 0.5(π_t - π^{\u2217}) + 0.5(y_t - \\bar{y}_t)',
    '(1 + i) = (1 + r)(1 + π^e)',
    'Y = C + I + G + (X - M)',
    'MV = PY',
  ],
};

/** Large single symbols for the out-of-focus foreground. */
export const GLYPHS = ['∂', 'σ', 'Σ', 'β', '∇', 'μ', 'Δ', 'π'];

// ---------------------------------------------------------------------
// The DCF: assumptions in, a model out.
// ---------------------------------------------------------------------

const DCF_YEARS = ['2025A', '2026E', '2027E', '2028E', '2029E', '2030E'];
const REVENUE_2025 = 1240;
const GROWTH = [0, 0.085, 0.078, 0.07, 0.062, 0.055];
const MARGIN = [0.214, 0.22, 0.226, 0.231, 0.235, 0.238];
const DA_PCT = 0.042;
const CAPEX_PCT = [0.052, 0.05, 0.049, 0.048, 0.047, 0.046];
const NWC_PCT = 0.12;
const TAX = 0.24;
export const DCF_WACC = 0.084;
export const DCF_G = 0.02;
const NET_DEBT = 420;
const SHARES = 58.5;
const PRICE = 43.4;

export interface DcfRow {
  label: string;
  values: (number | null)[];
  kind: 'money' | 'pct' | 'factor';
  /** Printed stronger: a subtotal the eye should land on. */
  strong?: boolean;
  /** Printed quieter: a ratio beneath the line it qualifies. */
  quiet?: boolean;
}

export interface DcfModel {
  years: string[];
  rows: DcfRow[];
  summary: { label: string; value: string; strong?: boolean }[];
  sensitivity: { waccs: number[]; gs: number[]; grid: number[][] };
}

function dcfValue(ufcf: number[], wacc: number, g: number) {
  let pv = 0;
  for (let i = 1; i < ufcf.length; i += 1) pv += ufcf[i] / (1 + wacc) ** i;
  const n = ufcf.length - 1;
  const tv = (ufcf[n] * (1 + g)) / (wacc - g);
  const pvTv = tv / (1 + wacc) ** n;
  const ev = pv + pvTv;
  return { pv, tv, pvTv, ev, perShare: (ev - NET_DEBT) / SHARES };
}

export function buildDcf(): DcfModel {
  const revenue: number[] = [];
  for (let i = 0; i < DCF_YEARS.length; i += 1) {
    revenue.push(i === 0 ? REVENUE_2025 : revenue[i - 1] * (1 + GROWTH[i]));
  }
  const ebitda = revenue.map((r, i) => r * MARGIN[i]);
  const da = revenue.map((r) => r * DA_PCT);
  const ebit = ebitda.map((e, i) => e - da[i]);
  const taxes = ebit.map((e) => e * TAX);
  const capex = revenue.map((r, i) => r * CAPEX_PCT[i]);
  const dNwc = revenue.map((r, i) => (i === 0 ? 0 : (r - revenue[i - 1]) * NWC_PCT));
  const ufcf = ebit.map((e, i) => e - taxes[i] + da[i] - capex[i] - dNwc[i]);
  const df = revenue.map((_, i) => (i === 0 ? null : 1 / (1 + DCF_WACC) ** i));
  const pvFcf = ufcf.map((f, i) => (i === 0 ? null : f * (df[i] as number)));

  const base = dcfValue(ufcf, DCF_WACC, DCF_G);
  const equity = base.ev - NET_DEBT;
  const upside = base.perShare / PRICE - 1;

  const waccs = [-0.01, -0.005, 0, 0.005, 0.01].map((d) => DCF_WACC + d);
  const gs = [0.01, 0.015, 0.02, 0.025, 0.03];
  const grid = waccs.map((w) => gs.map((g) => dcfValue(ufcf, w, g).perShare));

  const eur = oneDecimal;

  return {
    years: DCF_YEARS,
    rows: [
      { label: 'Revenue', values: revenue, kind: 'money', strong: true },
      { label: 'growth', values: GROWTH.map((g, i) => (i === 0 ? null : g)), kind: 'pct', quiet: true },
      { label: 'EBITDA', values: ebitda, kind: 'money' },
      { label: 'margin', values: MARGIN, kind: 'pct', quiet: true },
      { label: 'D&A', values: da.map((v) => -v), kind: 'money' },
      { label: 'EBIT', values: ebit, kind: 'money' },
      { label: 'Taxes on EBIT', values: taxes.map((v) => -v), kind: 'money' },
      { label: 'Plus D&A', values: da, kind: 'money' },
      { label: 'Capex', values: capex.map((v) => -v), kind: 'money' },
      { label: 'Change in NWC', values: dNwc.map((v, i) => (i === 0 ? null : -v)), kind: 'money' },
      { label: 'Unlevered FCF', values: ufcf, kind: 'money', strong: true },
      { label: 'Discount factor', values: df, kind: 'factor', quiet: true },
      { label: 'PV of FCF', values: pvFcf, kind: 'money' },
    ],
    summary: [
      { label: 'WACC', value: `${(DCF_WACC * 100).toFixed(1)}%` },
      { label: 'Terminal growth', value: `${(DCF_G * 100).toFixed(1)}%` },
      { label: 'Sum of PV of FCF', value: eur(base.pv) },
      { label: 'PV of terminal value', value: eur(base.pvTv) },
      { label: 'Enterprise value', value: eur(base.ev), strong: true },
      { label: 'Net debt', value: `(${eur(NET_DEBT)})` },
      { label: 'Equity value', value: eur(equity), strong: true },
      { label: 'Implied value per share', value: `€${base.perShare.toFixed(2)}`, strong: true },
      { label: 'Upside to €43.40', value: `${(upside * 100).toFixed(1)}%` },
    ],
    sensitivity: { waccs, gs, grid },
  };
}

// ---------------------------------------------------------------------
// The macro monitor.
// ---------------------------------------------------------------------

export interface MacroRow {
  label: string;
  value: number;
  decimals: number;
  unit: string;
  /** A short history for the sparkline, oldest first, ending at `value`. */
  history: number[];
  /** Market prices move; data releases do not. Only these ever tick. */
  tick?: number;
}

function history(r: () => number, end: number, start: number, noise: number, n = 18) {
  const out: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const k = i / (n - 1);
    out.push(start + (end - start) * k + (i === n - 1 ? 0 : gauss(r) * noise));
  }
  out[n - 1] = end;
  return out;
}

export function buildMacro(): MacroRow[] {
  const r = rng(7);
  return [
    { label: 'Euro area HICP, y/y', value: 2.1, decimals: 1, unit: '%', history: history(r, 2.1, 2.9, 0.08) },
    { label: 'Core HICP, y/y', value: 2.3, decimals: 1, unit: '%', history: history(r, 2.3, 2.8, 0.05) },
    { label: 'Euro area GDP, q/q', value: 0.2, decimals: 1, unit: '%', history: history(r, 0.2, 0.1, 0.12) },
    { label: 'Unemployment', value: 6.3, decimals: 1, unit: '%', history: history(r, 6.3, 6.6, 0.04) },
    { label: 'ECB deposit rate', value: 2.0, decimals: 2, unit: '%', history: [4, 4, 4, 4, 3.75, 3.75, 3.5, 3.25, 3.25, 3, 2.75, 2.5, 2.25, 2, 2, 2, 2, 2] },
    { label: 'Bund 10Y', value: 2.68, decimals: 2, unit: '%', history: history(r, 2.68, 2.35, 0.05), tick: 0.01 },
    { label: 'BTP-Bund spread', value: 86, decimals: 0, unit: ' bp', history: history(r, 86, 131, 4), tick: 1 },
    { label: 'EUR/USD', value: 1.169, decimals: 4, unit: '', history: history(r, 1.169, 1.085, 0.008), tick: 0.0004 },
  ];
}

/** Background candles: a walk used only as a blurred silhouette; `seed` varies the strip. */
export function candleSeries(n: number, seed = 0) {
  const r = rng(314 + seed * 101);
  let p = 100;
  const out: { o: number; h: number; l: number; c: number }[] = [];
  for (let i = 0; i < n; i += 1) {
    const o = p;
    const c = o * Math.exp(0.004 + 0.022 * gauss(r));
    const h = Math.max(o, c) * (1 + Math.abs(gauss(r)) * 0.009);
    const l = Math.min(o, c) * (1 - Math.abs(gauss(r)) * 0.009);
    out.push({ o, h, l, c });
    p = c;
  }
  return out;
}

/** A correlation matrix with a believable block structure, for the heatmap. */
export function correlationMatrix(n: number) {
  const r = rng(21);
  const m: number[][] = [];
  for (let i = 0; i < n; i += 1) {
    m.push([]);
    for (let j = 0; j < n; j += 1) {
      if (i === j) m[i].push(1);
      else if (j < i) m[i].push(m[j][i]);
      else {
        const sameBlock = Math.floor(i / 3) === Math.floor(j / 3);
        m[i].push(Math.max(-0.4, Math.min(0.95, (sameBlock ? 0.62 : 0.18) + gauss(r) * 0.14)));
      }
    }
  }
  return m;
}

/** Zero-coupon curve points: maturities in years and yields in percent. */
export const YIELD_CURVE = {
  tenors: [0.25, 0.5, 1, 2, 3, 5, 7, 10, 20, 30],
  labels: ['3M', '6M', '1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '20Y', '30Y'],
  a: [1.96, 1.94, 1.91, 1.95, 2.03, 2.24, 2.42, 2.68, 3.05, 3.12],
  b: [3.72, 3.65, 3.41, 3.02, 2.84, 2.71, 2.72, 2.78, 2.96, 2.94],
};
