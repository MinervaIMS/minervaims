// ---------------------------------------------------------------------------
// PayoffLab pricing engine — closed-form exotics.
// Barriers: Reiner & Rubinstein (1991a). Lookbacks: Goldman–Sosin–Gatto (1979)
// and Conze–Viswanathan (1991). Compound: Geske (1979). Two-asset: Margrabe
// (1978) and Stulz (1982). Asian (geometric): Kemna & Vorst (1990).
// Server-side only; see engine/math.ts header.
// ---------------------------------------------------------------------------

import { bivNormCdf, normCdf } from "./math.ts";
import { gbs, intrinsic } from "./gbs.ts";
import type { CallPut } from "./gbs.ts";

export type BarrierKind =
  | "down-out" | "down-in" | "up-out" | "up-in";

/**
 * Single-barrier option, continuously monitored (Reiner–Rubinstein).
 * H barrier, rebate R (paid at hit for knock-outs, at expiry for knock-ins
 * that never knock in). If the barrier has already been touched, an "in"
 * option is the vanilla and an "out" option is worth its rebate.
 */
export function barrier(
  cp: CallPut, kind: BarrierKind, S: number, K: number, H: number,
  tau: number, r: number, b: number, sigma: number, rebate = 0,
): number {
  const isDown = kind.startsWith("down");
  const isIn = kind.endsWith("in");
  // Already-knocked states.
  if ((isDown && S <= H) || (!isDown && S >= H)) {
    return isIn ? gbs(cp, S, K, tau, r, b, sigma) : rebate;
  }
  if (tau <= 0) return isIn ? rebate : intrinsic(cp, S, K);
  if (sigma <= 0) sigma = 1e-8;

  const v = sigma * Math.sqrt(tau);
  const mu = (b - 0.5 * sigma * sigma) / (sigma * sigma);
  const lam = Math.sqrt(mu * mu + (2 * r) / (sigma * sigma));
  const phi = cp === "call" ? 1 : -1;
  const eta = isDown ? 1 : -1;

  const x1 = Math.log(S / K) / v + (1 + mu) * v;
  const x2 = Math.log(S / H) / v + (1 + mu) * v;
  const y1 = Math.log((H * H) / (S * K)) / v + (1 + mu) * v;
  const y2 = Math.log(H / S) / v + (1 + mu) * v;
  const z = Math.log(H / S) / v + lam * v;

  const df = Math.exp((b - r) * tau);
  const dfr = Math.exp(-r * tau);
  const HS = H / S;
  const pow2mu = Math.pow(HS, 2 * mu);
  const pow2mu1 = Math.pow(HS, 2 * (mu + 1));

  const A = phi * S * df * normCdf(phi * x1) - phi * K * dfr * normCdf(phi * x1 - phi * v);
  const B = phi * S * df * normCdf(phi * x2) - phi * K * dfr * normCdf(phi * x2 - phi * v);
  const C = phi * S * df * pow2mu1 * normCdf(eta * y1) - phi * K * dfr * pow2mu * normCdf(eta * y1 - eta * v);
  const D = phi * S * df * pow2mu1 * normCdf(eta * y2) - phi * K * dfr * pow2mu * normCdf(eta * y2 - eta * v);
  const E = rebate * dfr * (normCdf(eta * x2 - eta * v) - pow2mu * normCdf(eta * y2 - eta * v));
  const F = rebate * (Math.pow(HS, mu + lam) * normCdf(eta * z) + Math.pow(HS, mu - lam) * normCdf(eta * z - 2 * eta * lam * v));

  const call = cp === "call";
  const KgtH = K > H;
  let value: number;
  if (isIn) {
    if (isDown && call) value = KgtH ? C + E : A - B + D + E;
    else if (!isDown && call) value = KgtH ? A + E : B - C + D + E;
    else if (isDown && !call) value = KgtH ? B - C + D + E : A + E;
    else value = KgtH ? A - B + D + E : C + E;
  } else {
    if (isDown && call) value = KgtH ? A - C + F : B - D + F;
    else if (!isDown && call) value = KgtH ? F : A - B + C - D + F;
    else if (isDown && !call) value = KgtH ? A - B + C - D + F : F;
    else value = KgtH ? B - D + F : A - C + F;
  }
  return Math.max(value, 0) === value || rebate > 0 ? value : Math.max(value, 0);
}

// ---------------------------------------------------------------------------
// Lookbacks. `extremum` is the running minimum (floating call / fixed put)
// or running maximum (floating put / fixed call) observed so far; on a fresh
// contract it equals S. The b→0 limit is handled by a tiny carry nudge.
// ---------------------------------------------------------------------------

function safeCarry(b: number): number {
  return Math.abs(b) < 1e-7 ? (b >= 0 ? 1e-7 : -1e-7) : b;
}

/** Floating-strike lookback (Goldman–Sosin–Gatto). Call pays S_T - min; put pays max - S_T. */
export function lookbackFloating(
  cp: CallPut, S: number, extremum: number, tau: number, r: number, b0: number, sigma: number,
): number {
  const M = extremum;
  if (tau <= 0) return cp === "call" ? Math.max(S - M, 0) : Math.max(M - S, 0);
  const b = safeCarry(b0);
  const v = sigma * Math.sqrt(tau);
  const df = Math.exp((b - r) * tau);
  const dfr = Math.exp(-r * tau);
  const k = (2 * b) / (sigma * sigma);
  if (cp === "call") {
    const a1 = (Math.log(S / M) + (b + 0.5 * sigma * sigma) * tau) / v;
    const a2 = a1 - v;
    return (
      S * df * normCdf(a1) - M * dfr * normCdf(a2) +
      S * dfr * (1 / k) * (Math.pow(S / M, -k) * normCdf(-a1 + (2 * b / sigma) * Math.sqrt(tau)) - Math.exp(b * tau) * normCdf(-a1))
    );
  }
  const b1 = (Math.log(S / M) + (b + 0.5 * sigma * sigma) * tau) / v;
  const b2 = b1 - v;
  return (
    M * dfr * normCdf(-b2) - S * df * normCdf(-b1) +
    S * dfr * (1 / k) * (-Math.pow(S / M, -k) * normCdf(b1 - (2 * b / sigma) * Math.sqrt(tau)) + Math.exp(b * tau) * normCdf(b1))
  );
}

/** Fixed-strike lookback (Conze–Viswanathan). Call pays max(maxS - K, 0); put pays max(K - minS, 0). */
export function lookbackFixed(
  cp: CallPut, S: number, K: number, extremum: number, tau: number, r: number, b0: number, sigma: number,
): number {
  const M = extremum;
  if (tau <= 0) return cp === "call" ? Math.max(M - K, 0) : Math.max(K - M, 0);
  const b = safeCarry(b0);
  const v = sigma * Math.sqrt(tau);
  const df = Math.exp((b - r) * tau);
  const dfr = Math.exp(-r * tau);
  const k = (2 * b) / (sigma * sigma);
  const sq = Math.sqrt(tau);
  if (cp === "call") {
    if (K > M) {
      const d1 = (Math.log(S / K) + (b + 0.5 * sigma * sigma) * tau) / v;
      const d2 = d1 - v;
      return (
        S * df * normCdf(d1) - K * dfr * normCdf(d2) +
        S * dfr * (1 / k) * (-Math.pow(S / K, -k) * normCdf(d1 - (2 * b / sigma) * sq) + Math.exp(b * tau) * normCdf(d1))
      );
    }
    const e1 = (Math.log(S / M) + (b + 0.5 * sigma * sigma) * tau) / v;
    const e2 = e1 - v;
    return (
      dfr * (M - K) + S * df * normCdf(e1) - M * dfr * normCdf(e2) +
      S * dfr * (1 / k) * (-Math.pow(S / M, -k) * normCdf(e1 - (2 * b / sigma) * sq) + Math.exp(b * tau) * normCdf(e1))
    );
  }
  if (K < M) {
    const d1 = (Math.log(S / K) + (b + 0.5 * sigma * sigma) * tau) / v;
    const d2 = d1 - v;
    return (
      K * dfr * normCdf(-d2) - S * df * normCdf(-d1) +
      S * dfr * (1 / k) * (Math.pow(S / K, -k) * normCdf(-d1 + (2 * b / sigma) * sq) - Math.exp(b * tau) * normCdf(-d1))
    );
  }
  const f1 = (Math.log(S / M) + (b + 0.5 * sigma * sigma) * tau) / v;
  const f2 = f1 - v;
  return (
    dfr * (K - M) - S * df * normCdf(-f1) + M * dfr * normCdf(-f2) +
    S * dfr * (1 / k) * (Math.pow(S / M, -k) * normCdf(-f1 + (2 * b / sigma) * sq) - Math.exp(b * tau) * normCdf(-f1))
  );
}

// ---------------------------------------------------------------------------
// Compound options (Geske 1979; Haug §4.4). An option (strike K1, expiry t1)
// on an option (strike K2, expiry T2 > t1).
// ---------------------------------------------------------------------------

export type CompoundKind = "call-on-call" | "put-on-call" | "call-on-put" | "put-on-put";

export function compound(
  kind: CompoundKind, S: number, K1: number, t1: number, K2: number, T2: number,
  r: number, b: number, sigma: number,
): number {
  const underCp: CallPut = kind.endsWith("call") ? "call" : "put";
  const outerCall = kind.startsWith("call");
  if (t1 <= 0) {
    const inner = gbs(underCp, S, K2, T2, r, b, sigma);
    return outerCall ? Math.max(inner - K1, 0) : Math.max(K1 - inner, 0);
  }
  const tau2 = T2 - t1;
  // Critical price S* where the underlying option is worth K1 at t1.
  let lo = 1e-8;
  let hi = Math.max(S, K2) * 8;
  const f = (x: number) => gbs(underCp, x, K2, tau2, r, b, sigma) - K1;
  // Calls increase in S, puts decrease: bisection with orientation.
  const inc = underCp === "call";
  for (let i = 0; i < 200; i++) {
    const mid = 0.5 * (lo + hi);
    const fm = f(mid);
    if ((fm > 0) === inc) hi = mid;
    else lo = mid;
  }
  const Sc = 0.5 * (lo + hi);

  const sq1 = sigma * Math.sqrt(t1);
  const sq2 = sigma * Math.sqrt(T2);
  const rho = Math.sqrt(t1 / T2);
  const y1 = (Math.log(S / Sc) + (b + 0.5 * sigma * sigma) * t1) / sq1;
  const y2 = y1 - sq1;
  const z1 = (Math.log(S / K2) + (b + 0.5 * sigma * sigma) * T2) / sq2;
  const z2 = z1 - sq2;
  const df2 = Math.exp((b - r) * T2);
  const dr2 = Math.exp(-r * T2);
  const dr1 = Math.exp(-r * t1);

  switch (kind) {
    case "call-on-call":
      return S * df2 * bivNormCdf(z1, y1, rho) - K2 * dr2 * bivNormCdf(z2, y2, rho) - K1 * dr1 * normCdf(y2);
    case "put-on-call":
      return K2 * dr2 * bivNormCdf(z2, -y2, -rho) - S * df2 * bivNormCdf(z1, -y1, -rho) + K1 * dr1 * normCdf(-y2);
    case "call-on-put":
      return K2 * dr2 * bivNormCdf(-z2, -y2, rho) - S * df2 * bivNormCdf(-z1, -y1, rho) - K1 * dr1 * normCdf(-y2);
    case "put-on-put":
      return S * df2 * bivNormCdf(-z1, y1, -rho) - K2 * dr2 * bivNormCdf(-z2, y2, -rho) + K1 * dr1 * normCdf(y2);
  }
}

// ---------------------------------------------------------------------------
// Two-asset closed forms.
// ---------------------------------------------------------------------------

/** Margrabe (1978): option to exchange asset 2 for asset 1, payoff max(S1 - S2, 0). */
export function margrabe(
  S1: number, S2: number, tau: number, r: number, b1: number, b2: number,
  sigma1: number, sigma2: number, rho: number,
): number {
  if (tau <= 0) return Math.max(S1 - S2, 0);
  const sigma = Math.sqrt(Math.max(sigma1 * sigma1 + sigma2 * sigma2 - 2 * rho * sigma1 * sigma2, 1e-16));
  const v = sigma * Math.sqrt(tau);
  const d1 = (Math.log(S1 / S2) + (b1 - b2 + 0.5 * sigma * sigma) * tau) / v;
  const d2 = d1 - v;
  return S1 * Math.exp((b1 - r) * tau) * normCdf(d1) - S2 * Math.exp((b2 - r) * tau) * normCdf(d2);
}

/**
 * Exchange option with the exchange decided at `tau` but settled at
 * `tauPay >= tau`. With deterministic rates the deferred settlement simply
 * discounts the decided payoff over the deferral period.
 */
export function deferredExchange(
  S1: number, S2: number, tau: number, tauPay: number, r: number, b1: number, b2: number,
  sigma1: number, sigma2: number, rho: number,
): number {
  const defer = Math.max(tauPay - tau, 0);
  return Math.exp(-r * defer) * margrabe(S1, S2, tau, r, b1, b2, sigma1, sigma2, rho);
}

/** Stulz (1982): call on the minimum of two assets, payoff max(min(S1,S2) - K, 0). */
export function callOnMin(
  S1: number, S2: number, K: number, tau: number, r: number, b1: number, b2: number,
  sigma1: number, sigma2: number, rho: number,
): number {
  if (tau <= 0) return Math.max(Math.min(S1, S2) - K, 0);
  if (K <= 0) {
    // PV of min(S1,S2) = PV(S2) - Margrabe(receive S2 pay S1)... via min = S2 - max(S2-S1,0).
    return S2 * Math.exp((b2 - r) * tau) - margrabe(S2, S1, tau, r, b2, b1, sigma2, sigma1, rho);
  }
  const sigma = Math.sqrt(Math.max(sigma1 * sigma1 + sigma2 * sigma2 - 2 * rho * sigma1 * sigma2, 1e-16));
  const v = sigma * Math.sqrt(tau);
  const d = (Math.log(S1 / S2) + (b1 - b2 + 0.5 * sigma * sigma) * tau) / v;
  const y1 = (Math.log(S1 / K) + (b1 + 0.5 * sigma1 * sigma1) * tau) / (sigma1 * Math.sqrt(tau));
  const y2 = (Math.log(S2 / K) + (b2 + 0.5 * sigma2 * sigma2) * tau) / (sigma2 * Math.sqrt(tau));
  const rho1 = (rho * sigma2 - sigma1) / sigma;
  const rho2 = (rho * sigma1 - sigma2) / sigma;
  return (
    S1 * Math.exp((b1 - r) * tau) * bivNormCdf(y1, -d, rho1) +
    S2 * Math.exp((b2 - r) * tau) * bivNormCdf(y2, d - v, rho2) -
    K * Math.exp(-r * tau) * bivNormCdf(y1 - sigma1 * Math.sqrt(tau), y2 - sigma2 * Math.sqrt(tau), rho)
  );
}

/** Call on the maximum of two assets: cmax = c(S1) + c(S2) - cmin. */
export function callOnMax(
  S1: number, S2: number, K: number, tau: number, r: number, b1: number, b2: number,
  sigma1: number, sigma2: number, rho: number,
): number {
  if (tau <= 0) return Math.max(Math.max(S1, S2) - K, 0);
  if (K <= 0) {
    return S1 * Math.exp((b1 - r) * tau) + margrabe(S2, S1, tau, r, b2, b1, sigma2, sigma1, rho);
  }
  return (
    gbs("call", S1, K, tau, r, b1, sigma1) + gbs("call", S2, K, tau, r, b2, sigma2) -
    callOnMin(S1, S2, K, tau, r, b1, b2, sigma1, sigma2, rho)
  );
}

/** Puts on min/max via max(K - X, 0) = K - X + max(X - K, 0) with X the extremum. */
export function putOnMin(
  S1: number, S2: number, K: number, tau: number, r: number, b1: number, b2: number,
  sigma1: number, sigma2: number, rho: number,
): number {
  if (tau <= 0) return Math.max(K - Math.min(S1, S2), 0);
  const pvMin = callOnMin(S1, S2, 0, tau, r, b1, b2, sigma1, sigma2, rho);
  return K * Math.exp(-r * tau) - pvMin + callOnMin(S1, S2, K, tau, r, b1, b2, sigma1, sigma2, rho);
}

export function putOnMax(
  S1: number, S2: number, K: number, tau: number, r: number, b1: number, b2: number,
  sigma1: number, sigma2: number, rho: number,
): number {
  if (tau <= 0) return Math.max(K - Math.max(S1, S2), 0);
  const pvMax = callOnMax(S1, S2, 0, tau, r, b1, b2, sigma1, sigma2, rho);
  return K * Math.exp(-r * tau) - pvMax + callOnMax(S1, S2, K, tau, r, b1, b2, sigma1, sigma2, rho);
}

// ---------------------------------------------------------------------------
// Cross-currency family (domestic investor).
// ---------------------------------------------------------------------------

/**
 * Option on a foreign asset struck in domestic currency. The composite asset
 * X*Sf (foreign asset converted at the spot FX rate) is a domestic traded
 * asset paying yield q, so the GBS applies with the composite volatility.
 */
export function foreignStruckDomestic(
  cp: CallPut, Sf: number, X: number, K: number, tau: number, rd: number, q: number,
  sigmaS: number, sigmaX: number, rhoSX: number,
): number {
  const sigma = Math.sqrt(Math.max(sigmaS * sigmaS + sigmaX * sigmaX + 2 * rhoSX * sigmaS * sigmaX, 1e-16));
  return gbs(cp, X * Sf, K, tau, rd, rd - q, sigma);
}

/**
 * Quanto: pays Xbar * max(Sf - K, 0) in domestic currency (fixed conversion
 * rate Xbar). Under the domestic measure the foreign asset drifts at
 * rf - q - rho*sigmaS*sigmaX.
 */
export function quanto(
  cp: CallPut, Sf: number, K: number, tau: number, rd: number, rf: number, q: number,
  sigmaS: number, sigmaX: number, rhoSX: number, Xbar: number,
): number {
  const bq = rf - q - rhoSX * sigmaS * sigmaX;
  return Xbar * gbs(cp, Sf, K, tau, rd, bq, sigmaS);
}

// ---------------------------------------------------------------------------
// Geometric-average Asian (Kemna & Vorst 1990, continuous averaging over the
// whole life): GBS with adjusted volatility and carry.
// ---------------------------------------------------------------------------

export function geometricAsian(
  cp: CallPut, S: number, K: number, tau: number, r: number, b: number, sigma: number,
): number {
  if (tau <= 0) return intrinsic(cp, S, K);
  const sigmaA = sigma / Math.sqrt(3);
  const bA = 0.5 * (b - (sigma * sigma) / 6);
  return gbs(cp, S, K, tau, r, bA, sigmaA);
}
