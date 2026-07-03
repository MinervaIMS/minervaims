// ---------------------------------------------------------------------------
// PayoffLab pricing engine — portfolio aggregation, curves, Greeks, hedging.
//
// Greeks are uniform central finite differences of the aggregate portfolio
// value. Monte Carlo legs reuse one pre-drawn normal cube (common random
// numbers), so bumped re-evaluations difference away most of the noise. The
// correctness suite checks the FD Greeks against the analytic GBS set.
// Server-side only; see engine/math.ts header.
// ---------------------------------------------------------------------------

import {
  anyPathDependent, anyUsesMc, EvalEnv, firstExpiry, INSTRUMENTS, portfolioValue,
} from "./instruments.ts";
import type { LegSpec, Market, ModelSettings } from "./instruments.ts";
import { gbsGreeks } from "./gbs.ts";
import { Rng } from "./math.ts";

export type XVar = "S" | "t" | "r";

export type GreekName =
  | "delta" | "gamma" | "theta" | "vega" | "rho"
  | "vanna" | "vomma" | "charm" | "speed" | "colour";

export const ALL_GREEKS: GreekName[] = [
  "delta", "gamma", "theta", "vega", "rho", "vanna", "vomma", "charm", "speed", "colour",
];

export interface FixedMarket {
  S: number;
  r: number;
  sigma: number;
  q: number;
}

export interface GridRequest {
  legs: LegSpec[];
  model: ModelSettings;
  market: FixedMarket;
  xVar: XVar;
  xMin: number;
  xMax: number;
  n: number;
  greeks: GreekName[];
  wantPayoff: boolean;
}

export interface Scalars {
  /** Present value of the portfolio at the fixed market point. */
  price: number;
  legPrices: number[];
  /** Greeks at the fixed market point (always the full first-order set). */
  greeks: Record<string, number>;
  /** Zeros of (payoff at first expiry - initial cost) across the S range. */
  breakEvens: number[];
  maxProfit: number | null;
  maxLoss: number | null;
  maxProfitUnbounded: boolean;
  maxLossUnbounded: boolean;
  /** Payoff horizon used (first finite leg expiry), if any. */
  horizon: number | null;
}

export interface GridResponse {
  x: number[];
  value: number[];
  payoff: number[] | null;
  greeks: Record<string, number[]>;
  scalars: Scalars;
  notes: string[];
}

const clampN = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.floor(n)));

/** Whether the request needs the "coarse" (noisy-pricing) FD treatment. */
function isCoarse(req: { legs: LegSpec[]; model: ModelSettings }): boolean {
  if (anyUsesMc(req.legs)) return true;
  if (req.model.vol.kind === "heston" || req.model.vol.kind === "localvol") return true;
  if (req.model.pricing.startsWith("binomial") || req.model.pricing === "trinomial") return true;
  if (req.legs.some((l) => l.instrument === "amer-option")) return true;
  return false;
}

/** Evaluate the portfolio along the x grid with optional bumped market. */
function evalCurve(
  req: GridRequest, env: EvalEnv, xs: Float64Array,
  bump: { dS?: number; dt?: number; dsig?: number; dr?: number } = {},
): Float64Array {
  const out = new Float64Array(xs.length);
  const { market, xVar } = req;
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    const m: Market = {
      S: (xVar === "S" ? x : market.S) * (1 + (bump.dS ?? 0)),
      t: (xVar === "t" ? x : 0) + (bump.dt ?? 0),
      r: (xVar === "r" ? x : market.r) + (bump.dr ?? 0),
      sigma: Math.max(market.sigma + (bump.dsig ?? 0), 1e-6),
      q: market.q,
    };
    out[i] = portfolioValue(req.legs, m, env);
  }
  return out;
}

export function computeGrid(req: GridRequest): GridResponse {
  const n = clampN(req.n, 11, isCoarse(req) ? 121 : 401);
  const xs = new Float64Array(n);
  for (let i = 0; i < n; i++) xs[i] = req.xMin + ((req.xMax - req.xMin) * i) / (n - 1);

  const env = new EvalEnv(req.model, req.market.S);
  const coarse = isCoarse(req);
  const value = evalCurve(req, env, xs);

  // ---- payoff at first expiry ------------------------------------------
  let payoff: Float64Array | null = null;
  const horizon = firstExpiry(req.legs);
  const notes: string[] = [];
  if (req.wantPayoff) {
    if (anyPathDependent(req.legs)) {
      notes.push("path-dependent-payoff");
    } else if (req.xVar === "S") {
      const h = horizon ?? 0;
      payoff = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        payoff[i] = portfolioValue(req.legs, { S: xs[i], t: h, r: req.market.r, sigma: req.market.sigma, q: req.market.q }, env);
      }
      if (horizon !== null && req.legs.some((l) => {
        const T = INSTRUMENTS[l.instrument]?.maturity(l.params);
        return isFinite(T as number) && (T as number) > (horizon as number) + 1e-9;
      })) {
        notes.push("payoff-at-first-expiry"); // longer legs marked to model
      }
    }
  }

  // ---- Greek curves -----------------------------------------------------
  const hS = coarse ? 5e-3 : 1e-3;          // relative S bump
  const hS3 = coarse ? 2e-2 : 6e-3;         // wider for 3rd derivative
  const ht = 1 / 365;                        // one calendar day
  const hv = coarse ? 5e-3 : 1e-3;          // absolute vol bump
  const hv2 = coarse ? 1e-2 : 5e-3;
  const hr = 1e-4;

  const greeks: Record<string, number[]> = {};
  const wanted = new Set(req.greeks);
  const S0 = req.market.S; // reference for absolute S step on non-S axes

  // Cache of bumped curves so delta/gamma share evaluations.
  const curves = new Map<string, Float64Array>();
  const curve = (b: { dS?: number; dt?: number; dsig?: number; dr?: number }) => {
    const key = `${b.dS ?? 0}|${b.dt ?? 0}|${b.dsig ?? 0}|${b.dr ?? 0}`;
    let c = curves.get(key);
    if (!c) {
      c = (b.dS || b.dt || b.dsig || b.dr) ? evalCurve(req, env, xs, b) : value;
      curves.set(key, c);
    }
    return c;
  };
  const diff = (up: Float64Array, dn: Float64Array, denom: number): number[] => {
    const out = new Array<number>(n);
    for (let i = 0; i < n; i++) out[i] = (up[i] - dn[i]) / denom;
    return out;
  };

  // Absolute S step at each grid point differs when x IS S (relative bump),
  // so express first/second derivatives per point.
  const sAt = (i: number) => (req.xVar === "S" ? xs[i] : S0);

  if (wanted.has("delta") || wanted.has("gamma")) {
    const up = curve({ dS: hS });
    const dn = curve({ dS: -hS });
    if (wanted.has("delta")) {
      const out = new Array<number>(n);
      for (let i = 0; i < n; i++) out[i] = (up[i] - dn[i]) / (2 * hS * sAt(i));
      greeks.delta = out;
    }
    if (wanted.has("gamma")) {
      const out = new Array<number>(n);
      for (let i = 0; i < n; i++) {
        const h = hS * sAt(i);
        out[i] = (up[i] - 2 * value[i] + dn[i]) / (h * h);
      }
      greeks.gamma = out;
    }
  }
  if (wanted.has("speed")) {
    const u2 = curve({ dS: 2 * hS3 });
    const u1 = curve({ dS: hS3 });
    const d1 = curve({ dS: -hS3 });
    const d2 = curve({ dS: -2 * hS3 });
    const out = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      const h = hS3 * sAt(i);
      out[i] = (u2[i] - 2 * u1[i] + 2 * d1[i] - d2[i]) / (2 * h * h * h);
    }
    greeks.speed = out;
  }
  if (wanted.has("theta")) {
    greeks.theta = diff(curve({ dt: ht }), curve({ dt: -ht }), 2 * ht);
  }
  if (wanted.has("vega")) {
    greeks.vega = diff(curve({ dsig: hv }), curve({ dsig: -hv }), 2 * hv);
  }
  if (wanted.has("vomma")) {
    const up = curve({ dsig: hv2 });
    const dn = curve({ dsig: -hv2 });
    const out = new Array<number>(n);
    for (let i = 0; i < n; i++) out[i] = (up[i] - 2 * value[i] + dn[i]) / (hv2 * hv2);
    greeks.vomma = out;
  }
  if (wanted.has("rho")) {
    greeks.rho = diff(curve({ dr: hr }), curve({ dr: -hr }), 2 * hr);
  }
  if (wanted.has("vanna")) {
    const pp = curve({ dS: hS, dsig: hv });
    const pm = curve({ dS: hS, dsig: -hv });
    const mp = curve({ dS: -hS, dsig: hv });
    const mm = curve({ dS: -hS, dsig: -hv });
    const out = new Array<number>(n);
    for (let i = 0; i < n; i++) out[i] = (pp[i] - pm[i] - mp[i] + mm[i]) / (4 * hS * sAt(i) * hv);
    greeks.vanna = out;
  }
  if (wanted.has("charm")) {
    const pp = curve({ dS: hS, dt: ht });
    const mp = curve({ dS: -hS, dt: ht });
    const pm = curve({ dS: hS, dt: -ht });
    const mm = curve({ dS: -hS, dt: -ht });
    const out = new Array<number>(n);
    for (let i = 0; i < n; i++) out[i] = (pp[i] - mp[i] - pm[i] + mm[i]) / (4 * hS * sAt(i) * ht);
    greeks.charm = out;
  }
  if (wanted.has("colour")) {
    // d(gamma)/dt via gamma at t +/- one day.
    const up1 = curve({ dS: hS, dt: ht });
    const dn1 = curve({ dS: -hS, dt: ht });
    const c1 = curve({ dt: ht });
    const up2 = curve({ dS: hS, dt: -ht });
    const dn2 = curve({ dS: -hS, dt: -ht });
    const c2 = curve({ dt: -ht });
    const out = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      const h = hS * sAt(i);
      const g1 = (up1[i] - 2 * c1[i] + dn1[i]) / (h * h);
      const g2 = (up2[i] - 2 * c2[i] + dn2[i]) / (h * h);
      out[i] = (g1 - g2) / (2 * ht);
    }
    greeks.colour = out;
  }

  // ---- scalars at the fixed market point --------------------------------
  const scalars = computeScalars(req, env, horizon);

  for (const note of env.notes) notes.push(note);
  return {
    x: Array.from(xs),
    value: Array.from(value),
    payoff: payoff ? Array.from(payoff) : null,
    greeks,
    scalars,
    notes,
  };
}

/** Point Greeks (full first-order set + any second-order requested). */
export function pointGreeks(
  legs: LegSpec[], model: ModelSettings, market: FixedMarket,
  names: GreekName[] = ["delta", "gamma", "theta", "vega", "rho"],
  tBase = 0,
): Record<string, number> {
  const env = new EvalEnv(model, market.S);
  const coarse = isCoarse({ legs, model });
  const hS = (coarse ? 5e-3 : 1e-3) * market.S;
  const ht = 1 / 365;
  const hv = coarse ? 5e-3 : 1e-3;
  const hr = 1e-4;
  const V = (dS = 0, dt = 0, dsig = 0, dr = 0) =>
    portfolioValue(legs, {
      S: market.S + dS, t: tBase + dt, r: market.r + dr,
      sigma: Math.max(market.sigma + dsig, 1e-6), q: market.q,
    }, env);
  const v0 = V();
  const out: Record<string, number> = { price: v0 };
  const want = new Set(names);
  const vUp = V(hS);
  const vDn = V(-hS);
  if (want.has("delta")) out.delta = (vUp - vDn) / (2 * hS);
  if (want.has("gamma")) out.gamma = (vUp - 2 * v0 + vDn) / (hS * hS);
  if (want.has("theta")) out.theta = (V(0, ht) - V(0, -ht)) / (2 * ht);
  if (want.has("vega")) out.vega = (V(0, 0, hv) - V(0, 0, -hv)) / (2 * hv);
  if (want.has("rho")) out.rho = (V(0, 0, 0, hr) - V(0, 0, 0, -hr)) / (2 * hr);
  if (want.has("vanna")) out.vanna = (V(hS, 0, hv) - V(hS, 0, -hv) - V(-hS, 0, hv) + V(-hS, 0, -hv)) / (4 * hS * hv);
  if (want.has("vomma")) {
    const h2 = coarse ? 1e-2 : 2e-3;
    out.vomma = (V(0, 0, h2) - 2 * v0 + V(0, 0, -h2)) / (h2 * h2);
  }
  if (want.has("charm")) out.charm = (V(hS, ht) - V(-hS, ht) - V(hS, -ht) + V(-hS, -ht)) / (4 * hS * ht);
  if (want.has("speed")) {
    const h3 = (coarse ? 2e-2 : 6e-3) * market.S;
    out.speed = (V(2 * h3) - 2 * V(h3) + 2 * V(-h3) - V(-2 * h3)) / (2 * h3 * h3 * h3);
  }
  if (want.has("colour")) {
    const g = (dt: number) => (V(hS, dt) - 2 * V(0, dt) + V(-hS, dt)) / (hS * hS);
    out.colour = (g(ht) - g(-ht)) / (2 * ht);
  }
  return out;
}

function computeScalars(req: GridRequest, env: EvalEnv, horizon: number | null): Scalars {
  const m0: Market = { S: req.market.S, t: 0, r: req.market.r, sigma: req.market.sigma, q: req.market.q };
  const legPrices = req.legs.map((leg) => {
    const impl = INSTRUMENTS[leg.instrument];
    return impl ? leg.side * leg.qty * impl.value(leg.params, m0, env) : 0;
  });
  const price = legPrices.reduce((a, b) => a + b, 0);
  const greeks = pointGreeks(req.legs, req.model, req.market);

  // Profit at horizon over a dense S grid (only meaningful for S-relevant portfolios).
  let breakEvens: number[] = [];
  let maxProfit: number | null = null;
  let maxLoss: number | null = null;
  let maxProfitUnbounded = false;
  let maxLossUnbounded = false;
  const usesS = req.legs.some((l) => INSTRUMENTS[l.instrument]?.usesS !== false);
  if (usesS && !anyPathDependent(req.legs) && req.legs.length > 0) {
    const h = horizon ?? 0;
    const lo = Math.max(req.xVar === "S" ? req.xMin : req.market.S * 0.4, 1e-6);
    const hi = req.xVar === "S" ? req.xMax : req.market.S * 1.6;
    const N = 481;
    const prof = new Float64Array(N);
    const ss = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const S = lo + ((hi - lo) * i) / (N - 1);
      ss[i] = S;
      prof[i] = portfolioValue(req.legs, { S, t: h, r: req.market.r, sigma: req.market.sigma, q: req.market.q }, env) - price;
    }
    for (let i = 1; i < N; i++) {
      if ((prof[i - 1] <= 0 && prof[i] > 0) || (prof[i - 1] >= 0 && prof[i] < 0)) {
        const f = Math.abs(prof[i - 1]) / (Math.abs(prof[i - 1]) + Math.abs(prof[i]));
        const be = ss[i - 1] + f * (ss[i] - ss[i - 1]);
        if (breakEvens.length === 0 || Math.abs(be - breakEvens[breakEvens.length - 1]) > (hi - lo) * 1e-3) {
          breakEvens.push(be);
        }
      }
    }
    breakEvens = breakEvens.slice(0, 6);
    let mx = -Infinity;
    let mn = Infinity;
    let iMx = 0;
    let iMn = 0;
    for (let i = 0; i < N; i++) {
      if (prof[i] > mx) { mx = prof[i]; iMx = i; }
      if (prof[i] < mn) { mn = prof[i]; iMn = i; }
    }
    maxProfit = mx;
    maxLoss = mn;
    // If the extremum sits on the boundary and the curve still trends outward,
    // report it as unbounded rather than a finite artefact of the range.
    const slopeEnd = prof[N - 1] - prof[N - 2];
    const slopeStart = prof[1] - prof[0];
    maxProfitUnbounded = (iMx === N - 1 && slopeEnd > 1e-9) || (iMx === 0 && slopeStart < -1e-9);
    maxLossUnbounded = (iMn === N - 1 && slopeEnd < -1e-9) || (iMn === 0 && slopeStart > 1e-9);
  }

  return {
    price, legPrices, greeks, breakEvens, maxProfit, maxLoss,
    maxProfitUnbounded, maxLossUnbounded, horizon,
  };
}

// ---------------------------------------------------------------------------
// Hedging.
// ---------------------------------------------------------------------------

export type HedgeKind = "delta" | "delta-gamma" | "vega";

export interface HedgeResult {
  legs: LegSpec[];
  residual: Record<string, number>;
  note: string;
}

/**
 * Solve for the hedge legs that neutralise the requested exposures at the
 * current market point. The hedge option (for gamma/vega) defaults to an
 * at-the-money call with the given maturity.
 */
export function solveHedge(
  legs: LegSpec[], model: ModelSettings, market: FixedMarket,
  kind: HedgeKind, hedgeOptionT = 1, hedgeOptionK?: number,
): HedgeResult {
  const g = pointGreeks(legs, model, market, ["delta", "gamma", "vega"]);
  const K = hedgeOptionK ?? Math.round(market.S);
  const optLeg: LegSpec = { instrument: "euro-option", side: 1, qty: 1, params: { cp: "call", K, T: hedgeOptionT } };
  const og = pointGreeks([optLeg], model, market, ["delta", "gamma", "vega"]);

  const added: LegSpec[] = [];
  let stockQty = -g.delta;
  if (kind === "delta-gamma" && Math.abs(og.gamma) > 1e-12) {
    const w = -g.gamma / og.gamma;
    added.push({ ...optLeg, side: w >= 0 ? 1 : -1, qty: Math.abs(w) });
    stockQty = -(g.delta + w * og.delta);
  } else if (kind === "vega" && Math.abs(og.vega) > 1e-12) {
    const w = -g.vega / og.vega;
    added.push({ ...optLeg, side: w >= 0 ? 1 : -1, qty: Math.abs(w) });
    stockQty = -(g.delta + w * og.delta);
  }
  if (Math.abs(stockQty) > 1e-12) {
    added.push({ instrument: "stock", side: stockQty >= 0 ? 1 : -1, qty: Math.abs(stockQty), params: {} });
  }
  const residual = pointGreeks([...legs, ...added], model, market, ["delta", "gamma", "vega", "theta"]);
  return {
    legs: added,
    residual,
    note: kind === "delta"
      ? "Added the underlying position that sets net delta to zero."
      : kind === "delta-gamma"
        ? `Added an ATM call (K ${K}, T ${hedgeOptionT}y) to zero gamma, then the underlying to re-zero delta.`
        : `Added an ATM call (K ${K}, T ${hedgeOptionT}y) to zero vega, then the underlying to re-zero delta.`,
  };
}

export interface HedgeSimRequest {
  legs: LegSpec[];
  model: ModelSettings;
  market: FixedMarket;
  /** Realised volatility of the simulated path. */
  sigmaReal: number;
  /** Volatility used to compute hedge deltas (the "model" vol). */
  sigmaHedge: number;
  /** Number of re-hedge intervals over the horizon. */
  rehedges: number;
  /** Simulation horizon (default: first leg expiry). */
  horizon?: number;
  seed: number;
  /** Extra paths used only for the P&L dispersion statistics. */
  statPaths: number;
}

export interface HedgeSimResponse {
  times: number[];
  path: number[];
  deltaHeld: number[];
  /** Cumulative P&L of portfolio + delta hedge (marked to model). */
  hedgedPnl: number[];
  /** Cumulative P&L of the unhedged portfolio. */
  unhedgedPnl: number[];
  /** Per-step decomposition, aligned with times[1..]. */
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

/**
 * Discrete-time delta-hedging experiment along one seeded GBM path, plus a
 * small ensemble for the dispersion statistics. The hedger re-hedges at
 * fixed intervals using deltas computed at sigmaHedge while the world moves
 * at sigmaReal — the classic demonstration that discrete re-hedging leaves
 * gamma-shaped residual risk.
 */
export function hedgeSim(req: HedgeSimRequest): HedgeSimResponse {
  const notes: string[] = [];
  if (anyUsesMc(req.legs)) {
    throw new Error("The hedging simulation supports closed-form portfolios only.");
  }
  const H = req.horizon ?? firstExpiry(req.legs) ?? 1;
  const n = clampN(req.rehedges, 4, 730);
  const dt = H / n;
  const model = req.model;
  const mkt = req.market;

  const runPath = (seed: number, record: boolean) => {
    const rng = new Rng(seed);
    const env = new EvalEnv(model, mkt.S);
    let S = mkt.S;
    let cash = 0;
    let deltaPos = 0;
    const v0 = portfolioValue(req.legs, { S, t: 0, r: mkt.r, sigma: req.sigmaHedge, q: mkt.q }, env);
    const times: number[] = [0];
    const path: number[] = [S];
    const deltaHeld: number[] = [];
    const hedged: number[] = [0];
    const unhedged: number[] = [0];
    const gammaPnl: number[] = [];
    const thetaPnl: number[] = [];
    const residualPnl: number[] = [];
    let prevHedged = 0;
    let lastUnhedged = 0;

    const greeksAt = (s: number, t: number) =>
      pointGreeks(req.legs, model, { S: s, r: mkt.r, sigma: req.sigmaHedge, q: mkt.q }, ["delta", "gamma", "theta"], t);

    let g = greeksAt(S, 0);
    // We hedge the PORTFOLIO's delta away: hold -delta of stock.
    deltaPos = -g.delta;
    deltaHeld.push(deltaPos);
    cash = deltaPos * -S; // financing the stock position
    for (let i = 1; i <= n; i++) {
      const t = i * dt;
      const z = rng.normal();
      const Sn = S * Math.exp((mkt.r - mkt.q - 0.5 * req.sigmaReal * req.sigmaReal) * dt + req.sigmaReal * Math.sqrt(dt) * z);
      cash *= Math.exp(mkt.r * dt);
      const env2 = new EvalEnv(model, mkt.S);
      const vt = portfolioValue(req.legs, { S: Sn, t, r: mkt.r, sigma: req.sigmaHedge, q: mkt.q }, env2);
      const dS = Sn - S;
      const hedgedPnlNow = (vt - v0) + deltaPos * Sn + cash;
      const unhedgedNow = vt - v0;
      lastUnhedged = unhedgedNow;
      const stepPnl = hedgedPnlNow - prevHedged;
      const gStep = 0.5 * g.gamma * dS * dS;
      const tStep = g.theta * dt;
      if (record) {
        times.push(t);
        path.push(Sn);
        hedged.push(hedgedPnlNow);
        unhedged.push(unhedgedNow);
        gammaPnl.push(gStep);
        thetaPnl.push(tStep);
        residualPnl.push(stepPnl - gStep - tStep);
      }
      prevHedged = hedgedPnlNow;
      S = Sn;
      if (i < n) {
        g = greeksAt(S, t);
        const newDelta = -g.delta;
        cash -= (newDelta - deltaPos) * S; // buy/sell stock at market
        deltaPos = newDelta;
        if (record) deltaHeld.push(deltaPos);
      }
    }
    return { times, path, deltaHeld, hedged, unhedged, gammaPnl, thetaPnl, residualPnl, finalHedged: prevHedged, finalUnhedged: lastUnhedged };
  };

  const main = runPath(req.seed, true);

  // Dispersion ensemble (final P&L only).
  const paths = clampN(req.statPaths, 0, 400);
  let sh = 0, sh2 = 0, su = 0, su2 = 0;
  for (let p = 0; p < paths; p++) {
    const r = runPath(req.seed + 1000 + p * 17, false);
    sh += r.finalHedged; sh2 += r.finalHedged * r.finalHedged;
    su += r.finalUnhedged; su2 += r.finalUnhedged * r.finalUnhedged;
  }
  const stdOf = (s: number, s2: number) => (paths > 1 ? Math.sqrt(Math.max(s2 / paths - (s / paths) * (s / paths), 0)) : 0);

  return {
    times: main.times,
    path: main.path,
    deltaHeld: main.deltaHeld,
    hedgedPnl: main.hedged,
    unhedgedPnl: main.unhedged,
    gammaPnl: main.gammaPnl,
    thetaPnl: main.thetaPnl,
    residualPnl: main.residualPnl,
    summary: {
      finalHedged: main.finalHedged,
      finalUnhedged: main.finalUnhedged,
      stdHedged: stdOf(sh, sh2),
      stdUnhedged: stdOf(su, su2),
    },
    notes,
  };
}

export { gbsGreeks };
