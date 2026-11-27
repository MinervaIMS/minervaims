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
// people-network: People > Network (Step 111).
// ---------------------------------------------------------------------
// Builds the network of the Society from `network_input()` (reports
// written together, Boards served on together, divisions shared and interviews
// in the same semester), measures every person's position with
// `_shared/network-engine.ts`, stores it (`network_store`) and serves the
// page (`network_read`).
//
//   read       the latest analysis, the weekly points, the semesters, and
//              (for those who manage the page) who is left out
//   recompute  analyse now, then complete the semesters still to do
//   exclude    leave a person out (they objected: Privacy Policy, section
//              8); their stored results are deleted at once
//   include    bring them back
//   tick       the database's daily job (its own token): the week's point
//              once a week, a refresh when the data changed, and the
//              semesters still to do
//
// Who: the page's row of the role matrix (`people-network`): the Board,
// alumni and advisors read it; the President, the Vice-President and the
// association account manage it. Nothing here sends an email.
//
// THE WORK FITS THE RUNTIME. An edge function has about two seconds of
// processor time. The current network comes first; past semesters are
// analysed while the budget lasts, each only when its data changed (a
// fingerprint of its inputs), and the next call carries on where this one
// stopped.
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
const NODE = /^(m:)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface InputPerson { id: string; name: string; first: string | null; last: string | null; current: boolean }
interface Input { current: string; groups: NetworkGroup[]; people: InputPerson[] }

// deno-lint-ignore no-explicit-any
type Client = any;

/** ISO week of a day, "2026-W48" (weeks start on Monday). */
function isoWeek(day: Date): string {
  const d = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function readInput(supabase: Client): Promise<Input> {
  const { data, error } = await supabase.rpc('network_input');
  if (error) throw error;
  const v = (data ?? {}) as Partial<Input>;
  return { current: String(v.current ?? ''), groups: v.groups ?? [], people: v.people ?? [] };
}

/** The past semesters the history covers: those with groups, before the current one. */
function pastSemesters(input: Input): string[] {
  const now = semesterOrdinal(input.current);
  return [...new Set(input.groups.map((g) => g.semester))]
    .filter((s) => semesterOrdinal(s) < now)
    .sort((a, b) => semesterOrdinal(a) - semesterOrdinal(b));
}

function summaryOf(r: NetworkResult) {
  return {
    people: r.people, connected: r.connected, ties: r.ties, communities: r.communities,
    modularity: r.modularity, groups: r.groups, ...(r.robustness ? { robustness: r.robustness } : {}),
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
    };
  });
}

/** Analyses the network as it is now and stores it as this week's point or an update. */
async function runCurrent(supabase: Client, input: Input, kind: 'weekly' | 'update', requestedBy: string | null) {
  const people = new Map(input.people.map((p) => [p.id, p]));
  const t = performance.now();
  const r = analyseNetwork(input.groups, { layout: true, ties: true, robustness: true });
  const ms = performance.now() - t;
  const { error } = await supabase.rpc('network_store', {
    p: {
      kind, semester: input.current, week: isoWeek(new Date()), fingerprint: inputFingerprint(input.groups, null),
      summary: summaryOf(r), requested_by: requestedBy, scores: scoreRows(r, people), ties: r.tieList ?? [],
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
  const due = pastSemesters(input).filter((s) => stored.get(s) !== inputFingerprint(input.groups, s));
  let spent = 0;
  const done: string[] = [];
  for (const semester of due) {
    if (spent >= budgetMs) break;
    const t = performance.now();
    const r = analyseNetwork(input.groups, { until: semester });
    spent += performance.now() - t;
    const { error: e } = await supabase.rpc('network_store', {
      p: { kind: 'semester', semester, fingerprint: inputFingerprint(input.groups, semester), summary: summaryOf(r), scores: scoreRows(r, people) },
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
  const ready = all.filter((s) => stored.get(s) === inputFingerprint(input.groups, s)).length;
  return { ready, total: all.length };
}

async function hasWeek(supabase: Client): Promise<boolean> {
  const { data } = await supabase.from('network_runs').select('id').eq('kind', 'weekly').eq('week', isoWeek(new Date())).limit(1);
  return !!(data && data.length);
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

    // ── The database's own daily job ──
    if (action === 'tick') {
      const allowed = (!!token && token === serviceKey) || await isScheduledJob(supabase, req, 'people_network');
      if (!allowed) return json({ error: 'Forbidden' }, 403);
      const input = await readInput(supabase);
      let ran: string | null = null;
      let spent = 0;
      if (!(await hasWeek(supabase))) {
        spent += (await runCurrent(supabase, input, 'weekly', null)).ms;
        ran = 'weekly';
      } else {
        const { data } = await supabase.from('network_runs').select('fingerprint').in('kind', ['weekly', 'update'])
          .order('computed_at', { ascending: false }).limit(1);
        const latest = (data || [])[0] as { fingerprint: string } | undefined;
        if (!latest || latest.fingerprint !== inputFingerprint(input.groups, null)) {
          spent += (await runCurrent(supabase, input, 'update', null)).ms;
          ran = 'update';
        }
      }
      const history = await fillHistory(supabase, input, Math.max(0, BUDGET_MS - spent));
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
        latest?: { scores?: Record<string, unknown>[]; ties?: unknown[][]; [k: string]: unknown } | null;
        weeks?: unknown[];
        semesters?: { semester: string; fingerprint: string; summary: unknown; computed_at: string; ranks: unknown }[];
        excluded?: unknown[];
      };
      const semesters = v.semesters ?? [];
      const latest = v.latest ?? null;
      return json({
        canManage,
        current: v.current ?? input.current,
        currentLabel: semesterLabel(v.current ?? input.current),
        upToDate: !!latest && latest.fingerprint === inputFingerprint(input.groups, null),
        latest,
        weeks: v.weeks ?? [],
        semesters: semesters.map((s) => ({ semester: s.semester, label: semesterLabel(s.semester), computed_at: s.computed_at, summary: s.summary, ranks: s.ranks })),
        history: historyState(input, semesters),
        // Who objected is for the people who manage the page only.
        excluded: canManage ? (v.excluded ?? []) : [],
      });
    }

    if (!canManage) return json({ error: 'Only the President and the Vice-President run the analysis or leave someone out.' }, 403);

    if (action === 'recompute') {
      const input = await readInput(supabase);
      const kind = (await hasWeek(supabase)) ? 'update' : 'weekly';
      const now = await runCurrent(supabase, input, kind, user.id);
      const history = await fillHistory(supabase, input, Math.max(0, BUDGET_MS - now.ms));
      audit.subject('the network of the Society', null);
      audit.note({ people: now.summary.people, ties: now.summary.ties, semesters: history.done.length });
      return json({ success: true, summary: now.summary, history });
    }

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
      // The network without them (or with them again), at once; the
      // semesters follow within the budget and on the nightly run.
      const input = await readInput(supabase);
      const kind = (await hasWeek(supabase)) ? 'update' : 'weekly';
      const now = await runCurrent(supabase, input, kind, user.id);
      await fillHistory(supabase, input, Math.max(0, BUDGET_MS - now.ms));
      audit.subject(shownName || 'a person', null);
      return json({ success: true });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('people-network error:', error);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
}));
