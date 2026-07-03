// ---------------------------------------------------------------------------
// PayoffLab pricing engine — generalised Black–Scholes family.
//
// The generalised model (Black–Scholes–Merton with cost of carry b) covers:
//   b = r        : Black–Scholes (1973), non-dividend stock
//   b = r - q    : Merton (1973), continuous dividend yield q
//   b = 0        : Black (1976), options on forwards/futures
//   b = r - rf   : Garman–Kohlhagen (1983), currency options
// Server-side only; see engine/math.ts header.
// ---------------------------------------------------------------------------

import { normCdf, normPdf } from "./math.ts";

export type CallPut = "call" | "put";

/** Undiscounted intrinsic value. */
export function intrinsic(cp: CallPut, S: number, K: number): number {
  return cp === "call" ? Math.max(S - K, 0) : Math.max(K - S, 0);
}

/**
 * Generalised Black–Scholes price.
 * S spot, K strike, tau time to expiry (years), r continuously-compounded
 * rate, b cost of carry, sigma lognormal volatility.
 */
export function gbs(cp: CallPut, S: number, K: number, tau: number, r: number, b: number, sigma: number): number {
  if (tau <= 0) return intrinsic(cp, S, K);
  if (sigma <= 0) {
    // Deterministic forward: discounted intrinsic on the forward.
    const F = S * Math.exp(b * tau);
    return Math.exp(-r * tau) * intrinsic(cp, F, K);
  }
  const v = sigma * Math.sqrt(tau);
  const d1 = (Math.log(S / K) + (b + 0.5 * sigma * sigma) * tau) / v;
  const d2 = d1 - v;
  const df = Math.exp((b - r) * tau);
  if (cp === "call") {
    return S * df * normCdf(d1) - K * Math.exp(-r * tau) * normCdf(d2);
  }
  return K * Math.exp(-r * tau) * normCdf(-d2) - S * df * normCdf(-d1);
}

export interface GbsGreeks {
  price: number;
  delta: number;
  gamma: number;
  /** dV/d(calendar time) = -dV/d(tau); per year. */
  theta: number;
  /** dV/d(sigma), per unit of volatility (divide by 100 for "per vol point"). */
  vega: number;
  /** dV/dr holding the carry spread (b - r) fixed — matches the r-axis sweep. */
  rho: number;
}

/**
 * Analytic first-order Greeks of the generalised model. Used as the reference
 * implementation in the correctness suite; production Greeks come from the
 * uniform finite-difference layer in portfolio.ts.
 */
export function gbsGreeks(cp: CallPut, S: number, K: number, tau: number, r: number, b: number, sigma: number): GbsGreeks {
  if (tau <= 0 || sigma <= 0) {
    const price = gbs(cp, S, K, tau, r, b, sigma);
    const eps = Math.max(1e-6, S * 1e-6);
    const delta = (gbs(cp, S + eps, K, tau, r, b, sigma) - gbs(cp, S - eps, K, tau, r, b, sigma)) / (2 * eps);
    return { price, delta, gamma: 0, theta: 0, vega: 0, rho: 0 };
  }
  const v = sigma * Math.sqrt(tau);
  const d1 = (Math.log(S / K) + (b + 0.5 * sigma * sigma) * tau) / v;
  const d2 = d1 - v;
  const df = Math.exp((b - r) * tau);
  const dfr = Math.exp(-r * tau);
  const price = gbs(cp, S, K, tau, r, b, sigma);
  const sign = cp === "call" ? 1 : -1;
  const delta = sign * df * normCdf(sign * d1);
  const gamma = (df * normPdf(d1)) / (S * v);
  const vega = S * df * normPdf(d1) * Math.sqrt(tau);
  // Theta (per year, calendar-time derivative).
  const theta =
    (-S * df * normPdf(d1) * sigma) / (2 * Math.sqrt(tau)) -
    sign * (b - r) * S * df * normCdf(sign * d1) -
    sign * r * K * dfr * normCdf(sign * d2);
  // Rho with the carry spread q = r - b held fixed (so d(b)/dr = 1).
  const rho = sign * K * tau * dfr * normCdf(sign * d2);
  return { price, delta, gamma, theta, vega, rho };
}

// ---------------------------------------------------------------------------
// Bachelier (normal) model. sigmaN is the ABSOLUTE (normal) volatility in
// currency units per sqrt(year). PayoffLab maps a lognormal input sigma to
// sigmaN = sigma * S so the two models are directly comparable.
// Forward-measure form: V = e^{-r tau} * BachelierForward(F, K, sigmaN, tau).
// ---------------------------------------------------------------------------

export function bachelier(cp: CallPut, S: number, K: number, tau: number, r: number, b: number, sigmaN: number): number {
  if (tau <= 0) return intrinsic(cp, S, K);
  const F = S * Math.exp(b * tau);
  const dfr = Math.exp(-r * tau);
  if (sigmaN <= 0) return dfr * intrinsic(cp, F, K);
  const v = sigmaN * Math.sqrt(tau);
  const d = (F - K) / v;
  const sign = cp === "call" ? 1 : -1;
  return dfr * (sign * (F - K) * normCdf(sign * d) + v * normPdf(d));
}

// ---------------------------------------------------------------------------
// Merton (1976) jump-diffusion: Poisson lognormal jumps overlaid on GBM.
// lambda: jump intensity (per year); muJ: mean of log jump size;
// deltaJ: std dev of log jump size. Priced as the standard Poisson-weighted
// series of Black–Scholes prices (truncated when terms are negligible).
// ---------------------------------------------------------------------------

export function mertonJump(
  cp: CallPut, S: number, K: number, tau: number, r: number, b: number, sigma: number,
  lambda: number, muJ: number, deltaJ: number,
): number {
  if (tau <= 0) return intrinsic(cp, S, K);
  if (lambda <= 0) return gbs(cp, S, K, tau, r, b, sigma);
  const kBar = Math.exp(muJ + 0.5 * deltaJ * deltaJ) - 1; // E[jump size] - 1
  const lam = lambda * tau;
  let price = 0;
  let weight = Math.exp(-lam);
  for (let n = 0; n <= 170; n++) {
    if (n > 0) weight *= lam / n;
    if (weight < 1e-14 && n > lam) break;
    const sigmaN = Math.sqrt(sigma * sigma + (n * deltaJ * deltaJ) / tau);
    const bN = b - lambda * kBar + (n * (muJ + 0.5 * deltaJ * deltaJ)) / tau;
    price += weight * gbs(cp, S, K, tau, r, bN, sigmaN);
  }
  return price;
}

// ---------------------------------------------------------------------------
// Digital (binary) options — Reiner & Rubinstein (1991b).
// ---------------------------------------------------------------------------

/** Cash-or-nothing: pays `payout` at expiry if in the money. */
export function digitalCash(cp: CallPut, S: number, K: number, tau: number, r: number, b: number, sigma: number, payout: number): number {
  if (tau <= 0) return (cp === "call" ? S > K : S < K) ? payout : 0;
  if (sigma <= 0) {
    const F = S * Math.exp(b * tau);
    return Math.exp(-r * tau) * ((cp === "call" ? F > K : F < K) ? payout : 0);
  }
  const v = sigma * Math.sqrt(tau);
  const d2 = (Math.log(S / K) + (b - 0.5 * sigma * sigma) * tau) / v;
  const sign = cp === "call" ? 1 : -1;
  return payout * Math.exp(-r * tau) * normCdf(sign * d2);
}

/** Asset-or-nothing: pays the asset at expiry if in the money. */
export function digitalAsset(cp: CallPut, S: number, K: number, tau: number, r: number, b: number, sigma: number): number {
  if (tau <= 0) return (cp === "call" ? S > K : S < K) ? S : 0;
  if (sigma <= 0) {
    const F = S * Math.exp(b * tau);
    return Math.exp(-r * tau) * ((cp === "call" ? F > K : F < K) ? F : 0);
  }
  const v = sigma * Math.sqrt(tau);
  const d1 = (Math.log(S / K) + (b + 0.5 * sigma * sigma) * tau) / v;
  const sign = cp === "call" ? 1 : -1;
  return S * Math.exp((b - r) * tau) * normCdf(sign * d1);
}

// ---------------------------------------------------------------------------
// Forward-start option (Rubinstein 1990). Strike set at tStart as
// alpha * S(tStart); expires at tau (> tStart). Homogeneity of the GBS price
// gives the closed form below.
// ---------------------------------------------------------------------------

export function forwardStart(
  cp: CallPut, S: number, alpha: number, tStart: number, tau: number, r: number, b: number, sigma: number,
): number {
  if (tStart <= 0) return gbs(cp, S, alpha * S, tau, r, b, sigma);
  const rem = Math.max(tau - tStart, 0);
  return S * Math.exp((b - r) * tStart) * gbs(cp, 1, alpha, rem, r, b, sigma);
}

// ---------------------------------------------------------------------------
// Simple chooser (Rubinstein 1991): at tChoose the holder picks between a
// call and a put, both with strike K and expiry tau.
// ---------------------------------------------------------------------------

export function simpleChooser(S: number, K: number, tChoose: number, tau: number, r: number, b: number, sigma: number): number {
  if (tChoose <= 0) {
    return Math.max(gbs("call", S, K, tau, r, b, sigma), gbs("put", S, K, tau, r, b, sigma));
  }
  const v2 = sigma * Math.sqrt(tau);
  const d = (Math.log(S / K) + (b + 0.5 * sigma * sigma) * tau) / v2;
  const vy = sigma * Math.sqrt(tChoose);
  const y = (Math.log(S / K) + b * tau + 0.5 * sigma * sigma * tChoose) / vy;
  const df = Math.exp((b - r) * tau);
  const dfr = Math.exp(-r * tau);
  return (
    S * df * normCdf(d) - K * dfr * normCdf(d - v2) - S * df * normCdf(-y) + K * dfr * normCdf(-y + vy)
  );
}
