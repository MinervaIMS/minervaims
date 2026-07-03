// ---------------------------------------------------------------------------
// PayoffLab pricing engine — volatility models.
//
// Every volatility model resolves to either (a) an effective Black–Scholes
// volatility for the instrument's strike and maturity (constant, term
// structure, GARCH forecast, SABR, implied smile) or (b) a simulation
// dynamic (Heston, Dupire local vol) consumed by the Monte Carlo engine.
// References: Hagan et al. (2002) for SABR; Hull ch. 23 for the GARCH(1,1)
// variance forecast; Gatheral (2006) for the Dupire local variance in
// implied-total-variance form.
// Server-side only; see engine/math.ts header.
// ---------------------------------------------------------------------------

import { clamp } from "./math.ts";
import type { HestonParams, LocalVolFn } from "./mc.ts";

export type VolModel =
  | { kind: "constant" }
  | { kind: "term"; points: Array<{ t: number; sigma: number }> }
  | { kind: "garch"; sigmaLong: number; persistence: number }
  | { kind: "sabr"; alpha: number; beta: number; rhoSabr: number; nu: number }
  | { kind: "smile"; skew: number; curv: number }
  | { kind: "heston"; kappa: number; thetaV: number; xi: number; rhoSV: number }
  | { kind: "localvol"; skew: number; curv: number };

export function isSimulationVol(m: VolModel): boolean {
  return m.kind === "heston" || m.kind === "localvol";
}

export function hestonParams(m: VolModel, sigma: number): HestonParams {
  if (m.kind !== "heston") throw new Error("not heston");
  return { kappa: m.kappa, thetaV: m.thetaV, xi: m.xi, rhoSV: m.rhoSV, v0: sigma * sigma };
}

/** Total implied variance w(T) from a term structure of implied vols. */
function termTotalVariance(points: Array<{ t: number; sigma: number }>, T: number): number {
  const pts = [...points].filter((p) => p.t > 0 && p.sigma > 0).sort((a, b) => a.t - b.t);
  if (pts.length === 0) return 0;
  const w = (i: number) => pts[i].t * pts[i].sigma * pts[i].sigma;
  if (T <= pts[0].t) return (w(0) * T) / pts[0].t; // flat forward variance before first pillar
  for (let i = 1; i < pts.length; i++) {
    if (T <= pts[i].t) {
      const f = (T - pts[i - 1].t) / (pts[i].t - pts[i - 1].t);
      return w(i - 1) + f * (w(i) - w(i - 1));
    }
  }
  const last = pts.length - 1;
  // extrapolate at the last pillar's instantaneous forward variance
  const fwdVar = last === 0 ? w(0) / pts[0].t : (w(last) - w(last - 1)) / (pts[last].t - pts[last - 1].t);
  return w(last) + fwdVar * (T - pts[last].t);
}

/** Instantaneous vol sigma(t) implied by the term structure (for MC). */
export function termInstantaneousVol(points: Array<{ t: number; sigma: number }>, t: number): number {
  const h = 1 / 365;
  const dw = termTotalVariance(points, t + h) - termTotalVariance(points, Math.max(t, 0));
  return Math.sqrt(Math.max(dw / h, 1e-8));
}

/** Hagan et al. (2002) lognormal SABR implied volatility. */
export function sabrImpliedVol(F: number, K: number, T: number, alpha: number, beta: number, rho: number, nu: number): number {
  if (F <= 0 || K <= 0 || T <= 0) return 0;
  const omb = 1 - beta;
  const FK = F * K;
  const logFK = Math.log(F / K);
  const fkPow = Math.pow(FK, omb / 2);
  const corr = (tRef: number) =>
    1 + tRef * (((omb * omb) / 24) * ((alpha * alpha) / Math.pow(FK, omb)) + (rho * beta * nu * alpha) / (4 * fkPow) + ((2 - 3 * rho * rho) / 24) * nu * nu);
  if (Math.abs(logFK) < 1e-10) {
    return (alpha / Math.pow(F, omb)) * corr(T);
  }
  const z = (nu / alpha) * fkPow * logFK;
  const xz = Math.log((Math.sqrt(1 - 2 * rho * z + z * z) + z - rho) / (1 - rho));
  const denom = fkPow * (1 + ((omb * omb) / 24) * logFK * logFK + (Math.pow(omb, 4) / 1920) * Math.pow(logFK, 4));
  const zOverX = Math.abs(xz) < 1e-12 ? 1 : z / xz;
  return (alpha / denom) * zOverX * corr(T);
}

/**
 * Parametric implied smile in log-moneyness k = ln(K/F):
 * sigma(k) = sigmaAtm + skew*k + curv*k^2, floored away from zero.
 * Used both by the "implied smile" input and as the surface behind the
 * Dupire local-volatility model.
 */
export function smileVol(sigmaAtm: number, skew: number, curv: number, k: number): number {
  return clamp(sigmaAtm + skew * k + curv * k * k, 0.01, 3);
}

/**
 * Effective Black–Scholes vol for an instrument with strike K and maturity T.
 * sigma is the user's headline (ATM) volatility input; F the forward.
 */
export function effectiveVol(model: VolModel, sigma: number, F: number, K: number, T: number): number {
  switch (model.kind) {
    case "constant":
      return sigma;
    case "term": {
      if (T <= 0) return sigma;
      const w = termTotalVariance(model.points, T);
      return w > 0 ? Math.sqrt(w / T) : sigma;
    }
    case "garch": {
      // Hull ch. 23: E[sigma^2_{n+i}] = sigmaL^2 + phi^i (sigma0^2 - sigmaL^2),
      // averaged over the option life (daily steps, 252/yr).
      const phi = clamp(model.persistence, 0, 0.999999);
      const N = Math.max(1, Math.round(T * 252));
      const s0 = sigma * sigma;
      const sL = model.sigmaLong * model.sigmaLong;
      const avg = phi >= 0.999998 ? s0 : sL + ((s0 - sL) * phi * (1 - Math.pow(phi, N))) / (N * (1 - phi));
      return Math.sqrt(Math.max(avg, 1e-8));
    }
    case "sabr":
      return sabrImpliedVol(F, Math.max(K, 1e-8), Math.max(T, 1e-8), model.alpha, model.beta, model.rhoSabr, model.nu);
    case "smile": {
      const k = Math.log(Math.max(K, 1e-8) / F);
      return smileVol(sigma, model.skew, model.curv, k);
    }
    case "heston":
    case "localvol":
      return sigma; // handled by simulation; effective vol used only as a fallback
  }
}

/**
 * Dupire local volatility from the parametric smile surface, in Gatheral's
 * total-variance form. The surface is time-homogeneous in log-moneyness
 * (w(y,T) = T * sigma(y)^2), so the T- and y-derivatives are analytic.
 * `forwardAt(t)` supplies F(t) = S0 e^{b t}.
 */
export function dupireLocalVol(
  sigmaAtm: number, skew: number, curv: number, forwardAt: (t: number) => number,
): LocalVolFn {
  const sig = (y: number) => smileVol(sigmaAtm, skew, curv, y);
  const dsig = (y: number) => {
    const raw = skew + 2 * curv * y;
    const s = sigmaAtm + skew * y + curv * y * y;
    return s <= 0.01 || s >= 3 ? 0 : raw; // derivative of the clamped smile
  };
  const d2sig = (y: number) => {
    const s = sigmaAtm + skew * y + curv * y * y;
    return s <= 0.01 || s >= 3 ? 0 : 2 * curv;
  };
  return (S: number, t: number) => {
    const T = Math.max(t, 1e-4);
    const y = Math.log(Math.max(S, 1e-8) / forwardAt(T));
    const s = sig(y);
    const sp = dsig(y);
    const spp = d2sig(y);
    const w = T * s * s;
    const dwdT = s * s;
    const dwdy = T * 2 * s * sp;
    const d2wdy2 = 2 * T * (sp * sp + s * spp);
    const denom =
      1 - (y / w) * dwdy + 0.25 * (-0.25 - 1 / w + (y * y) / (w * w)) * dwdy * dwdy + 0.5 * d2wdy2;
    const lv2 = dwdT / Math.max(denom, 0.1);
    return clamp(Math.sqrt(Math.max(lv2, 1e-6)), 0.01, 3);
  };
}

/** Expected average variance over [0,T] for the variance-swap leg. */
export function expectedVariance(model: VolModel, sigma: number, T: number): number {
  switch (model.kind) {
    case "heston": {
      const v0 = sigma * sigma;
      if (model.kappa * T < 1e-10) return v0;
      return model.thetaV + ((v0 - model.thetaV) * (1 - Math.exp(-model.kappa * T))) / (model.kappa * T);
    }
    case "term": {
      const w = termTotalVariance(model.points, Math.max(T, 1e-8));
      return w / Math.max(T, 1e-8);
    }
    case "garch": {
      const s = effectiveVol(model, sigma, 1, 1, T);
      return s * s;
    }
    default:
      return sigma * sigma;
  }
}
