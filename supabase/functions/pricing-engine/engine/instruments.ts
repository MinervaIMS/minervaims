// ---------------------------------------------------------------------------
// PayoffLab pricing engine — instrument registry.
//
// Every instrument exposes one uniform interface: a present value at an
// arbitrary market state (S, t, r, sigma, q) and, where meaningful, a
// terminal payoff. The portfolio layer sweeps market states over the chosen
// x-axis and differentiates values for Greeks, so a single correct `value`
// implementation per instrument powers every curve in the app.
//
// Valuation conventions (documented in the client's Learn drawer):
//  - t is calendar time elapsed from "now"; each leg's remaining life is
//    tau = max(T - t, 0).
//  - Path-dependent instruments (Asians, lookbacks priced mid-life) are
//    valued as freshly issued over their remaining life: the running
//    average/extremum is taken as not yet accrued.
//  - Two-asset instruments sweep S as asset 1; asset 2 stays at its input.
// Server-side only; see engine/math.ts header.
// ---------------------------------------------------------------------------

import {
  bachelier, digitalAsset, digitalCash, forwardStart, gbs, intrinsic,
  mertonJump, simpleChooser,
} from "./gbs.ts";
import type { CallPut } from "./gbs.ts";
import {
  barrier, callOnMax, callOnMin, compound,
  deferredExchange, foreignStruckDomestic, geometricAsian, lookbackFixed,
  lookbackFloating, margrabe, putOnMax, putOnMin, quanto,
} from "./exotics.ts";
import type { BarrierKind, CompoundKind } from "./exotics.ts";
import { treePrice } from "./lattice.ts";
import type { TreeFlavour } from "./lattice.ts";
import {
  arithmeticAsianMc, kirkSpread, mc1, mc2, NormalCube, productOption,
} from "./mc.ts";
import type { McDynamics } from "./mc.ts";
import {
  capFloor, discountCurve, fra, hestonExpectedVar, parSwapRate, swap,
  swaption, totalReturnSwap, varianceSwap, volatilitySwap,
} from "./rates.ts";
import type { RateModel } from "./rates.ts";
import { dupireLocalVol, effectiveVol, expectedVariance, termInstantaneousVol } from "./vol.ts";
import type { VolModel } from "./vol.ts";

export type PricingModel =
  | "auto" | "black-scholes" | "bachelier" | "merton-jump"
  | "binomial-crr" | "binomial-jr" | "trinomial";

export interface ModelSettings {
  pricing: PricingModel;
  treeSteps: number;
  jump: { lambda: number; muJ: number; deltaJ: number };
  vol: VolModel;
  rates: RateModel;
  mcPaths: number;
  mcSteps: number;
  seed: number;
}

export interface Market {
  S: number;
  t: number;      // calendar time elapsed (years)
  r: number;
  sigma: number;  // headline (ATM) volatility input
  q: number;      // dividend / convenience yield of the primary underlying
}

export type LegParams = Record<string, number | string>;

export interface LegSpec {
  instrument: string;
  side: 1 | -1;
  qty: number;
  params: LegParams;
}

/** Shared per-request evaluation environment (MC cube cache, notes). */
export class EvalEnv {
  readonly model: ModelSettings;
  /** Reference spot (the chart's fixed S input) for Bachelier vol mapping. */
  readonly S0: number;
  readonly notes = new Set<string>();
  private cubes = new Map<string, NormalCube>();

  constructor(model: ModelSettings, S0: number) {
    this.model = model;
    this.S0 = S0;
  }

  cube(tag: string, paths: number, steps: number): NormalCube {
    const key = `${tag}:${paths}:${steps}:${this.model.seed}`;
    let c = this.cubes.get(key);
    if (!c) {
      // Distinct deterministic seeds per stream keep streams independent.
      const seedOffset = tag === "a" ? 0 : tag === "b" ? 7919 : 104729;
      c = new NormalCube(paths, steps, this.model.seed + seedOffset);
      this.cubes.set(key, c);
    }
    return c;
  }
}

const num = (p: LegParams, k: string, dflt: number): number => {
  const v = p[k];
  return typeof v === "number" && isFinite(v) ? v : dflt;
};
const str = (p: LegParams, k: string, dflt: string): string => {
  const v = p[k];
  return typeof v === "string" ? v : dflt;
};
const cpOf = (p: LegParams): CallPut => (str(p, "cp", "call") === "put" ? "put" : "call");

export interface InstrumentImpl {
  /** Remaining-life value of ONE unit at the market state. */
  value(p: LegParams, m: Market, env: EvalEnv): number;
  /** Contract maturity in years (Infinity for perpetual holdings like stock). */
  maturity(p: LegParams): number;
  /** True when a terminal-payoff-vs-S line cannot be drawn (path dependent). */
  pathDependent?: boolean;
  /** True when the instrument is priced by Monte Carlo (heavier grids). */
  usesMc?: boolean;
  /** False when the instrument does not depend on S (pure rate products). */
  usesS?: boolean;
}

const tauOf = (p: LegParams, m: Market): number => Math.max(num(p, "T", 1) - m.t, 0);

/** Effective vol for strike K and remaining life tau under the vol model. */
function effVol(env: EvalEnv, m: Market, b: number, K: number, tau: number): number {
  const F = m.S * Math.exp(b * Math.max(tau, 0));
  return effectiveVol(env.model.vol, m.sigma, F, K, Math.max(tau, 1e-8));
}

/** Vanilla European price honouring the pricing + volatility model choices. */
function euroPrice(cp: CallPut, p: LegParams, m: Market, env: EvalEnv): number {
  const K = num(p, "K", 100);
  const tau = tauOf(p, m);
  const b = m.r - m.q;
  const mod = env.model;
  if (tau <= 0) return intrinsic(cp, m.S, K);

  const vm = mod.vol;
  if (vm.kind === "heston" || vm.kind === "localvol") {
    const dyn = simDynamics(env, m, b);
    const cube = env.cube("a", mod.mcPaths, mod.mcSteps);
    const sign = cp === "call" ? 1 : -1;
    env.notes.add("mc-vanilla");
    return mc1(cube, m.S, tau, m.r, b, dyn, (s) => Math.max(sign * (s.ST - K), 0)).price;
  }
  const sigma = effVol(env, m, b, K, tau);
  switch (mod.pricing) {
    case "bachelier":
      return bachelier(cp, m.S, K, tau, m.r, b, sigma * env.S0);
    case "merton-jump":
      return mertonJump(cp, m.S, K, tau, m.r, b, sigma, mod.jump.lambda, mod.jump.muJ, mod.jump.deltaJ);
    case "binomial-crr":
    case "binomial-jr":
    case "trinomial": {
      const flavour: TreeFlavour = mod.pricing === "trinomial" ? "trinomial" : mod.pricing === "binomial-jr" ? "jr" : "crr";
      return treePrice(cp, m.S, K, tau, m.r, b, sigma, { flavour, steps: mod.treeSteps, american: false });
    }
    default:
      return gbs(cp, m.S, K, tau, m.r, b, sigma);
  }
}

function simDynamics(env: EvalEnv, m: Market, b: number): McDynamics {
  const vm = env.model.vol;
  if (vm.kind === "heston") {
    return {
      kind: "heston",
      params: { kappa: vm.kappa, thetaV: vm.thetaV, xi: vm.xi, rhoSV: vm.rhoSV, v0: m.sigma * m.sigma },
      volCube: env.cube("b", env.model.mcPaths, env.model.mcSteps),
    };
  }
  if (vm.kind === "localvol") {
    const S0 = env.S0;
    return { kind: "localvol", sigmaLoc: dupireLocalVol(m.sigma, vm.skew, vm.curv, (t) => S0 * Math.exp(b * t)) };
  }
  if (vm.kind === "term") {
    return { kind: "gbm-term", sigmaAt: (t) => termInstantaneousVol(vm.points, t) };
  }
  return { kind: "gbm", sigma: m.sigma };
}

function americanPrice(cp: CallPut, p: LegParams, m: Market, env: EvalEnv): number {
  const K = num(p, "K", 100);
  const tau = tauOf(p, m);
  if (tau <= 0) return intrinsic(cp, m.S, K);
  const b = m.r - m.q;
  const sigma = effVol(env, m, b, K, tau);
  const mod = env.model;
  const flavour: TreeFlavour = mod.pricing === "trinomial" ? "trinomial" : mod.pricing === "binomial-jr" ? "jr" : "crr";
  return treePrice(cp, m.S, K, tau, m.r, b, sigma, {
    flavour,
    steps: mod.treeSteps,
    american: true,
    divAmount: num(p, "divAmount", 0),
    divTime: num(p, "divTime", 0),
  });
}

// ---------------------------------------------------------------------------
// Registry.
// ---------------------------------------------------------------------------

export const INSTRUMENTS: Record<string, InstrumentImpl> = {
  // --- building blocks ---
  "cash": {
    // Money-market account: N units accruing at the short rate.
    value: (p, m) => num(p, "notional", 100) * Math.exp(m.r * m.t),
    maturity: () => Infinity,
    usesS: false,
  },
  "stock": {
    value: (_p, m) => m.S,
    maturity: () => Infinity,
  },
  "forward": {
    value: (p, m) => {
      const tau = tauOf(p, m);
      return m.S * Math.exp(-m.q * tau) - num(p, "K", 100) * Math.exp(-m.r * tau);
    },
    maturity: (p) => num(p, "T", 1),
  },
  "future": {
    // Daily settlement: quoted futures price minus the position's price.
    value: (p, m) => m.S * Math.exp((m.r - m.q) * tauOf(p, m)) - num(p, "K", 100),
    maturity: (p) => num(p, "T", 1),
  },

  // --- vanilla ---
  "euro-option": {
    value: (p, m, env) => euroPrice(cpOf(p), p, m, env),
    maturity: (p) => num(p, "T", 1),
  },
  "amer-option": {
    value: (p, m, env) => americanPrice(cpOf(p), p, m, env),
    maturity: (p) => num(p, "T", 1),
  },

  // --- digitals ---
  "digital-cash": {
    value: (p, m, env) => {
      const tau = tauOf(p, m);
      const b = m.r - m.q;
      const K = num(p, "K", 100);
      return digitalCash(cpOf(p), m.S, K, tau, m.r, b, effVol(env, m, b, K, tau), num(p, "payout", 10));
    },
    maturity: (p) => num(p, "T", 1),
  },
  "digital-asset": {
    value: (p, m, env) => {
      const tau = tauOf(p, m);
      const b = m.r - m.q;
      const K = num(p, "K", 100);
      return digitalAsset(cpOf(p), m.S, K, tau, m.r, b, effVol(env, m, b, K, tau));
    },
    maturity: (p) => num(p, "T", 1),
  },

  // --- FX / cross-asset (Garman–Kohlhagen and friends) ---
  "fx-option": {
    // S is the FX spot (domestic per foreign); carry b = r - rf.
    value: (p, m, env) => {
      const tau = tauOf(p, m);
      const b = m.r - num(p, "rf", 0.03);
      const K = num(p, "K", 1.1);
      return gbs(cpOf(p), m.S, K, tau, m.r, b, effVol(env, m, b, K, tau));
    },
    maturity: (p) => num(p, "T", 1),
  },
  "black-option": {
    // Option on a futures/forward price: S is the futures quote, b = 0.
    value: (p, m, env) => {
      const tau = tauOf(p, m);
      const K = num(p, "K", 100);
      return gbs(cpOf(p), m.S, K, tau, m.r, 0, effVol(env, m, 0, K, tau));
    },
    maturity: (p) => num(p, "T", 1),
  },
  "foreign-equity": {
    // Foreign asset S (foreign ccy), struck in domestic at K; X = FX spot.
    value: (p, m) =>
      foreignStruckDomestic(
        cpOf(p), m.S, num(p, "X", 1.1), num(p, "K", 110), tauOf(p, m), m.r, m.q,
        m.sigma, num(p, "sigmaX", 0.1), num(p, "rhoX", 0.3),
      ),
    maturity: (p) => num(p, "T", 1),
  },
  "quanto": {
    value: (p, m) =>
      quanto(
        cpOf(p), m.S, num(p, "K", 100), tauOf(p, m), m.r, num(p, "rf", 0.03), m.q,
        m.sigma, num(p, "sigmaX", 0.1), num(p, "rhoX", 0.3), num(p, "Xbar", 1),
      ),
    maturity: (p) => num(p, "T", 1),
  },
  "exchange": {
    value: (p, m) =>
      margrabe(
        m.S, num(p, "S2", 100), tauOf(p, m), m.r, m.r - m.q, m.r - num(p, "q2", 0),
        m.sigma, num(p, "sigma2", 0.25), num(p, "rho", 0.5),
      ),
    maturity: (p) => num(p, "T", 1),
  },
  "deferred-exchange": {
    value: (p, m) => {
      const tau = tauOf(p, m);
      const tauPay = Math.max(num(p, "Tpay", 1.5) - m.t, tau);
      return deferredExchange(
        m.S, num(p, "S2", 100), tau, tauPay, m.r, m.r - m.q, m.r - num(p, "q2", 0),
        m.sigma, num(p, "sigma2", 0.25), num(p, "rho", 0.5),
      );
    },
    maturity: (p) => num(p, "T", 1),
  },
  "forward-start": {
    value: (p, m, env) => {
      const tStart = Math.max(num(p, "tStart", 0.25) - m.t, 0);
      const tau = tauOf(p, m);
      const b = m.r - m.q;
      const alpha = num(p, "alpha", 1);
      return forwardStart(cpOf(p), m.S, alpha, tStart, tau, m.r, b, effVol(env, m, b, alpha * m.S, tau));
    },
    maturity: (p) => num(p, "T", 1),
  },

  // --- structured optionality ---
  "chooser": {
    value: (p, m, env) => {
      const tChoose = Math.max(num(p, "tChoose", 0.25) - m.t, 0);
      const tau = tauOf(p, m);
      const b = m.r - m.q;
      const K = num(p, "K", 100);
      return simpleChooser(m.S, K, tChoose, tau, m.r, b, effVol(env, m, b, K, tau));
    },
    maturity: (p) => num(p, "T", 1),
  },
  "compound": {
    value: (p, m, env) => {
      const t1 = Math.max(num(p, "t1", 0.5) - m.t, 0);
      const T2 = Math.max(num(p, "T", 1) - m.t, 0);
      const b = m.r - m.q;
      const K2 = num(p, "K2", 100);
      const kind = str(p, "kind", "call-on-call") as CompoundKind;
      return compound(kind, m.S, num(p, "K1", 5), t1, K2, T2, m.r, b, effVol(env, m, b, K2, T2));
    },
    maturity: (p) => num(p, "t1", 0.5), // decision date is the option's expiry
  },

  // --- barriers & lookbacks ---
  "barrier": {
    value: (p, m, env) => {
      const tau = tauOf(p, m);
      const b = m.r - m.q;
      const K = num(p, "K", 100);
      return barrier(
        cpOf(p), str(p, "dir", "down-out") as BarrierKind, m.S, K, num(p, "H", 80),
        tau, m.r, b, effVol(env, m, b, K, tau), num(p, "rebate", 0),
      );
    },
    maturity: (p) => num(p, "T", 1),
  },
  "lookback-float": {
    value: (p, m, env) => {
      const tau = tauOf(p, m);
      const b = m.r - m.q;
      return lookbackFloating(cpOf(p), m.S, m.S, tau, m.r, b, effVol(env, m, b, m.S, tau));
    },
    maturity: (p) => num(p, "T", 1),
    pathDependent: true,
  },
  "lookback-fixed": {
    value: (p, m, env) => {
      const tau = tauOf(p, m);
      const b = m.r - m.q;
      const K = num(p, "K", 100);
      return lookbackFixed(cpOf(p), m.S, K, m.S, tau, m.r, b, effVol(env, m, b, K, tau));
    },
    maturity: (p) => num(p, "T", 1),
    pathDependent: true,
  },
  "rainbow": {
    value: (p, m) => {
      const tau = tauOf(p, m);
      const K = num(p, "K", 100);
      const S2 = num(p, "S2", 100);
      const b1 = m.r - m.q;
      const b2 = m.r - num(p, "q2", 0);
      const s2 = num(p, "sigma2", 0.25);
      const rho = num(p, "rho", 0.5);
      switch (str(p, "kind", "call-max")) {
        case "call-min": return callOnMin(m.S, S2, K, tau, m.r, b1, b2, m.sigma, s2, rho);
        case "put-max": return putOnMax(m.S, S2, K, tau, m.r, b1, b2, m.sigma, s2, rho);
        case "put-min": return putOnMin(m.S, S2, K, tau, m.r, b1, b2, m.sigma, s2, rho);
        default: return callOnMax(m.S, S2, K, tau, m.r, b1, b2, m.sigma, s2, rho);
      }
    },
    maturity: (p) => num(p, "T", 1),
  },

  // --- Asians / baskets / spreads (Monte Carlo where needed) ---
  "asian-geometric": {
    value: (p, m, env) => {
      const tau = tauOf(p, m);
      const b = m.r - m.q;
      const K = num(p, "K", 100);
      return geometricAsian(cpOf(p), m.S, K, tau, m.r, b, effVol(env, m, b, K, tau));
    },
    maturity: (p) => num(p, "T", 1),
    pathDependent: true,
  },
  "asian-arithmetic": {
    value: (p, m, env) => {
      const tau = tauOf(p, m);
      const K = num(p, "K", 100);
      if (tau <= 0) return intrinsic(cpOf(p), m.S, K); // fresh-issue convention
      const b = m.r - m.q;
      const mod = env.model;
      const cube = env.cube("a", mod.mcPaths, mod.mcSteps);
      if (mod.vol.kind === "heston" || mod.vol.kind === "localvol" || mod.vol.kind === "term") {
        const sign = cpOf(p) === "call" ? 1 : -1;
        return mc1(cube, m.S, tau, m.r, b, simDynamics(env, m, b), (s) => Math.max(sign * (s.avg - K), 0)).price;
      }
      return arithmeticAsianMc(cube, cpOf(p), m.S, K, tau, m.r, b, effVol(env, m, b, K, tau)).price;
    },
    maturity: (p) => num(p, "T", 1),
    pathDependent: true,
    usesMc: true,
  },
  "basket": {
    value: (p, m, env) => {
      const tau = tauOf(p, m);
      const w1 = num(p, "w1", 0.5);
      const w2 = num(p, "w2", 0.5);
      const S2 = num(p, "S2", 100);
      const K = num(p, "K", 100);
      const sign = cpOf(p) === "call" ? 1 : -1;
      if (tau <= 0) return Math.max(sign * (w1 * m.S + w2 * S2 - K), 0);
      const mod = env.model;
      const cA = env.cube("a", mod.mcPaths, mod.mcSteps);
      const cB = env.cube("b", mod.mcPaths, mod.mcSteps);
      return mc2(
        cA, cB, m.S, S2, tau, m.r, m.r - m.q, m.r - num(p, "q2", 0),
        m.sigma, num(p, "sigma2", 0.25), num(p, "rho", 0.5),
        (s) => Math.max(sign * (w1 * s.S1 + w2 * s.S2 - K), 0),
      ).price;
    },
    maturity: (p) => num(p, "T", 1),
    usesMc: true,
  },
  "spread-option": {
    value: (p, m, env) => {
      const tau = tauOf(p, m);
      const S2 = num(p, "S2", 95);
      const K = num(p, "K", 5);
      const b1 = m.r - m.q;
      const b2 = m.r - num(p, "q2", 0);
      const s2 = num(p, "sigma2", 0.25);
      const rho = num(p, "rho", 0.5);
      if (str(p, "method", "kirk") === "mc" && tau > 0) {
        const mod = env.model;
        const cA = env.cube("a", mod.mcPaths, mod.mcSteps);
        const cB = env.cube("b", mod.mcPaths, mod.mcSteps);
        const sign = cpOf(p) === "call" ? 1 : -1;
        return mc2(cA, cB, m.S, S2, tau, m.r, b1, b2, m.sigma, s2, rho,
          (s) => Math.max(sign * (s.S1 - s.S2 - K), 0)).price;
      }
      return kirkSpread(cpOf(p), m.S, S2, K, tau, m.r, b1, b2, m.sigma, s2, rho);
    },
    maturity: (p) => num(p, "T", 1),
    usesMc: true,
  },
  "product-option": {
    value: (p, m) =>
      productOption(
        cpOf(p), m.S, num(p, "S2", 1), num(p, "K", 100), tauOf(p, m), m.r,
        m.r - m.q, m.r - num(p, "q2", 0), m.sigma, num(p, "sigma2", 0.25), num(p, "rho", 0.5),
      ),
    maturity: (p) => num(p, "T", 1),
  },

  // --- volatility products ---
  "variance-swap": {
    value: (p, m, env) => {
      const tau = tauOf(p, m);
      if (tau <= 0) return 0;
      const P = discountCurve(env.model.rates, m.r);
      const vm = env.model.vol;
      const ev = vm.kind === "heston"
        ? hestonExpectedVar(m.sigma * m.sigma, vm.kappa, vm.thetaV, tau)
        : expectedVariance(vm, m.sigma, tau);
      const Kv = num(p, "Kvol", 0.2);
      return varianceSwap(P, num(p, "notional", 100), Kv * Kv, tau, ev);
    },
    maturity: (p) => num(p, "T", 1),
    usesS: false,
    pathDependent: true,
  },
  "vol-swap": {
    value: (p, m, env) => {
      const tau = tauOf(p, m);
      if (tau <= 0) return 0;
      const P = discountCurve(env.model.rates, m.r);
      const ev = expectedVariance(env.model.vol, m.sigma, tau);
      return volatilitySwap(P, num(p, "notional", 100), num(p, "Kvol", 0.2), tau, ev);
    },
    maturity: (p) => num(p, "T", 1),
    usesS: false,
    pathDependent: true,
  },

  // --- rate-sensitive ---
  "fra": {
    value: (p, m, env) =>
      fra(discountCurve(env.model.rates, m.r), num(p, "notional", 100), num(p, "K", 0.05),
        Math.max(num(p, "T1", 0.5) - m.t, 0), Math.max(num(p, "T2", 1) - m.t, 1e-6)),
    maturity: (p) => num(p, "T2", 1),
    usesS: false,
  },
  "swap": {
    value: (p, m, env) =>
      swap(discountCurve(env.model.rates, m.r), num(p, "notional", 100), num(p, "K", 0.05),
        Math.max(num(p, "tenor", 5) - m.t, 1e-6), num(p, "freq", 0.5)),
    maturity: (p) => num(p, "tenor", 5),
    usesS: false,
  },
  "cap-floor": {
    value: (p, m, env) =>
      capFloor(discountCurve(env.model.rates, m.r), str(p, "kind", "cap") as "cap" | "floor",
        num(p, "notional", 100), num(p, "K", 0.05),
        Math.max(num(p, "tenor", 3) - m.t, 1e-6), num(p, "freq", 0.5), num(p, "sigmaBlack", 0.25)),
    maturity: (p) => num(p, "tenor", 3),
    usesS: false,
  },
  "swaption": {
    value: (p, m, env) =>
      swaption(discountCurve(env.model.rates, m.r), str(p, "kind", "payer") as "payer" | "receiver",
        num(p, "notional", 100), num(p, "K", 0.05),
        Math.max(num(p, "expiry", 1) - m.t, 1e-6), num(p, "tenor", 5), num(p, "freq", 0.5),
        num(p, "sigmaBlack", 0.25)),
    maturity: (p) => num(p, "expiry", 1),
    usesS: false,
  },
  "trs": {
    value: (p, m, env) =>
      totalReturnSwap(discountCurve(env.model.rates, m.r), num(p, "notional", 100),
        num(p, "K", 0.05), m.S, num(p, "S0", 100), Math.max(num(p, "tenor", 1) - m.t, 1e-6), num(p, "freq", 0.5)),
    maturity: (p) => num(p, "tenor", 1),
  },
};

export { parSwapRate };

/** Value of one leg (side and quantity applied). */
export function legValue(leg: LegSpec, m: Market, env: EvalEnv): number {
  const impl = INSTRUMENTS[leg.instrument];
  if (!impl) throw new Error(`Unknown instrument: ${leg.instrument}`);
  return leg.side * leg.qty * impl.value(leg.params, m, env);
}

/** Aggregate portfolio value. */
export function portfolioValue(legs: LegSpec[], m: Market, env: EvalEnv): number {
  let v = 0;
  for (const leg of legs) v += legValue(leg, m, env);
  return v;
}

/** Earliest finite maturity among the legs (the payoff horizon), or null. */
export function firstExpiry(legs: LegSpec[]): number | null {
  let t = Infinity;
  for (const leg of legs) {
    const impl = INSTRUMENTS[leg.instrument];
    if (!impl) continue;
    const T = impl.maturity(leg.params);
    if (isFinite(T) && T > 0) t = Math.min(t, T);
  }
  return isFinite(t) ? t : null;
}

export function anyPathDependent(legs: LegSpec[]): boolean {
  return legs.some((l) => INSTRUMENTS[l.instrument]?.pathDependent);
}

export function anyUsesMc(legs: LegSpec[]): boolean {
  return legs.some((l) => INSTRUMENTS[l.instrument]?.usesMc);
}
