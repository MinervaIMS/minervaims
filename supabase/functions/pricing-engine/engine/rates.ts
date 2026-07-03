// ---------------------------------------------------------------------------
// PayoffLab pricing engine — interest-rate instruments & short-rate models.
//
// A discount curve P(0,T) is built from the selected short-rate model and
// the current short rate r (which is also the variable swept on the rate
// x-axis). Caps/floors and swaptions are priced with Black (1976) on the
// curve's forward rates. Zero-coupon bond closed forms: Merton (1973),
// Vasicek (1977), Cox–Ingersoll–Ross (1985).
// Server-side only; see engine/math.ts header.
// ---------------------------------------------------------------------------

import { normCdf } from "./math.ts";
import type { CallPut } from "./gbs.ts";

export type RateModel =
  | { kind: "constant" }
  | { kind: "merton"; a: number; sigmaR: number }
  | { kind: "vasicek"; a: number; theta: number; sigmaR: number }
  | { kind: "cir"; a: number; theta: number; sigmaR: number };

export type Discount = (T: number) => number;

/** Zero-coupon bond curve P(0,T) for the given model at short rate r. */
export function discountCurve(model: RateModel, r: number): Discount {
  switch (model.kind) {
    case "constant":
      return (T) => Math.exp(-r * T);
    case "merton": {
      const { a, sigmaR } = model;
      return (T) => Math.exp(-r * T - (a * T * T) / 2 + (sigmaR * sigmaR * T * T * T) / 6);
    }
    case "vasicek": {
      const { a, theta, sigmaR } = model;
      return (T) => {
        if (a <= 1e-10) return Math.exp(-r * T);
        const B = (1 - Math.exp(-a * T)) / a;
        const A = Math.exp(((B - T) * (a * a * theta - (sigmaR * sigmaR) / 2)) / (a * a) - (sigmaR * sigmaR * B * B) / (4 * a));
        return A * Math.exp(-B * r);
      };
    }
    case "cir": {
      const { a, theta, sigmaR } = model;
      return (T) => {
        const g = Math.sqrt(a * a + 2 * sigmaR * sigmaR);
        const eg = Math.exp(g * T);
        const den = (g + a) * (eg - 1) + 2 * g;
        const B = (2 * (eg - 1)) / den;
        const A = Math.pow((2 * g * Math.exp(((a + g) * T) / 2)) / den, (2 * a * theta) / (sigmaR * sigmaR));
        return A * Math.exp(-B * Math.max(r, 0));
      };
    }
  }
}

/** Simple forward rate over [T1, T2] implied by the curve. */
export function forwardRate(P: Discount, T1: number, T2: number): number {
  const tau = T2 - T1;
  return (P(T1) / P(T2) - 1) / tau;
}

/** Black (1976) undiscounted option value on a forward F. */
function blackUndiscounted(cp: CallPut, F: number, K: number, sigma: number, tFix: number): number {
  if (tFix <= 0 || sigma <= 0 || F <= 0 || K <= 0) {
    return cp === "call" ? Math.max(F - K, 0) : Math.max(K - F, 0);
  }
  const v = sigma * Math.sqrt(tFix);
  const d1 = (Math.log(F / K) + 0.5 * v * v) / v;
  const d2 = d1 - v;
  if (cp === "call") return F * normCdf(d1) - K * normCdf(d2);
  return K * normCdf(-d2) - F * normCdf(-d1);
}

/**
 * Forward rate agreement, payer (pays fixed K, receives the float fixing)
 * on [T1, T2], settled at T2: V = N * tau * (f - K) * P(0,T2).
 */
export function fra(P: Discount, notional: number, K: number, T1: number, T2: number): number {
  const tau = T2 - T1;
  if (tau <= 0) return 0;
  return notional * tau * (forwardRate(P, T1, T2) - K) * P(T2);
}

/**
 * Plain-vanilla interest-rate swap, payer (pay fixed K, receive float),
 * payments every `freq` years out to `tenor`:
 * V = N * [1 - P(0,Tn) - K * sum(tau_i * P(0,T_i))].
 */
export function swap(P: Discount, notional: number, K: number, tenor: number, freq: number): number {
  const n = Math.max(1, Math.round(tenor / freq));
  let annuity = 0;
  for (let i = 1; i <= n; i++) annuity += freq * P(i * freq);
  return notional * (1 - P(n * freq) - K * annuity);
}

/** Fair (par) swap rate for the same schedule. */
export function parSwapRate(P: Discount, tenor: number, freq: number): number {
  const n = Math.max(1, Math.round(tenor / freq));
  let annuity = 0;
  for (let i = 1; i <= n; i++) annuity += freq * P(i * freq);
  return (1 - P(n * freq)) / annuity;
}

/**
 * Cap or floor as a strip of Black caplets/floorlets on the curve's forward
 * rates. Resets at i*freq (i = 1..n-1), payment one period later; the
 * already-fixed first period is excluded, as is market practice.
 */
export function capFloor(
  P: Discount, kind: "cap" | "floor", notional: number, K: number,
  tenor: number, freq: number, sigmaBlack: number,
): number {
  const n = Math.max(1, Math.round(tenor / freq));
  const cp: CallPut = kind === "cap" ? "call" : "put";
  let v = 0;
  for (let i = 1; i < n; i++) {
    const tFix = i * freq;
    const tPay = (i + 1) * freq;
    const f = forwardRate(P, tFix, tPay);
    v += notional * freq * P(tPay) * blackUndiscounted(cp, f, K, sigmaBlack, tFix);
  }
  return v;
}

/**
 * European swaption (Black on the forward swap rate). `expiry` is the option
 * expiry T0; the underlying swap runs from T0 for `tenor` years.
 */
export function swaption(
  P: Discount, kind: "payer" | "receiver", notional: number, K: number,
  expiry: number, tenor: number, freq: number, sigmaBlack: number,
): number {
  const n = Math.max(1, Math.round(tenor / freq));
  let annuity = 0;
  for (let i = 1; i <= n; i++) annuity += freq * P(expiry + i * freq);
  const F = (P(expiry) - P(expiry + n * freq)) / annuity;
  const cp: CallPut = kind === "payer" ? "call" : "put";
  return notional * annuity * blackUndiscounted(cp, F, K, sigmaBlack, expiry);
}

/**
 * Variance swap: pays N_var * (realised variance - Kvar) at T. Fair value
 * uses the model's expected integrated variance over [0, T] (exact under
 * constant vol and Heston; an average for a deterministic term structure).
 */
export function varianceSwap(
  P: Discount, notionalVar: number, Kvar: number, T: number, expectedVar: number,
): number {
  return notionalVar * (expectedVar - Kvar) * P(T);
}

/**
 * Volatility swap: pays N_vol * (realised vol - Kvol). Uses the standard
 * convexity-corrected approximation E[sqrt(V)] ~ sqrt(E V) * (1 - Var(V) /
 * (8 E[V]^2)); with varOfVar = 0 this is the zeroth-order sqrt rule.
 */
export function volatilitySwap(
  P: Discount, notionalVol: number, Kvol: number, T: number, expectedVar: number, varOfVar = 0,
): number {
  const ev = Math.max(expectedVar, 1e-12);
  const expVol = Math.sqrt(ev) * Math.max(1 - varOfVar / (8 * ev * ev), 0.5);
  return notionalVol * (expVol - Kvol) * P(T);
}

/** Expected integrated variance / T under Heston. */
export function hestonExpectedVar(v0: number, kappa: number, thetaV: number, T: number): number {
  if (kappa * T < 1e-10) return v0;
  return thetaV + ((v0 - thetaV) * (1 - Math.exp(-kappa * T))) / (kappa * T);
}

/**
 * Equity total-return swap, receiver (receive total return on the equity,
 * pay fixed K on the notional, net-settled at T with notional exchange):
 * V = N * [ S/S0 - P(0,T) - K * sum(tau_i * P(0,T_i)) ].
 * At inception (S = S0) the fair K makes V = 0. Dividends are assumed
 * reinvested in the equity leg (total return).
 */
export function totalReturnSwap(
  P: Discount, notional: number, K: number, S: number, S0: number, tenor: number, freq: number,
): number {
  const n = Math.max(1, Math.round(tenor / freq));
  let annuity = 0;
  for (let i = 1; i <= n; i++) annuity += freq * P(i * freq);
  return notional * (S / S0 - P(n * freq) - K * annuity);
}
