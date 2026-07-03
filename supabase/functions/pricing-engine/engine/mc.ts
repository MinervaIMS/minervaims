// ---------------------------------------------------------------------------
// PayoffLab pricing engine — Monte Carlo.
//
// A pre-drawn cube of standard normals (with antithetic second half) is
// reused across every grid point and every finite-difference bump, giving
// common random numbers: value curves are smooth in the swept variable and
// FD Greeks are low-noise. Arithmetic Asians use the discrete geometric
// Asian as a control variate.
// Server-side only; see engine/math.ts header.
// ---------------------------------------------------------------------------

import { normCdf, Rng } from "./math.ts";
import type { CallPut } from "./gbs.ts";

export class NormalCube {
  readonly paths: number;
  readonly steps: number;
  readonly z: Float64Array;

  constructor(paths: number, steps: number, seed: number) {
    // Force an even path count so antithetics pair exactly.
    this.paths = 2 * Math.max(1, Math.floor(paths / 2));
    this.steps = steps;
    this.z = new Float64Array(this.paths * steps);
    const rng = new Rng(seed);
    const half = this.paths / 2;
    for (let p = 0; p < half; p++) {
      for (let s = 0; s < steps; s++) {
        const v = rng.normal();
        this.z[p * steps + s] = v;
        this.z[(p + half) * steps + s] = -v; // antithetic partner
      }
    }
  }
}

/** Per-path statistics available to payoff functions. */
export interface PathStats1 {
  ST: number;
  /** Arithmetic average of the step-end fixings (discrete monitoring). */
  avg: number;
  /** Geometric average of the step-end fixings. */
  gavg: number;
  min: number;
  max: number;
}

export interface PathStats2 {
  S1: number;
  S2: number;
  avg1: number;
  avg2: number;
}

export interface McResult {
  price: number;
  /** Standard error of the estimate. */
  se: number;
}

export interface HestonParams {
  kappa: number;   // mean-reversion speed of variance
  thetaV: number;  // long-run variance
  xi: number;      // volatility of variance
  rhoSV: number;   // correlation between spot and variance shocks
  v0: number;      // initial variance
}

/** sigma(S, t) for local-volatility simulation. */
export type LocalVolFn = (S: number, t: number) => number;

export type McDynamics =
  | { kind: "gbm"; sigma: number }
  | { kind: "gbm-term"; sigmaAt: (t: number) => number }
  | { kind: "heston"; params: HestonParams; volCube: NormalCube }
  | { kind: "localvol"; sigmaLoc: LocalVolFn };

/**
 * Single-asset Monte Carlo under risk-neutral drift b (cost of carry).
 * Returns the discounted expectation of `payoff(stats)`.
 */
export function mc1(
  cube: NormalCube, S0: number, tau: number, r: number, b: number,
  dyn: McDynamics, payoff: (s: PathStats1) => number,
): McResult {
  const { paths, steps, z } = cube;
  const dt = tau / steps;
  const sqdt = Math.sqrt(dt);
  const dfr = Math.exp(-r * tau);
  let sum = 0;
  let sumSq = 0;
  for (let p = 0; p < paths; p++) {
    let S = S0;
    let acc = 0;
    let lacc = 0;
    let mn = S0;
    let mx = S0;
    let v = dyn.kind === "heston" ? Math.max(dyn.params.v0, 0) : 0;
    for (let s = 0; s < steps; s++) {
      const zi = z[p * steps + s];
      if (dyn.kind === "gbm") {
        S *= Math.exp((b - 0.5 * dyn.sigma * dyn.sigma) * dt + dyn.sigma * sqdt * zi);
      } else if (dyn.kind === "gbm-term") {
        const sg = dyn.sigmaAt((s + 0.5) * dt);
        S *= Math.exp((b - 0.5 * sg * sg) * dt + sg * sqdt * zi);
      } else if (dyn.kind === "localvol") {
        const sg = Math.max(1e-6, dyn.sigmaLoc(S, s * dt));
        S *= Math.exp((b - 0.5 * sg * sg) * dt + sg * sqdt * zi);
      } else {
        // Heston, full-truncation Euler.
        const hp = dyn.params;
        const zv = dyn.volCube.z[p * steps + s];
        const zs = hp.rhoSV * zv + Math.sqrt(1 - hp.rhoSV * hp.rhoSV) * zi;
        const vPlus = Math.max(v, 0);
        const sgv = Math.sqrt(vPlus);
        S *= Math.exp((b - 0.5 * vPlus) * dt + sgv * sqdt * zs);
        v = v + hp.kappa * (hp.thetaV - vPlus) * dt + hp.xi * sgv * sqdt * zv;
      }
      acc += S;
      lacc += Math.log(S);
      if (S < mn) mn = S;
      if (S > mx) mx = S;
    }
    const pay = payoff({ ST: S, avg: acc / steps, gavg: Math.exp(lacc / steps), min: mn, max: mx });
    sum += pay;
    sumSq += pay * pay;
  }
  const mean = sum / paths;
  const varr = Math.max(sumSq / paths - mean * mean, 0);
  return { price: dfr * mean, se: (dfr * Math.sqrt(varr / paths)) };
}

/** Two correlated GBM assets (constant vols). */
export function mc2(
  cubeA: NormalCube, cubeB: NormalCube,
  S1: number, S2: number, tau: number, r: number, b1: number, b2: number,
  sigma1: number, sigma2: number, rho: number,
  payoff: (s: PathStats2) => number,
): McResult {
  const { paths, steps } = cubeA;
  const dt = tau / steps;
  const sqdt = Math.sqrt(dt);
  const dfr = Math.exp(-r * tau);
  const rr = Math.sqrt(Math.max(1 - rho * rho, 0));
  let sum = 0;
  let sumSq = 0;
  for (let p = 0; p < paths; p++) {
    let x1 = S1;
    let x2 = S2;
    let a1 = 0;
    let a2 = 0;
    for (let s = 0; s < steps; s++) {
      const zA = cubeA.z[p * steps + s];
      const zB = rho * zA + rr * cubeB.z[p * steps + s];
      x1 *= Math.exp((b1 - 0.5 * sigma1 * sigma1) * dt + sigma1 * sqdt * zA);
      x2 *= Math.exp((b2 - 0.5 * sigma2 * sigma2) * dt + sigma2 * sqdt * zB);
      a1 += x1;
      a2 += x2;
    }
    const pay = payoff({ S1: x1, S2: x2, avg1: a1 / steps, avg2: a2 / steps });
    sum += pay;
    sumSq += pay * pay;
  }
  const mean = sum / paths;
  const varr = Math.max(sumSq / paths - mean * mean, 0);
  return { price: dfr * mean, se: dfr * Math.sqrt(varr / paths) };
}

/**
 * Closed form for the DISCRETE geometric-average Asian with fixings at the
 * step ends t_i = i*tau/N (i = 1..N). The geometric mean of lognormals is
 * lognormal, so a Black-type formula applies exactly. Used as the control
 * variate for arithmetic Asians (and to validate the MC in tests).
 */
export function discreteGeometricAsian(
  cp: CallPut, S0: number, K: number, tau: number, r: number, b: number, sigma: number, n: number,
): number {
  const dt = tau / n;
  // mean of ln G
  let sumT = 0;
  for (let i = 1; i <= n; i++) sumT += i * dt;
  const mu = Math.log(S0) + (b - 0.5 * sigma * sigma) * (sumT / n);
  // var of ln G = sigma^2 / n^2 * sum_{i,j} min(t_i, t_j)
  let sumMin = 0;
  for (let i = 1; i <= n; i++) sumMin += (2 * (n - i) + 1) * i * dt;
  const varG = (sigma * sigma * sumMin) / (n * n);
  const sq = Math.sqrt(varG);
  const dfr = Math.exp(-r * tau);
  if (sq <= 0) {
    const G = Math.exp(mu);
    return dfr * (cp === "call" ? Math.max(G - K, 0) : Math.max(K - G, 0));
  }
  const d2 = (mu - Math.log(K)) / sq;
  const d1 = d2 + sq;
  const fw = Math.exp(mu + 0.5 * varG);
  if (cp === "call") return dfr * (fw * normCdf(d1) - K * normCdf(d2));
  return dfr * (K * normCdf(-d2) - fw * normCdf(-d1));
}

/**
 * Arithmetic-average Asian by Monte Carlo with the geometric control
 * variate: price = MC(arith) + [closed(geo) - MC(geo)].
 */
export function arithmeticAsianMc(
  cube: NormalCube, cp: CallPut, S0: number, K: number, tau: number, r: number, b: number, sigma: number,
): McResult {
  const sign = cp === "call" ? 1 : -1;
  const arith = mc1(cube, S0, tau, r, b, { kind: "gbm", sigma }, (s) => Math.max(sign * (s.avg - K), 0));
  const geoMc = mc1(cube, S0, tau, r, b, { kind: "gbm", sigma }, (s) => Math.max(sign * (s.gavg - K), 0));
  const geoCf = discreteGeometricAsian(cp, S0, K, tau, r, b, sigma, cube.steps);
  return { price: arith.price + (geoCf - geoMc.price), se: arith.se };
}

// ---------------------------------------------------------------------------
// Kirk (1995) approximation for spread options, max(S1 - S2 - K, 0):
// treats S1 / (S2 + K e^{-b2 tau}-ish aggregate) as lognormal. Fast and
// accurate for moderate K; the exact answer is available via Monte Carlo.
// ---------------------------------------------------------------------------

export function kirkSpread(
  cp: CallPut, S1: number, S2: number, K: number, tau: number, r: number,
  b1: number, b2: number, sigma1: number, sigma2: number, rho: number,
): number {
  if (tau <= 0) {
    const pay = S1 - S2 - K;
    return cp === "call" ? Math.max(pay, 0) : Math.max(-pay, 0);
  }
  const F1 = S1 * Math.exp(b1 * tau);
  const F2 = S2 * Math.exp(b2 * tau);
  const dfr = Math.exp(-r * tau);
  const w = F2 / (F2 + K);
  const sigma = Math.sqrt(Math.max(sigma1 * sigma1 - 2 * rho * sigma1 * sigma2 * w + sigma2 * sigma2 * w * w, 1e-16));
  const v = sigma * Math.sqrt(tau);
  const ratio = F1 / (F2 + K);
  const d1 = (Math.log(ratio) + 0.5 * v * v) / v;
  const d2 = d1 - v;
  const sign = cp === "call" ? 1 : -1;
  return dfr * sign * (F1 * normCdf(sign * d1) - (F2 + K) * normCdf(sign * d2));
}

/**
 * Product option, payoff max(S1*S2 - K, 0): the product of two lognormals is
 * lognormal, so this is exactly a Black formula on the product forward
 * F = F1 * F2 * exp(rho*sigma1*sigma2*tau) with vol
 * sqrt(sigma1^2 + sigma2^2 + 2 rho sigma1 sigma2).
 */
export function productOption(
  cp: CallPut, S1: number, S2: number, K: number, tau: number, r: number,
  b1: number, b2: number, sigma1: number, sigma2: number, rho: number,
): number {
  if (tau <= 0) {
    const pay = S1 * S2 - K;
    return cp === "call" ? Math.max(pay, 0) : Math.max(-pay, 0);
  }
  const F = S1 * S2 * Math.exp((b1 + b2 + rho * sigma1 * sigma2) * tau);
  const sigma = Math.sqrt(Math.max(sigma1 * sigma1 + sigma2 * sigma2 + 2 * rho * sigma1 * sigma2, 1e-16));
  const v = sigma * Math.sqrt(tau);
  const dfr = Math.exp(-r * tau);
  const d1 = (Math.log(F / K) + 0.5 * v * v) / v;
  const d2 = d1 - v;
  const sign = cp === "call" ? 1 : -1;
  return dfr * sign * (F * normCdf(sign * d1) - K * normCdf(sign * d2));
}
