/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// =====================================================================
// macro-monitor: the market figures the homepage cites (Step 93B).
// ---------------------------------------------------------------------
// Once a month the database asks this function (public.macro_monitor_tick,
// on a pg_cron schedule) to read twelve official series from keyless,
// institutional APIs and to write each one into the key numbers registry
// with kn_put: its value, its date and a definition naming the source and
// the series code. From there the site shows them exactly as it shows
// every other figure: embedded in the page at build time, final from the
// first frame, the same text in /data/key-numbers.json.
//
//   ECB Data Portal   inflation, core inflation, unemployment, the
//                     deposit facility rate, the €STR, the AAA curve
//                     (2 and 10 years), the Italy-Germany spread, EUR/USD
//   Eurostat          real GDP, quarter on quarter
//   BIS               the Federal Reserve's and the Bank of England's
//                     policy rates
//
// A series that cannot be read, or reads outside a sane range, is left as
// it was: the figure keeps its last value and its date says how old it
// is. Nothing is ever estimated or carried forward under a new date.
//
// Only the service role may call it (the gateway checks the token and
// this checks its role).
// =====================================================================

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function parseJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
    return JSON.parse(atob(payload)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const TIMEOUT_MS = 15_000;
const ECB = 'https://data-api.ecb.europa.eu/service/data';
const BIS = 'https://stats.bis.org/api/v2/data/dataflow/BIS/WS_CBPOL/1.0';
const EUROSTAT = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface Obs { period: string; value: number }

async function getJson(url: string, accept = 'application/json'): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { Accept: accept, 'User-Agent': 'minervaims.org macro-monitor' }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** The observations of the first series in an SDMX-JSON message, oldest first. */
function sdmxObservations(j: any): Obs[] {
  const data = j?.data ?? j;
  const ds = data?.dataSets?.[0];
  const structure = data?.structures?.[0] ?? data?.structure ?? j?.structure;
  const times: string[] = (structure?.dimensions?.observation?.[0]?.values ?? []).map((v: any) => String(v.id));
  const series = ds?.series ? Object.values(ds.series)[0] as any : null;
  if (!series?.observations) return [];
  return Object.entries(series.observations)
    .map(([k, v]: [string, any]) => ({ period: times[Number(k)], value: Number(Array.isArray(v) ? v[0] : NaN) }))
    .filter((o) => o.period && Number.isFinite(o.value))
    .sort((a, b) => a.period.localeCompare(b.period));
}

const ecb = async (key: string, n = 1) =>
  sdmxObservations(await getJson(`${ECB}/${key}?lastNObservations=${n}&format=jsondata`));

const bis = async (area: string) =>
  sdmxObservations(await getJson(`${BIS}/D.${area}?lastNObservations=1`, 'application/vnd.sdmx.data+json;version=1.0.0'));

async function eurostat(dataset: string, query: string): Promise<Obs[]> {
  const j = await getJson(`${EUROSTAT}/${dataset}?${query}&lastTimePeriod=4`);
  const index: Record<string, number> = j?.dimension?.time?.category?.index ?? {};
  // Eurostat leaves a period it has no value for out of `value` altogether.
  return Object.entries(index)
    .map(([period, i]) => ({ period, raw: j?.value?.[String(i)] }))
    .filter((o) => o.raw !== undefined && o.raw !== null && Number.isFinite(Number(o.raw)))
    .map((o) => ({ period: o.period, value: Number(o.raw) }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

/** "2026-10-22", "2026-09", "2026-Q2": the date a figure is true at, and how to say it. */
function dated(period: string): { asOf: string; text: string } | null {
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(period);
  if (m) return { asOf: period, text: `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` };
  m = /^(\d{4})-(\d{2})$/.exec(period);
  if (m) {
    const last = new Date(Date.UTC(Number(m[1]), Number(m[2]), 0)).getUTCDate();
    return { asOf: `${m[1]}-${m[2]}-${String(last).padStart(2, '0')}`, text: `${MONTHS[Number(m[2]) - 1]} ${m[1]}` };
  }
  m = /^(\d{4})-Q([1-4])$/.exec(period);
  if (m) {
    const month = Number(m[2]) * 3;
    const last = new Date(Date.UTC(Number(m[1]), month, 0)).getUTCDate();
    return { asOf: `${m[1]}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`, text: `the ${['first', 'second', 'third', 'fourth'][Number(m[2]) - 1]} quarter of ${m[1]}` };
  }
  return null;
}

interface Spec {
  slug: string;
  /** The latest observation, or the reason there is none. */
  read: () => Promise<Obs | null>;
  /** A value outside this range is a reading error, not news. */
  range: [number, number];
}

const latest = (obs: Obs[]) => (obs.length ? obs[obs.length - 1] : null);

const SPECS: Spec[] = [
  { slug: 'mkt_hicp', range: [-10, 40], read: async () => latest(await ecb('HICP/M.U2.N.000000.4D0.ANR')) },
  { slug: 'mkt_hicp_core', range: [-10, 40], read: async () => latest(await ecb('HICP/M.U2.N.XEF000.4D0.ANR')) },
  { slug: 'mkt_unemployment', range: [0, 40], read: async () => latest(await ecb('LFSI/M.U2.S.UNEHRT.TOTAL0.15_74.T')) },
  {
    slug: 'mkt_gdp_qoq', range: [-20, 20],
    read: async () => latest(await eurostat('namq_10_gdp', 'geo=EA&unit=CLV_PCH_PRE&s_adj=SCA&na_item=B1GQ')),
  },
  { slug: 'mkt_ecb_dfr', range: [-2, 20], read: async () => latest(await ecb('FM/D.U2.EUR.4F.KR.DFR.LEV')) },
  { slug: 'mkt_estr', range: [-2, 20], read: async () => latest(await ecb('EST/B.EU000A2X2A25.WT')) },
  { slug: 'mkt_aaa_2y', range: [-3, 20], read: async () => latest(await ecb('YC/B.U2.EUR.4F.G_N_A.SV_C_YM.SR_2Y')) },
  { slug: 'mkt_aaa_10y', range: [-3, 20], read: async () => latest(await ecb('YC/B.U2.EUR.4F.G_N_A.SV_C_YM.SR_10Y')) },
  {
    // The spread is the one figure computed here: the two yields of the
    // latest month both are published for, in basis points.
    slug: 'mkt_btp_bund', range: [-200, 2000],
    read: async () => {
      const [it, de] = await Promise.all([ecb('IRS/M.IT.L.L40.CI.0000.EUR.N.Z', 3), ecb('IRS/M.DE.L.L40.CI.0000.EUR.N.Z', 3)]);
      const both = it.filter((o) => de.some((d) => d.period === o.period));
      const last = latest(both);
      if (!last) return null;
      const d = de.find((x) => x.period === last.period) as Obs;
      return { period: last.period, value: Math.round((last.value - d.value) * 100) };
    },
  },
  { slug: 'mkt_eurusd', range: [0.3, 3], read: async () => latest(await ecb('EXR/D.USD.EUR.SP00.A')) },
  { slug: 'mkt_fed_rate', range: [-2, 25], read: async () => latest(await bis('US')) },
  { slug: 'mkt_boe_rate', range: [-2, 25], read: async () => latest(await bis('GB')) },
];

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return json({ error: 'Server configuration error' }, 500);

  const auth = req.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : '';
  if (parseJwtClaims(token)?.role !== 'service_role') return json({ error: 'Forbidden' }, 403);

  let body: any = {};
  try { body = await req.json(); } catch { /* an empty body is a missing action */ }
  if (body?.action !== 'refresh') return json({ error: 'Unknown action' }, 400);

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const results = await Promise.all(SPECS.map(async (spec) => {
    try {
      const obs = await spec.read();
      if (!obs) return { slug: spec.slug, ok: false, reason: 'no observation' };
      const when = dated(obs.period);
      if (!when) return { slug: spec.slug, ok: false, reason: `unreadable period ${obs.period}` };
      if (obs.value < spec.range[0] || obs.value > spec.range[1]) {
        return { slug: spec.slug, ok: false, reason: `value ${obs.value} outside ${spec.range.join(' to ')}` };
      }
      const { error } = await sb.rpc('kn_put', {
        p_slug: spec.slug,
        p_value: obs.value,
        p_as_of: when.asOf,
        p_period: null,
        p_vars: { period_text: when.text, date_text: when.text },
        p_ok: true,
      });
      if (error) return { slug: spec.slug, ok: false, reason: error.message };
      return { slug: spec.slug, ok: true, period: obs.period, value: obs.value };
    } catch (e) {
      return { slug: spec.slug, ok: false, reason: e instanceof Error ? e.message : String(e) };
    }
  }));
  const failed = results.filter((r) => !r.ok);
  if (failed.length) console.error('macro-monitor: not updated', JSON.stringify(failed));
  return json({ updated: results.length - failed.length, failed: failed.length, results });
});
