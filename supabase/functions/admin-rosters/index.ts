/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { audited } from '../_shared/activity.ts';
import { readJsonObject, UNREADABLE_BODY, type LooseBody } from '../_shared/request-body.ts';
import { ROLE_LABEL_MAX, ROSTER_DIVISIONS, ROSTER_TEAMS, SEMESTER_KEY, rosterDivisionLabel, semesterLabel } from '../_shared/rosters.ts';
import { renderRoster, type RosterPdfRow } from './pdf.ts';

// =====================================================================
// admin-rosters: the semester rosters' one write path (Step 94), behind
// People > Time Machine (Step 94B).
// ---------------------------------------------------------------------
//   pdf               a semester's roster as a document, limited to what
//                     the caller may read (the database decides:
//                     public.roster_semester_for). Recorded as a download.
//   update / delete   correct or remove one entry of a PAST semester;
//   add               add a person to a past semester;
//   set-public-hidden leave a person out of the public past Boards (an
//                     objection under the Privacy Policy, section 9);
//   pending-dismiss   a former member in "to complete" is not an alumnus.
//   search-people     find a person to add (a read).
//
// Changes are the President's and the Vice-President's only (and the
// association account's), on the server as in the interface. The current
// semester is never changed here: it follows the member register.
// Every change is recorded by the audit wrapper.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const ACTIONS = ['pdf', 'update', 'delete', 'add', 'set-public-hidden', 'pending-dismiss', 'search-people'] as const;
type Action = (typeof ACTIONS)[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DIVISION_KEYS = new Set(ROSTER_DIVISIONS.map((d) => d.key as string));

const ordinal = (key: string) => Number(key.slice(0, 4)) * 2 + (key.endsWith('fall') ? 1 : 0);

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(bin);
}

/** A role, a division and a team that belong together, or why not. */
function checkEntry(body: LooseBody): { role: string; division: string; team: string | null } | string {
  const role = typeof body.role === 'string' ? body.role.replace(/\s+/g, ' ').trim() : '';
  if (!role) return 'The role is required.';
  if (role.length > ROLE_LABEL_MAX) return `The role is longer than ${ROLE_LABEL_MAX} characters.`;
  const division = typeof body.division === 'string' ? body.division : '';
  if (!DIVISION_KEYS.has(division)) return 'Choose a division.';
  const team = typeof body.team === 'string' && body.team ? body.team : null;
  if (team && !ROSTER_TEAMS.some((t) => t.key === team && t.division === division)) return 'That team does not belong to this division.';
  return { role, division, team };
}

Deno.serve(audited('admin-rosters', async (req, audit) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    if (!token) return json({ error: 'Unauthorized' }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Invalid token' }, 401);

    const { data: roleRows } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    audit.actor(user, (roleRows || []).map((r: { role: string }) => r.role));

    const parsed = await readJsonObject(req);
    if (!parsed) return json({ error: UNREADABLE_BODY }, 400);
    const body = parsed as LooseBody;
    const action = body.action as Action;
    if (!ACTIONS.includes(action)) return json({ error: 'Invalid action' }, 400);
    audit.request(action, body);

    // What this person may do, as the database sees it.
    const { data: access, error: accessError } = await supabase.rpc('roster_access', { p_uid: user.id });
    if (accessError) throw accessError;
    const scope = (access as any)?.scope as string;
    const canEdit = !!(access as any)?.can_edit;
    if (!scope || scope === 'none') return json({ error: 'You cannot open the Time Machine.' }, 403);

    const { data: current } = await supabase.rpc('current_semester_key');
    const isPast = (key: string) => SEMESTER_KEY.test(key) && typeof current === 'string' && ordinal(key) < ordinal(current);

    // ── The roster as a document ─────────────────────────────────────
    if (action === 'pdf') {
      const key = String(body.semester_key ?? '');
      if (!SEMESTER_KEY.test(key)) return json({ error: 'Unknown semester.' }, 400);
      const { data: roster, error } = await supabase.rpc('roster_semester_for', { p_uid: user.id, p_key: key });
      if (error) return json({ error: error.message }, 403);
      const r = roster as any;
      const rows = (r.rows || []) as RosterPdfRow[];
      const divisions = (r.divisions || []) as string[];
      const scopeLabel = r.scope === 'all' ? 'Every division' : divisions.map(rosterDivisionLabel).join(', ');
      const pdf = await renderRoster({ semesterLabel: r.label, scopeLabel, live: !!r.live, rows, generatedAt: new Date() });
      audit.subject(`Roster, ${r.label}`, null);
      audit.note({ rows: rows.length, scope: r.scope });
      return json({ file_name: `MIMS Roster ${r.label}.pdf`, pdf: toBase64(pdf) });
    }

    // Everything below changes the record: the President and the Vice-President.
    if (!canEdit) return json({ error: 'Only the President and the Vice-President can correct a past semester.' }, 403);

    if (action === 'search-people') {
      const q = String(body.q ?? '').trim();
      if (q.length < 2) return json({ people: [] });
      const like = `%${q.replace(/[%_]/g, '')}%`;
      const { data, error } = await supabase.from('people').select('id, first_name, surname')
        .or(`first_name.ilike.${like},surname.ilike.${like}`).order('surname').limit(12);
      if (error) throw error;
      return json({ people: data || [] });
    }

    if (action === 'update' || action === 'delete') {
      const id = String(body.entry_id ?? '');
      if (!UUID.test(id)) return json({ error: 'Unknown entry.' }, 400);
      const { data: entry } = await supabase.from('roster_entries')
        .select('id, semester_key, role_label, division_key, team, person_id, people(first_name, surname)').eq('id', id).maybeSingle();
      if (!entry) return json({ error: 'Unknown entry.' }, 404);
      if (!isPast(entry.semester_key)) return json({ error: 'The current semester follows the member register: change it in People, Members.' }, 409);
      const who = entry.people ? `${(entry.people as any).first_name} ${(entry.people as any).surname}` : 'Entry';
      audit.subject(`${who}, ${semesterLabel(entry.semester_key)}`, id);

      if (action === 'delete') {
        const { error } = await supabase.from('roster_entries').delete().eq('id', id);
        if (error) throw error;
        audit.note({ role: entry.role_label, division: entry.division_key });
        return json({ success: true });
      }

      const next = checkEntry(body);
      if (typeof next === 'string') return json({ error: next }, 400);
      const { error } = await supabase.from('roster_entries').update({
        role_label: next.role, division_key: next.division, team: next.team,
        source: 'edit', updated_by: user.id, updated_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) {
        if ((error as any).code === '23505') return json({ error: 'This person already holds that role in that semester.' }, 409);
        throw error;
      }
      audit.note({ from: { role: entry.role_label, division: entry.division_key, team: entry.team }, to: next });
      return json({ success: true });
    }

    if (action === 'add') {
      const key = String(body.semester_key ?? '');
      if (!isPast(key)) return json({ error: 'Only a past semester can be corrected here.' }, 409);
      const next = checkEntry(body);
      if (typeof next === 'string') return json({ error: next }, 400);
      let personId = typeof body.person_id === 'string' && UUID.test(body.person_id) ? body.person_id : null;
      let name = '';
      if (personId) {
        const { data: p } = await supabase.from('people').select('id, first_name, surname').eq('id', personId).maybeSingle();
        if (!p) return json({ error: 'Unknown person.' }, 404);
        name = `${p.first_name} ${p.surname}`;
      } else {
        const first = String(body.first_name ?? '').replace(/\s+/g, ' ').trim();
        const surname = String(body.surname ?? '').replace(/\s+/g, ' ').trim();
        if (!first || !surname || first.length > 100 || surname.length > 100) return json({ error: 'First name and surname are required.' }, 400);
        const { data: created, error } = await supabase.rpc('person_create', { p_first: first, p_surname: surname });
        if (error) throw error;
        personId = created as string;
        name = `${first} ${surname}`;
      }
      const { data: row, error } = await supabase.from('roster_entries').insert({
        person_id: personId, semester_key: key, role_label: next.role, division_key: next.division,
        team: next.team, source: 'edit', updated_by: user.id,
      }).select('id').single();
      if (error) {
        if ((error as any).code === '23505') return json({ error: 'This person already holds that role in that semester.' }, 409);
        throw error;
      }
      audit.subject(`${name}, ${semesterLabel(key)}`, row.id);
      audit.note({ role: next.role, division: next.division, team: next.team });
      return json({ success: true, entry_id: row.id });
    }

    if (action === 'set-public-hidden') {
      const id = String(body.person_id ?? '');
      if (!UUID.test(id)) return json({ error: 'Unknown person.' }, 400);
      const hidden = body.hidden === true;
      const { data: p, error } = await supabase.from('people').update({ public_hidden: hidden }).eq('id', id)
        .select('first_name, surname').maybeSingle();
      if (error) throw error;
      if (!p) return json({ error: 'Unknown person.' }, 404);
      audit.subject(`${p.first_name} ${p.surname}`, id);
      audit.note({ public_hidden: hidden });
      return json({ success: true });
    }

    if (action === 'pending-dismiss') {
      const id = String(body.pending_id ?? '');
      if (!UUID.test(id)) return json({ error: 'Unknown item.' }, 400);
      const { data: item, error } = await supabase.from('alumni_pending')
        .update({ status: 'dismissed', resolved_at: new Date().toISOString(), resolved_by: user.id })
        .eq('id', id).eq('status', 'open').select('id, people(first_name, surname)').maybeSingle();
      if (error) throw error;
      if (!item) return json({ error: 'This former member is no longer waiting.' }, 404);
      audit.subject(item.people ? `${(item.people as any).first_name} ${(item.people as any).surname}` : 'Former member', id);
      audit.note({ decision: 'not an alumnus' });
      return json({ success: true });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('admin-rosters error:', error);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
}));
