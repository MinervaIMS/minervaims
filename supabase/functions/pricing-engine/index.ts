import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// =====================================================================
// pricing-engine — PayoffLab's server-side derivatives engine.
//
// Thin-client / server-engine split: ALL pricing mathematics lives in
// ./engine/* which is imported ONLY here, never from any client file,
// so Vite can never bundle it. The client sends instrument/model/grid
// requests and receives sampled arrays + scalar summaries; crosshair
// reads are client-side interpolation of those arrays.
//
// Honest limitation (by design, do not hide): this protects the
// MECHANISM — closed forms, calibration tricks and numerical engines
// stay server-side — and the per-IP rate limit below deters bulk
// harvesting of results. It cannot make a public tool's UI or its
// instrument list secret, nor perfectly stop slow result-scraping.
// That is the strongest realistic posture for a free teaching tool.
//
// Access is public for now (rate-limited by IP). Feature gating runs
// through the client entitlements layer; if paid tiers ever ship,
// verify the Supabase JWT here and check entitlements server-side.
// =====================================================================

import { computeGrid, hedgeSim, pointGreeks, solveHedge } from './engine/portfolio.ts';
import type { GreekName, GridRequest, XVar } from './engine/portfolio.ts';
import { INSTRUMENTS } from './engine/instruments.ts';
import type { LegSpec, ModelSettings } from './engine/instruments.ts';

const corsHeaders = {
  // PRODUCTION NOTE: lock this to the Minerva domain(s) once the site's
  // canonical origin list is final, e.g.:
  //   'Access-Control-Allow-Origin': 'https://www.minervaims.it'
  // (and echo the origin from an allowlist if several are needed).
  // Kept open during development so Lovable previews can call it.
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------
// Validation. Inputs only — everything is bounded so a hostile client
// cannot request pathological grids or Monte Carlo workloads.
// ---------------------------------------------------------------------

const MAX_LEGS = 8; // 5 user legs + up to 3 hedge legs
const FIN = (v: unknown, lo: number, hi: number, dflt: number): number => {
  const n = typeof v === 'number' && isFinite(v) ? v : dflt;
  return Math.min(hi, Math.max(lo, n));
};

function sanitiseParams(raw: unknown): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (!/^[a-zA-Z][a-zA-Z0-9]{0,20}$/.test(k)) continue;
      if (typeof v === 'number' && isFinite(v) && Math.abs(v) < 1e9) out[k] = v;
      else if (typeof v === 'string' && v.length <= 24) out[k] = v;
    }
  }
  return out;
}

function parseLegs(raw: unknown): LegSpec[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_LEGS).flatMap((l): LegSpec[] => {
    if (!l || typeof l !== 'object') return [];
    const inst = (l as Record<string, unknown>).instrument;
    if (typeof inst !== 'string' || !INSTRUMENTS[inst]) return [];
    return [{
      instrument: inst,
      side: (l as Record<string, unknown>).side === -1 ? -1 : 1,
      qty: FIN((l as Record<string, unknown>).qty, 0, 1e6, 1),
      params: sanitiseParams((l as Record<string, unknown>).params),
    }];
  });
}

const VOL_KINDS = new Set(['constant', 'term', 'garch', 'sabr', 'smile', 'heston', 'localvol']);
const RATE_KINDS = new Set(['constant', 'merton', 'vasicek', 'cir']);
const PRICING = new Set(['auto', 'black-scholes', 'bachelier', 'merton-jump', 'binomial-crr', 'binomial-jr', 'trinomial']);

function parseModel(raw: unknown): ModelSettings {
  const m = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const volRaw = (m.vol && typeof m.vol === 'object' ? m.vol : {}) as Record<string, unknown>;
  const ratesRaw = (m.rates && typeof m.rates === 'object' ? m.rates : {}) as Record<string, unknown>;
  const jumpRaw = (m.jump && typeof m.jump === 'object' ? m.jump : {}) as Record<string, unknown>;
  const volKind = VOL_KINDS.has(volRaw.kind as string) ? (volRaw.kind as string) : 'constant';
  const rateKind = RATE_KINDS.has(ratesRaw.kind as string) ? (ratesRaw.kind as string) : 'constant';

  let vol: ModelSettings['vol'];
  switch (volKind) {
    case 'term': {
      const pts = Array.isArray(volRaw.points) ? volRaw.points.slice(0, 12) : [];
      vol = {
        kind: 'term',
        points: pts.map((p) => ({
          t: FIN((p as Record<string, unknown>)?.t, 0.01, 50, 1),
          sigma: FIN((p as Record<string, unknown>)?.sigma, 0.001, 3, 0.2),
        })),
      };
      break;
    }
    case 'garch':
      vol = { kind: 'garch', sigmaLong: FIN(volRaw.sigmaLong, 0.001, 3, 0.2), persistence: FIN(volRaw.persistence, 0, 0.999999, 0.97) };
      break;
    case 'sabr':
      vol = {
        kind: 'sabr', alpha: FIN(volRaw.alpha, 0.001, 3, 0.2), beta: FIN(volRaw.beta, 0, 1, 1),
        rhoSabr: FIN(volRaw.rhoSabr, -0.999, 0.999, -0.3), nu: FIN(volRaw.nu, 0, 5, 0.5),
      };
      break;
    case 'smile':
      vol = { kind: 'smile', skew: FIN(volRaw.skew, -3, 3, -0.1), curv: FIN(volRaw.curv, -3, 3, 0.3) };
      break;
    case 'heston':
      vol = {
        kind: 'heston', kappa: FIN(volRaw.kappa, 0.01, 20, 2), thetaV: FIN(volRaw.thetaV, 1e-4, 4, 0.04),
        xi: FIN(volRaw.xi, 0, 5, 0.5), rhoSV: FIN(volRaw.rhoSV, -0.999, 0.999, -0.7),
      };
      break;
    case 'localvol':
      vol = { kind: 'localvol', skew: FIN(volRaw.skew, -3, 3, -0.1), curv: FIN(volRaw.curv, -3, 3, 0.3) };
      break;
    default:
      vol = { kind: 'constant' };
  }

  let rates: ModelSettings['rates'];
  switch (rateKind) {
    case 'merton':
      rates = { kind: 'merton', a: FIN(ratesRaw.a, -0.5, 0.5, 0.001), sigmaR: FIN(ratesRaw.sigmaR, 0, 0.2, 0.01) };
      break;
    case 'vasicek':
      rates = { kind: 'vasicek', a: FIN(ratesRaw.a, 0.001, 5, 0.5), theta: FIN(ratesRaw.theta, -0.05, 0.5, 0.05), sigmaR: FIN(ratesRaw.sigmaR, 0, 0.2, 0.01) };
      break;
    case 'cir':
      rates = { kind: 'cir', a: FIN(ratesRaw.a, 0.001, 5, 0.5), theta: FIN(ratesRaw.theta, 0.0001, 0.5, 0.05), sigmaR: FIN(ratesRaw.sigmaR, 0.0001, 1, 0.08) };
      break;
    default:
      rates = { kind: 'constant' };
  }

  return {
    pricing: PRICING.has(m.pricing as string) ? (m.pricing as ModelSettings['pricing']) : 'auto',
    treeSteps: Math.round(FIN(m.treeSteps, 10, 1000, 200)),
    jump: {
      lambda: FIN(jumpRaw.lambda, 0, 20, 0.5),
      muJ: FIN(jumpRaw.muJ, -2, 2, -0.1),
      deltaJ: FIN(jumpRaw.deltaJ, 0, 2, 0.2),
    },
    vol,
    rates,
    mcPaths: Math.round(FIN(m.mcPaths, 500, 40000, 8000)),
    mcSteps: Math.round(FIN(m.mcSteps, 8, 250, 64)),
    seed: Math.round(FIN(m.seed, 0, 2 ** 31, 42)),
  };
}

function parseMarket(raw: unknown) {
  const m = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    S: FIN(m.S, 1e-6, 1e8, 100),
    r: FIN(m.r, -0.2, 1, 0.05),
    sigma: FIN(m.sigma, 0.001, 3, 0.2),
    q: FIN(m.q, -0.2, 1, 0),
  };
}

const GREEKS = new Set(['delta', 'gamma', 'theta', 'vega', 'rho', 'vanna', 'vomma', 'charm', 'speed', 'colour']);
function parseGreeks(raw: unknown, max: number): GreekName[] {
  if (!Array.isArray(raw)) return [];
  const out: GreekName[] = [];
  for (const g of raw) {
    if (typeof g === 'string' && GREEKS.has(g) && !out.includes(g as GreekName)) out.push(g as GreekName);
    if (out.length >= max) break;
  }
  return out;
}

// ---------------------------------------------------------------------
// Per-IP sliding-window rate limiting via Postgres (see the companion
// migration creating public.pricing_rate_limits + the RPC).
// Fails open on infrastructure errors so the teaching tool stays up.
// ---------------------------------------------------------------------

const RATE_LIMIT_PER_MINUTE = 120;

async function rateLimited(req: Request): Promise<boolean> {
  try {
    const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim().slice(0, 64);
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data, error } = await supabase.rpc('pricing_rate_check', {
      p_key: ip,
      p_limit: RATE_LIMIT_PER_MINUTE,
      p_window_seconds: 60,
    });
    if (error) return false;
    return data === false;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (await rateLimited(req)) {
    return json({ error: 'Rate limit exceeded. PayoffLab is a shared teaching tool — please slow down.' }, 429);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const action = body.action;
  try {
    if (action === 'grid') {
      const legs = parseLegs(body.legs);
      if (legs.length === 0) return json({ error: 'No valid legs' }, 400);
      const market = parseMarket(body.market);
      const xVar: XVar = body.xVar === 't' ? 't' : body.xVar === 'r' ? 'r' : 'S';
      const reqGrid: GridRequest = {
        legs,
        model: parseModel(body.model),
        market,
        xVar,
        xMin: FIN(body.xMin, xVar === 'S' ? 1e-6 : xVar === 'r' ? -0.2 : 0, 1e8, xVar === 'S' ? market.S * 0.5 : 0),
        xMax: FIN(body.xMax, -0.2, 1e8, xVar === 'S' ? market.S * 1.5 : xVar === 'r' ? 0.15 : 1),
        n: Math.round(FIN(body.n, 11, 401, 201)),
        greeks: parseGreeks(body.greeks, 10),
        wantPayoff: body.wantPayoff !== false,
      };
      if (!(reqGrid.xMax > reqGrid.xMin)) return json({ error: 'Invalid x range' }, 400);
      return json(computeGrid(reqGrid));
    }

    if (action === 'point-greeks') {
      const legs = parseLegs(body.legs);
      if (legs.length === 0) return json({ error: 'No valid legs' }, 400);
      const greeks = pointGreeks(legs, parseModel(body.model), parseMarket(body.market),
        parseGreeks(body.greeks, 10).length ? parseGreeks(body.greeks, 10) : undefined);
      return json({ greeks });
    }

    if (action === 'hedge-solve') {
      const legs = parseLegs(body.legs);
      if (legs.length === 0) return json({ error: 'No valid legs' }, 400);
      const kind = body.kind === 'delta-gamma' ? 'delta-gamma' : body.kind === 'vega' ? 'vega' : 'delta';
      const result = solveHedge(
        legs, parseModel(body.model), parseMarket(body.market), kind,
        FIN(body.hedgeOptionT, 0.05, 30, 1),
        typeof body.hedgeOptionK === 'number' ? FIN(body.hedgeOptionK, 1e-6, 1e8, 100) : undefined,
      );
      return json(result);
    }

    if (action === 'hedge-sim') {
      const legs = parseLegs(body.legs);
      if (legs.length === 0) return json({ error: 'No valid legs' }, 400);
      const market = parseMarket(body.market);
      const result = hedgeSim({
        legs,
        model: parseModel(body.model),
        market,
        sigmaReal: FIN(body.sigmaReal, 0.001, 3, market.sigma),
        sigmaHedge: FIN(body.sigmaHedge, 0.001, 3, market.sigma),
        rehedges: Math.round(FIN(body.rehedges, 4, 730, 52)),
        seed: Math.round(FIN(body.seed, 0, 2 ** 31, 1)),
        statPaths: Math.round(FIN(body.statPaths, 0, 400, 200)),
      });
      return json(result);
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Pricing failed';
    return json({ error: msg }, 422);
  }
});
