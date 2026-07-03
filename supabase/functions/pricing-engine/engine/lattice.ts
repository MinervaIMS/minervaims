// ---------------------------------------------------------------------------
// PayoffLab pricing engine — binomial & trinomial lattices.
// Cox–Ross–Rubinstein (1979), Jarrow–Rudd (1983) and Boyle (1986) trees on
// the generalised cost-of-carry model. Used for American exercise, discrete
// dividends (escrowed), and convergence demonstrations.
// Server-side only; see engine/math.ts header.
// ---------------------------------------------------------------------------

import { intrinsic } from "./gbs.ts";
import type { CallPut } from "./gbs.ts";

export type TreeFlavour = "crr" | "jr" | "trinomial";

export interface TreeSpec {
  flavour: TreeFlavour;
  steps: number;
  american: boolean;
  /** Optional single discrete cash dividend (escrowed-dividend treatment). */
  divAmount?: number;
  divTime?: number;
}

/**
 * Lattice price of a vanilla option under the generalised model.
 * The escrowed-dividend adjustment prices the tree on S minus the PV of the
 * dividend, adding it back only for the American early-exercise intrinsic.
 */
export function treePrice(
  cp: CallPut, S0: number, K: number, tau: number, r: number, b: number, sigma: number, spec: TreeSpec,
): number {
  if (tau <= 0) return intrinsic(cp, S0, K);
  const n = Math.max(2, Math.min(2000, Math.floor(spec.steps)));
  const dt = tau / n;
  const df = Math.exp(-r * dt);

  // Escrowed dividend: run the diffusion on the ex-dividend spot.
  let S = S0;
  const hasDiv = (spec.divAmount ?? 0) > 0 && (spec.divTime ?? -1) > 0 && (spec.divTime as number) < tau;
  const divAmount = hasDiv ? (spec.divAmount as number) : 0;
  const divTime = hasDiv ? (spec.divTime as number) : 0;
  if (hasDiv) S = S0 - divAmount * Math.exp(-r * divTime);
  if (S <= 0) S = 1e-8;

  if (spec.flavour === "trinomial") {
    // Boyle trinomial with stretch parameter lambda = sqrt(3/2).
    const lam = Math.sqrt(1.5);
    const dx = lam * sigma * Math.sqrt(dt);
    const nu = b - 0.5 * sigma * sigma;
    const pu = 0.5 * ((sigma * sigma * dt + nu * nu * dt * dt) / (dx * dx) + (nu * dt) / dx);
    const pd = 0.5 * ((sigma * sigma * dt + nu * nu * dt * dt) / (dx * dx) - (nu * dt) / dx);
    const pm = 1 - pu - pd;
    const m = 2 * n + 1;
    const vals = new Float64Array(m);
    const up = Math.exp(dx);
    for (let j = 0; j < m; j++) {
      const Sj = S * Math.pow(up, j - n);
      vals[j] = intrinsic(cp, Sj + divCarry(divAmount, divTime, tau, tau, r), K);
    }
    for (let step = n - 1; step >= 0; step--) {
      const t = step * dt;
      const carry = divCarry(divAmount, divTime, t, tau, r);
      // Ascending in-place update: carry the pre-update value of the node
      // below so the stencil always reads step+1 values.
      let below = vals[-step - 1 + n];
      for (let j = -step; j <= step; j++) {
        const idx = j + n;
        const cur = vals[idx];
        let v = df * (pu * vals[idx + 1] + pm * cur + pd * below);
        if (spec.american) {
          const Sj = S * Math.pow(up, j);
          v = Math.max(v, intrinsic(cp, Sj + carry, K));
        }
        below = cur;
        vals[idx] = v;
      }
    }
    return vals[n];
  }

  // Binomial: CRR or Jarrow–Rudd (equal-probability) parameterisation.
  let u: number;
  let d: number;
  let p: number;
  if (spec.flavour === "jr") {
    const nu = (b - 0.5 * sigma * sigma) * dt;
    u = Math.exp(nu + sigma * Math.sqrt(dt));
    d = Math.exp(nu - sigma * Math.sqrt(dt));
    p = 0.5;
  } else {
    u = Math.exp(sigma * Math.sqrt(dt));
    d = 1 / u;
    p = (Math.exp(b * dt) - d) / (u - d);
  }
  p = Math.min(1, Math.max(0, p));
  const vals = new Float64Array(n + 1);
  for (let j = 0; j <= n; j++) {
    const Sj = S * Math.pow(u, j) * Math.pow(d, n - j);
    vals[j] = intrinsic(cp, Sj + divCarry(divAmount, divTime, tau, tau, r), K);
  }
  for (let step = n - 1; step >= 0; step--) {
    const t = step * dt;
    const carry = divCarry(divAmount, divTime, t, tau, r);
    for (let j = 0; j <= step; j++) {
      let v = df * (p * vals[j + 1] + (1 - p) * vals[j]);
      if (spec.american) {
        const Sj = S * Math.pow(u, j) * Math.pow(d, step - j);
        v = Math.max(v, intrinsic(cp, Sj + carry, K));
      }
      vals[j] = v;
    }
  }
  return vals[0];
}

/** PV (as of node time t) of a dividend not yet paid; 0 once past or absent. */
function divCarry(divAmount: number, divTime: number, t: number, _tau: number, r: number): number {
  if (divAmount <= 0) return 0;
  return t < divTime ? divAmount * Math.exp(-r * (divTime - t)) : 0;
}
