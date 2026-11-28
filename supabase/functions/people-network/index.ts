import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { audited } from '../_shared/activity.ts';
import { allows, rolesOf } from '../_shared/access.ts';
import { readJsonObject, UNREADABLE_BODY } from '../_shared/request-body.ts';
import { isScheduledJob } from '../_shared/job-token.ts';
import {
  analyseNetwork, inputFingerprint, semesterLabel, semesterOrdinal,
  type NetworkGroup, type NetworkResult,
} from '../_shared/network-engine.ts';

// =====================================================================
// people-network: People > Network (Steps 111 and 112).
// ---------------------------------------------------------------------
// Builds the network of the Society from `network_input()` (reports
// written together, Boards served on together, divisions shared,
// interviews, and the President and the Vice-President with the members
// of their semester), measures every person's position with
// `_shared/network-engine.ts`, grouping people by their division, stores
// it (`network_store`) and serves the page (`network_read`).
//
//   read     the latest analysis, the semesters, and (for those who
//            manage the page) who is left out
//   exclude  leave a person out (they objected: Privacy Policy, section
//            8); their stored results are deleted at once, and the
//            network is analysed again without them in a call of its own
//   include  bring them back, the same way
//   tick     the database's job (its own token), twice a month (once in
//            January, July and August): the current network when its
//            data changed, then every semester still to analyse
//
// Who: the page's row of the role matrix (`people-network`): the Board,
// alumni and advisors read it; the President, the Vice-President and the
// association account manage it. Nothing here sends an email.
//
// THE WORK FITS THE RUNTIME. An edge function has about two seconds of
// processor time. A run analyses what fits in its budget and, if
// semesters are still to do, calls itself again (with the service key,
// never reachable from a browser) until none is left, so every semester
// is in the table after one run (Step 112: one used to wait a day). A
// person's request never does the analysis itself: it records what they
// asked, at once, and leaves the work to such a call, so the request is
// light and its Activity Log entry is always written.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

const RESOURCE = 'people-network';
/** Milliseconds of analysis per call, well inside the runtime's limit. */
const BUDGET_MS = 900;
/** How many further calls one run may make to finish the semesters. */
const MAX_HOPS = 12;
const NODE = /^(m:)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface InputPerson { id: string; name: string; first: string | null; last: string | null; current: boolean; division?: string | null }
interface Input { current: string; groups: NetworkGroup[]; people: InputPerson[]; divisions: Record<string, string> }

// deno-lint-ignore no-explicit-any
type Client = any;

async function readInput(supabase: Client): Promise<Input> {
  const { data, error } = await supabase.rpc('network_input');
  if (error) throw error;
  const v = (data ?? {}) as Partial<Input>;
  const people = v.people ?? [];
  const divisions: Record<string, string> = {};
  for (const p of people) if (p.division) divisions[p.id] = p.division;
  return { current: String(v.current ?? ''), groups: v.groups ?? [], people, divisions };
}

/** The past semesters the history covers: those with groups, before the current one. */
function pastSemesters(input: Input): string[] {
  const now = semesterOrdinal(input.current);
  return [...new Set(input.groups.map((g) => g.semester))]
    .filter((s) => semesterOrdinal(s) < now)
    .sort((a, b) => semesterOrdinal(a) - semesterOrdinal(b));
}

const fingerprintOf = (input: Input, until: string | null) => inputFingerprint(input.groups, until, input.divisions);

function summaryOf(r: NetworkResult) {
  return {
    people: r.people, connected: r.connected, ties: r.ties, communities: r.communities,
    modularity: r.modularity, groups: r.groups,
    ...(r.divisions ? { divisions: r.divisions } : {}),
    ...(r.robustness ? { robustness: r.robustness } : {}),
  };
}

function scoreRows(r: NetworkResult, people: Map<string, InputPerson>) {
  return r.scores.map((s) => {
    const p = people.get(s.id);
    return {
      node: s.id, name: p?.name ?? 'Unknown', first_semester: p?.first ?? null, last_semester: p?.last ?? null,
      is_current: !!p?.current, degree: s.degree, strength: s.strength, status: s.status, mediation: s.mediation,
      coalition: s.coalition, cohesion: s.cohesion, ego: s.ego, reach: s.reach, community: s.community,
      overall: s.overall, rank_status: s.rank.status, rank_mediation: s.rank.mediation,
      rank_coalition: s.rank.coalition, rank_overall: s.rank.overall, x: s.x ?? null, y: s.y ?? null, groups: s.groups,
      division: s.division ?? null,
    };
  });
}

/** Analyses the network as it is now and stores it. */
async function runCurrent(supabase: Client, input: Input) {
  const people = new Map(input.people.map((p) => [p.id, p]));
  const t = performance.now();
  const r = analyseNetwork(input.groups, { layout: true, ties: true, robustness: true, divisions: input.divisions });
  const ms = performance.now() - t;
  const { error } = await supabase.rpc('network_store', {
    p: {
      kind: 'update', semester: input.current, fingerprint: fingerprintOf(input, null),
      summary: summaryOf(r), scores: scoreRows(r, people), ties: r.tieList ?? [],
    },
  });
  if (error) throw error;
  return { ms, summary: summaryOf(r) };
}

/** Analyses past semesters whose data changed, while the budget lasts. */
async function fillHistory(supabase: Client, input: Input, budgetMs: number) {
  const { data, error } = await supabase.from('network_runs').select('semester_key, fingerprint').eq('kind', 'semester');
  if (error) throw error;
  const stored = new Map(((data || []) as { semester_key: string; fingerprint: string }[]).map((r) => [r.semester_key, r.fingerprint]));
  const people = new Map(input.people.map((p) => [p.id, p]));
  const due = pastSemesters(input).filter((s) => stored.get(s) !== fingerprintOf(input, s));
  let spent = 0;
  const done: string[] = [];
  for (const semester of due) {
    if (spent >= budgetMs) break;
    const t = performance.now();
    const r = analyseNetwork(input.groups, { until: semester, divisions: input.divisions });
    spent += performance.now() - t;
    const { error: e } = await supabase.rpc('network_store', {
      p: { kind: 'semester', semester, fingerprint: fingerprintOf(input, semester), summary: summaryOf(r), scores: scoreRows(r, people) },
    });
    if (e) throw e;
    done.push(semester);
  }
  return { done, pending: due.length - done.length };
}

/** How many past semesters are analysed on their current data. */
function historyState(input: Input, semesters: { semester: string; fingerprint: string }[]) {
  const stored = new Map(semesters.map((s) => [s.semester, s.fingerprint]));
  const all = pastSemesters(input);
  const ready = all.filter((s) => stored.get(s) === fingerprintOf(input, s)).length;
  return { ready, total: all.length };
}

/**
 * A further call of this function, to carry on the work: with the
 * service key, so only the function itself can make it. The runtime keeps
 * this call alive until the request is sent and answered.
 */
function carryOn(url: string, serviceKey: string, body: Record<string, unknown>) {
  const p = fetch(`${url}/functions/v1/people-network`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => r.body?.cancel()).catch(() => undefined);
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime;
  if (rt && typeof rt.waitUntil === 'function') rt.waitUntil(p);
}

Deno.serve(audited('people-network', async (req, audit) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const body = await readJsonObject(req);
    if (!body) return json({ error: UNREADABLE_BODY }, 400);
    const action = typeof body.action === 'string' ? body.action : '';

    // ── The database's job, and the function carrying on its own work ──
    if (action === 'tick') {
      const allowed = (!!token && token === serviceKey) || await isScheduledJob(supabase, req, 'people_network');
      if (!allowed) return json({ error: 'Forbidden' }, 403);
      const hop = typeof body.hop === 'number' && Number.isFinite(body.hop) ? Math.max(0, Math.floor(body.hop)) : 0;
      const input = await readInput(supabase);
      let ran: string | null = null;
      let spent = 0;
      if (body.continue !== true) {
        const { data } = await supabase.from('network_runs').select('fingerprint').in('kind', ['weekly', 'update'])
          .order('computed_at', { ascending: false }).limit(1);
        const latest = (data || [])[0] as { fingerprint: string } | undefined;
        if (body.force === true || !latest || latest.fingerprint !== fingerprintOf(input, null)) {
          spent += (await runCurrent(supabase, input)).ms;
          ran = 'update';
        }
      }
      const history = await fillHistory(supabase, input, Math.max(0, BUDGET_MS - spent));
      // Semesters still to do: another call, while each call gets some done.
      if (history.pending > 0 && history.done.length > 0 && hop < MAX_HOPS) {
        carryOn(url, serviceKey, { action: 'tick', continue: true, hop: hop + 1 });
      }
      return json({ ran, history });
    }

    // ── Everybody else is a signed-in person whose role opens the page ──
    if (!token) return json({ error: 'Please sign in.' }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Your session has expired. Please sign in again.' }, 401);
    const { data: roleRows } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const roles = rolesOf(roleRows as { role: string }[] | null);
    audit.actor(user, roles);
    audit.request(action, body);
    if (!allows(roles, user.email, RESOURCE, 'view')) {
      return json({ error: 'People > Network is open to the Board, alumni and advisors.' }, 403);
    }
    const canManage = allows(roles, user.email, RESOURCE, 'manage');

    if (action === 'read') {
      const [{ data, error }, input] = await Promise.all([supabase.rpc('network_read'), readInput(supabase)]);
      if (error) throw error;
      const v = (data ?? {}) as {
        current?: string;
        latest?: { scores?: Record<string, unknown>[]; ties?: unknown[][]; fingerprint?: string; [k: string]: unknown } | null;
        semesters?: { semester: string; fingerprint: string; summary: unknown; computed_at: string; ranks: unknown }[];
        excluded?: unknown[];
      };
      const semesters = v.semesters ?? [];
      const latest = v.latest ?? null;
      const current = v.current ?? input.current;
      return json({
        canManage,
        current,
        currentLabel: semesterLabel(current),
        upToDate: !!latest && latest.fingerprint === fingerprintOf(input, null),
        latest,
        // Every past semester, analysed or still to analyse, so none is missing from the page.
        allSemesters: pastSemesters(input).map((s) => ({ semester: s, label: semesterLabel(s) })),
        semesters: semesters.map((s) => ({ semester: s.semester, label: semesterLabel(s.semester), computed_at: s.computed_at, summary: s.summary, ranks: s.ranks })),
        history: historyState(input, semesters),
        // Who objected is for the people who manage the page only.
        excluded: canManage ? (v.excluded ?? []) : [],
      });
    }

    if (!canManage) return json({ error: 'Only the President and the Vice-President leave someone out of the analysis.' }, 403);

    if (action === 'exclude' || action === 'include') {
      const node = typeof body.node === 'string' ? body.node.trim() : '';
      if (!NODE.test(node)) return json({ error: 'Choose a person.' }, 400);
      const name = typeof body.name === 'string' ? body.name.trim().slice(0, 160) : '';
      const note = typeof body.note === 'string' ? body.note.trim().slice(0, 300) : '';
      const out = action === 'exclude';
      let shownName = name;
      if (!out) {
        const { data } = await supabase.from('network_exclusions').select('name').eq('node', node).maybeSingle();
        shownName = (data as { name?: string } | null)?.name ?? name;
      }
      const { error } = await supabase.rpc('network_set_excluded', { p_node: node, p_name: name, p_note: note, p_by: user.id, p_out: out });
      if (error) throw error;
      // The network without them (or with them again), analysed in a call of its own.
      carryOn(url, serviceKey, { action: 'tick', force: true });
      audit.subject(shownName || 'a person', null);
      return json({ success: true });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('people-network error:', error);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
}));
