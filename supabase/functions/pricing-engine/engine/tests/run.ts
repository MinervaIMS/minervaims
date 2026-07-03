// ---------------------------------------------------------------------------
// PayoffLab pricing engine — correctness suite (spec §17).
//
// Run locally with:
//   node --experimental-strip-types supabase/functions/pricing-engine/engine/tests/run.ts
// (or `deno run` — the engine sources are runtime-agnostic).
// ---------------------------------------------------------------------------

import { bivNormCdf, normCdf, normInv } from "../math.ts";
import {
  bachelier, digitalAsset, digitalCash, forwardStart, gbs, gbsGreeks,
  mertonJump, simpleChooser,
} from "../gbs.ts";
import {
  barrier, callOnMax, callOnMin, compound, geometricAsian, lookbackFixed,
  lookbackFloating, margrabe,
} from "../exotics.ts";
import { treePrice } from "../lattice.ts";
import {
  arithmeticAsianMc, discreteGeometricAsian, kirkSpread, mc1, mc2, NormalCube, productOption,
} from "../mc.ts";
import { capFloor, discountCurve, forwardRate, fra, parSwapRate, swap, swaption } from "../rates.ts";
import { sabrImpliedVol } from "../vol.ts";
import { computeGrid, hedgeSim, pointGreeks, solveHedge } from "../portfolio.ts";
import type { ModelSettings } from "../instruments.ts";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, got: number, want: number, tol: number) {
  const ok = isFinite(got) && Math.abs(got - want) <= tol;
  if (ok) passed++;
  else {
    failed++;
    failures.push(`${name}: got ${got}, want ${want} (tol ${tol})`);
  }
}
function checkTrue(name: string, cond: boolean) {
  if (cond) passed++;
  else {
    failed++;
    failures.push(`${name}: condition false`);
  }
}

const baseModel: ModelSettings = {
  pricing: "black-scholes",
  treeSteps: 200,
  jump: { lambda: 0.5, muJ: -0.1, deltaJ: 0.2 },
  vol: { kind: "constant" },
  rates: { kind: "constant" },
  mcPaths: 20000,
  mcSteps: 50,
  seed: 42,
};

// --- normal distribution ----------------------------------------------------
check("normCdf(0)", normCdf(0), 0.5, 1e-15);
check("normCdf(1)", normCdf(1), 0.8413447460685429, 1e-12);
check("normCdf(-2)", normCdf(-2), 0.022750131948179212, 1e-12);
check("normInv roundtrip .975", normCdf(normInv(0.975)), 0.975, 1e-12);
check("normInv(.5)", normInv(0.5), 0, 1e-12);
check("bivN rho=0 product", bivNormCdf(0.3, -0.7, 0), normCdf(0.3) * normCdf(-0.7), 1e-10);
check("bivN M(0,0,rho)", bivNormCdf(0, 0, 0.5), 0.25 + Math.asin(0.5) / (2 * Math.PI), 1e-10);
check("bivN rho=1", bivNormCdf(0.4, 1.2, 1), normCdf(0.4), 1e-12);
check("bivN rho=-1", bivNormCdf(0.4, 1.2, -1), Math.max(0, normCdf(0.4) + normCdf(1.2) - 1), 1e-12);
check("bivN high rho", bivNormCdf(0.5, 0.3, 0.95), bivNormCdf(0.3, 0.5, 0.95), 1e-12);

// --- generalised Black–Scholes ----------------------------------------------
// Haug (2007) reference value: call S=60 K=65 T=0.25 r=b=0.08 sigma=0.30 -> 2.1334.
check("GBS Haug call", gbs("call", 60, 65, 0.25, 0.08, 0.08, 0.3), 2.1334, 5e-4);
// Put–call parity across a parameter sweep.
for (const [S, K, T, r, q, sg] of [
  [100, 100, 1, 0.05, 0, 0.2], [90, 110, 0.5, 0.03, 0.02, 0.35], [120, 100, 2, 0.07, 0.04, 0.15],
] as Array<[number, number, number, number, number, number]>) {
  const b = r - q;
  const c = gbs("call", S, K, T, r, b, sg);
  const p = gbs("put", S, K, T, r, b, sg);
  check(`parity S=${S}`, c - p, S * Math.exp((b - r) * T) - K * Math.exp(-r * T), 1e-9);
}

// --- FD Greeks vs analytic ---------------------------------------------------
{
  const legs = [{ instrument: "euro-option", side: 1 as const, qty: 1, params: { cp: "call", K: 100, T: 1 } }];
  const mkt = { S: 100, r: 0.05, sigma: 0.2, q: 0 };
  const fd = pointGreeks(legs, baseModel, mkt, ["delta", "gamma", "theta", "vega", "rho", "vanna", "vomma"]);
  const an = gbsGreeks("call", 100, 100, 1, 0.05, 0.05, 0.2);
  check("FD delta", fd.delta, an.delta, 1e-6);
  check("FD gamma", fd.gamma, an.gamma, 1e-6);
  check("FD theta", fd.theta, an.theta, 1e-4);
  check("FD vega", fd.vega, an.vega, 1e-4);
  check("FD rho", fd.rho, an.rho, 1e-4);
  // analytic vanna/vomma for the GBS model
  const v = 0.2 * Math.sqrt(1);
  const d1 = (Math.log(100 / 100) + (0.05 + 0.02) * 1) / v;
  const d2 = d1 - v;
  check("FD vanna", fd.vanna, (-Math.exp(0) * Math.exp(-d1 * d1 / 2) / Math.sqrt(2 * Math.PI)) * d2 / 0.2, 1e-4);
  check("FD vomma", fd.vomma, an.vega * d1 * d2 / 0.2, 2e-3);
}

// --- digitals ------------------------------------------------------------------
{
  const args = [100, 100, 1, 0.05, 0.03, 0.25] as const;
  const cash = digitalCash("call", ...args, 1);
  const eps = 1e-4;
  const spread = (gbs("call", 100, 100 - eps, 1, 0.05, 0.03, 0.25) - gbs("call", 100, 100 + eps, 1, 0.05, 0.03, 0.25)) / (2 * eps);
  check("digital = -dC/dK", cash, spread, 1e-6);
  const asset = digitalAsset("call", ...args);
  check("asset - K*cash = call", asset - 100 * cash, gbs("call", ...args), 1e-9);
  check("cash call+put = bond", digitalCash("call", ...args, 1) + digitalCash("put", ...args, 1), Math.exp(-0.05), 1e-10);
}

// --- barriers: in + out = vanilla ---------------------------------------------
for (const cp of ["call", "put"] as const) {
  for (const [dir, H] of [["down", 85], ["up", 115]] as Array<["down" | "up", number]>) {
    for (const K of [95, 105]) {
      const args = [100, K, H, 1, 0.06, 0.04, 0.25, 0] as const;
      const vin = barrier(cp, `${dir}-in` as const, ...args);
      const vout = barrier(cp, `${dir}-out` as const, ...args);
      const van = gbs(cp, 100, K, 1, 0.06, 0.04, 0.25);
      check(`barrier in+out ${cp} ${dir} K=${K}`, vin + vout, van, 1e-8);
      checkTrue(`barrier bounds ${cp} ${dir} K=${K}`, vin >= -1e-10 && vout >= -1e-10);
    }
  }
}

// --- American vs European ------------------------------------------------------
{
  const eu = gbs("put", 100, 100, 1, 0.08, 0.08, 0.2);
  const am = treePrice("put", 100, 100, 1, 0.08, 0.08, 0.2, { flavour: "crr", steps: 500, american: true });
  checkTrue("American put >= European", am >= eu - 1e-9);
  checkTrue("American put premium positive", am - eu > 0.01);
  // No-dividend American call = European call.
  const amc = treePrice("call", 100, 100, 1, 0.05, 0.05, 0.2, { flavour: "crr", steps: 500, american: true });
  check("Am call (q=0) = Eu call", amc, gbs("call", 100, 100, 1, 0.05, 0.05, 0.2), 5e-3);
}

// --- lattice convergence ---------------------------------------------------------
{
  const bs = gbs("call", 100, 105, 0.75, 0.05, 0.03, 0.25);
  check("CRR -> BS", treePrice("call", 100, 105, 0.75, 0.05, 0.03, 0.25, { flavour: "crr", steps: 1000, american: false }), bs, 5e-3);
  check("JR -> BS", treePrice("call", 100, 105, 0.75, 0.05, 0.03, 0.25, { flavour: "jr", steps: 1000, american: false }), bs, 5e-3);
  check("trinomial -> BS", treePrice("call", 100, 105, 0.75, 0.05, 0.03, 0.25, { flavour: "trinomial", steps: 500, american: false }), bs, 5e-3);
}

// --- Bachelier vs Black–Scholes for low vol / short maturity ---------------------
{
  const bs = gbs("call", 100, 100, 0.1, 0.02, 0.02, 0.05);
  const ba = bachelier("call", 100, 100, 0.1, 0.02, 0.02, 0.05 * 100);
  check("Bachelier ~ BS (ATM short/low vol)", ba, bs, 2e-3);
  checkTrue("Bachelier positive", bachelier("put", 90, 100, 1, 0.05, 0.05, 20) > 0);
}

// --- Merton jump-diffusion ---------------------------------------------------------
{
  check("jump lambda=0 = BS", mertonJump("call", 100, 100, 1, 0.05, 0.05, 0.2, 0, -0.1, 0.15), gbs("call", 100, 100, 1, 0.05, 0.05, 0.2), 1e-12);
  const jd = mertonJump("call", 100, 100, 1, 0.05, 0.05, 0.2, 1, -0.1, 0.15);
  checkTrue("jump adds value vs same-diffusion BS", jd > gbs("call", 100, 100, 1, 0.05, 0.05, 0.2));
  // Merton series vs MC with jumps is out of scope; check parity instead:
  const jp = mertonJump("put", 100, 100, 1, 0.05, 0.05, 0.2, 1, -0.1, 0.15);
  check("jump parity", jd - jp, 100 - 100 * Math.exp(-0.05), 1e-8);
}

// --- chooser / forward start --------------------------------------------------------
{
  const c = gbs("call", 100, 100, 1, 0.05, 0.03, 0.25);
  const p = gbs("put", 100, 100, 1, 0.05, 0.03, 0.25);
  const w = simpleChooser(100, 100, 0.5, 1, 0.05, 0.03, 0.25);
  checkTrue("chooser between max leg and straddle", w >= Math.max(c, p) - 1e-9 && w <= c + p + 1e-9);
  check("chooser at t1->T = straddle", simpleChooser(100, 100, 1 - 1e-9, 1, 0.05, 0.03, 0.25), c + p, 1e-4);
  check("forward-start t=0", forwardStart("call", 100, 1.05, 0, 1, 0.05, 0.03, 0.25), gbs("call", 100, 105, 1, 0.05, 0.03, 0.25), 1e-9);
}

// --- compound (Geske) -----------------------------------------------------------------
{
  const S = 100, K1 = 5, t1 = 0.5, K2 = 100, T2 = 1, r = 0.05, b = 0.03, sg = 0.25;
  const coc = compound("call-on-call", S, K1, t1, K2, T2, r, b, sg);
  const poc = compound("put-on-call", S, K1, t1, K2, T2, r, b, sg);
  const cUnder = gbs("call", S, K2, T2, r, b, sg);
  check("compound parity CoC-PoC", coc - poc, cUnder - K1 * Math.exp(-r * t1), 1e-6);
  const cop = compound("call-on-put", S, K1, t1, K2, T2, r, b, sg);
  const pop = compound("put-on-put", S, K1, t1, K2, T2, r, b, sg);
  const pUnder = gbs("put", S, K2, T2, r, b, sg);
  check("compound parity CoP-PoP", cop - pop, pUnder - K1 * Math.exp(-r * t1), 1e-6);
  checkTrue("compound positive", coc > 0 && poc > 0 && cop > 0 && pop > 0);
}

// --- two-asset closed forms --------------------------------------------------------------
{
  // Margrabe with deterministic asset 2 (sigma2=0, b2=0) = call struck at S2.
  const mg = margrabe(100, 95, 1, 0.05, 0.02, 0, 0.25, 0, 0.0);
  check("Margrabe deterministic S2 = call", mg, gbs("call", 100, 95, 1, 0.05, 0.02, 0.25), 1e-9);
  // Stulz identities: PV(min)+PV(max) = PV(S1)+PV(S2).
  const argsT = [1, 0.05, 0.03, 0.01, 0.25, 0.3, 0.5] as const;
  const pvMin = callOnMin(100, 95, 0, ...argsT);
  const pvMax = callOnMax(100, 95, 0, ...argsT);
  check("min+max identity", pvMin + pvMax, 100 * Math.exp((0.03 - 0.05) * 1) + 95 * Math.exp((0.01 - 0.05) * 1), 1e-8);
  const cmin = callOnMin(100, 95, 100, ...argsT);
  checkTrue("cmin <= each vanilla", cmin <= gbs("call", 100, 100, 1, 0.05, 0.03, 0.25) + 1e-9 && cmin <= gbs("call", 95, 100, 1, 0.05, 0.01, 0.3) + 1e-9);
}

// --- lookbacks ------------------------------------------------------------------------------
{
  const fl = lookbackFloating("call", 100, 100, 1, 0.05, 0.03, 0.25);
  checkTrue("floating lookback call >= ATM call", fl >= gbs("call", 100, 100, 1, 0.05, 0.03, 0.25) - 1e-9);
  const fx = lookbackFixed("call", 100, 100, 100, 1, 0.05, 0.03, 0.25);
  checkTrue("fixed lookback call >= vanilla", fx >= gbs("call", 100, 100, 1, 0.05, 0.03, 0.25) - 1e-9);
  // MC cross-check of the floating lookback (discrete monitoring biases low).
  const cube = new NormalCube(40000, 250, 7);
  const mcFl = mc1(cube, 100, 1, 0.05, 0.03, { kind: "gbm", sigma: 0.25 }, (s) => s.ST - s.min);
  checkTrue("floating lookback vs MC bracket", mcFl.price < fl && fl < mcFl.price * 1.12);
}

// --- Asians -----------------------------------------------------------------------------------
{
  // Discrete geometric closed form vs MC on the same fixings.
  const cube = new NormalCube(60000, 12, 11);
  const cf = discreteGeometricAsian("call", 100, 100, 1, 0.05, 0.03, 0.25, 12);
  const mcGeo = mc1(cube, 100, 1, 0.05, 0.03, { kind: "gbm", sigma: 0.25 }, (s) => Math.max(s.gavg - 100, 0));
  check("discrete geo Asian CF vs MC", mcGeo.price, cf, 4 * mcGeo.se + 1e-3);
  // Arithmetic >= geometric; CV estimate is tight.
  const arth = arithmeticAsianMc(cube, "call", 100, 100, 1, 0.05, 0.03, 0.25);
  checkTrue("arith Asian >= geo Asian", arth.price >= cf - 1e-3);
  // Continuous geometric (Kemna–Vorst) close to dense discrete.
  const kv = geometricAsian("call", 100, 100, 1, 0.05, 0.03, 0.25);
  check("KV vs dense discrete geo", discreteGeometricAsian("call", 100, 100, 1, 0.05, 0.03, 0.25, 500), kv, 5e-3 * kv + 2e-3);
}

// --- spread & product --------------------------------------------------------------------------
{
  const cA = new NormalCube(60000, 20, 13);
  const cB = new NormalCube(60000, 20, 14);
  const kirk = kirkSpread("call", 100, 95, 5, 1, 0.05, 0.02, 0.01, 0.25, 0.3, 0.4);
  const mcSp = mc2(cA, cB, 100, 95, 1, 0.05, 0.02, 0.01, 0.25, 0.3, 0.4, (s) => Math.max(s.S1 - s.S2 - 5, 0));
  check("Kirk vs MC spread", kirk, mcSp.price, 5 * mcSp.se + 0.05);
  const prod = productOption("call", 10, 10, 100, 1, 0.05, 0.02, 0.01, 0.25, 0.3, 0.4);
  const mcPr = mc2(cA, cB, 10, 10, 1, 0.05, 0.02, 0.01, 0.25, 0.3, 0.4, (s) => Math.max(s.S1 * s.S2 - 100, 0));
  check("product CF vs MC", prod, mcPr.price, 5 * mcPr.se + 0.05);
}

// --- Heston sanity ------------------------------------------------------------------------------
{
  const cube = new NormalCube(40000, 64, 21);
  const volCube = new NormalCube(40000, 64, 22);
  const hs = mc1(cube, 100, 1, 0.05, 0.05, {
    kind: "heston",
    params: { kappa: 2, thetaV: 0.04, xi: 1e-6, rhoSV: 0, v0: 0.04 },
    volCube,
  }, (s) => Math.max(s.ST - 100, 0));
  check("Heston xi->0 = BS", hs.price, gbs("call", 100, 100, 1, 0.05, 0.05, 0.2), 5 * hs.se + 0.05);
}

// --- SABR -----------------------------------------------------------------------------------------
{
  check("SABR beta=1 nu->0", sabrImpliedVol(100, 100, 1, 0.2, 1, 0, 1e-9), 0.2, 1e-6);
  checkTrue("SABR smile convex-ish", sabrImpliedVol(100, 80, 1, 0.2, 1, -0.3, 0.6) > sabrImpliedVol(100, 100, 1, 0.2, 1, -0.3, 0.6));
}

// --- rates -----------------------------------------------------------------------------------------
{
  const P = discountCurve({ kind: "constant" }, 0.05);
  const par = parSwapRate(P, 5, 0.5);
  check("swap at par = 0", swap(P, 100, par, 5, 0.5), 0, 1e-10);
  const f = forwardRate(P, 0.5, 1);
  check("FRA at forward = 0", fra(P, 100, f, 0.5, 1), 0, 1e-12);
  checkTrue("cap value positive", capFloor(P, "cap", 100, 0.04, 3, 0.5, 0.25) > 0);
  // payer - receiver swaption = value of forward payer swap.
  const pay = swaption(P, "payer", 100, 0.05, 1, 5, 0.5, 0.25);
  const rec = swaption(P, "receiver", 100, 0.05, 1, 5, 0.5, 0.25);
  let ann = 0;
  for (let i = 1; i <= 10; i++) ann += 0.5 * P(1 + i * 0.5);
  const Fsw = (P(1) - P(6)) / ann;
  check("swaption parity", pay - rec, 100 * ann * (Fsw - 0.05), 1e-9);
  for (const model of [
    { kind: "vasicek", a: 0.5, theta: 0.05, sigmaR: 0.01 } as const,
    { kind: "cir", a: 0.5, theta: 0.05, sigmaR: 0.08 } as const,
    { kind: "merton", a: 0.001, sigmaR: 0.01 } as const,
  ]) {
    const Pm = discountCurve(model, 0.04);
    check(`${model.kind} P(0)=1`, Pm(0), 1, 1e-9);
    checkTrue(`${model.kind} decreasing`, Pm(1) > Pm(2) && Pm(2) > Pm(5));
  }
}

// --- portfolio grid: bull call spread ---------------------------------------------------------------
{
  const legs = [
    { instrument: "euro-option", side: 1 as const, qty: 1, params: { cp: "call", K: 100, T: 1 } },
    { instrument: "euro-option", side: -1 as const, qty: 1, params: { cp: "call", K: 120, T: 1 } },
  ];
  const res = computeGrid({
    legs, model: baseModel, market: { S: 100, r: 0.05, sigma: 0.2, q: 0 },
    xVar: "S", xMin: 50, xMax: 150, n: 201, greeks: ["delta", "gamma"], wantPayoff: true,
  });
  const cost = gbs("call", 100, 100, 1, 0.05, 0.05, 0.2) - gbs("call", 100, 120, 1, 0.05, 0.05, 0.2);
  check("spread price", res.scalars.price, cost, 1e-9);
  check("spread break-even", res.scalars.breakEvens[0] ?? NaN, 100 + cost, 0.15);
  check("spread max profit", res.scalars.maxProfit ?? NaN, 20 - cost, 1e-6);
  check("spread max loss", res.scalars.maxLoss ?? NaN, -cost, 1e-6);
  checkTrue("payoff piecewise", Math.abs((res.payoff as number[])[0]) < 1e-9 && Math.abs((res.payoff as number[])[200] - 20) < 1e-9);
  // value curve matches direct pricing at an interior grid point
  const i = 120; // S = 50 + 100*120/200 = 110
  const direct = gbs("call", 110, 100, 1, 0.05, 0.05, 0.2) - gbs("call", 110, 120, 1, 0.05, 0.05, 0.2);
  check("grid value point", res.value[i], direct, 1e-9);
  // net delta positive between strikes, gamma flips sign
  checkTrue("spread delta > 0", (res.greeks.delta[i] ?? 0) > 0);
  const gLow = res.greeks.gamma[100]; // S=100
  const gHigh = res.greeks.gamma[140]; // S=120
  checkTrue("spread gamma sign flip", gLow > 0 && gHigh < 0);
}

// --- hedging ------------------------------------------------------------------------------------------
{
  const legs = [{ instrument: "euro-option", side: -1 as const, qty: 1, params: { cp: "call", K: 100, T: 1 } }];
  const mkt = { S: 100, r: 0.05, sigma: 0.2, q: 0 };
  const dh = solveHedge(legs, baseModel, mkt, "delta");
  check("delta hedge residual", dh.residual.delta, 0, 1e-6);
  const dg = solveHedge(legs, baseModel, mkt, "delta-gamma", 1, 110);
  check("d-g hedge residual delta", dg.residual.delta, 0, 1e-6);
  check("d-g hedge residual gamma", dg.residual.gamma, 0, 1e-6);
  const sim = hedgeSim({
    legs, model: baseModel, market: mkt, sigmaReal: 0.2, sigmaHedge: 0.2,
    rehedges: 52, seed: 5, statPaths: 120,
  });
  checkTrue("hedging shrinks risk", sim.summary.stdHedged < 0.35 * sim.summary.stdUnhedged);
  checkTrue("sim arrays consistent", sim.times.length === sim.path.length && sim.gammaPnl.length === sim.times.length - 1);
}

// --- report ---------------------------------------------------------------------------------------------
console.log(`\nPayoffLab engine tests: ${passed} passed, ${failed} failed.`);
if (failures.length) {
  console.log(failures.map((f) => "  FAIL " + f).join("\n"));
  process.exit(1);
}
