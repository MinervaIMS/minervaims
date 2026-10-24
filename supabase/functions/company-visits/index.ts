import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { audited } from '../_shared/activity.ts';
import { OWNER_EMAIL, rolesOf } from '../_shared/access.ts';
import { readJsonObject, UNREADABLE_BODY } from '../_shared/request-body.ts';
import { makeZip } from '../_shared/zip.ts';
import { EVENT_CVS_BUCKET, removeEventCvs } from '../_shared/event-cvs.ts';

// =====================================================================
// company-visits: interest, selection and invitations (Step 93B).
// ---------------------------------------------------------------------
// A company visit with a closing date (events.interest_closes_at) does
// not take registrations: members and alumni register their INTEREST
// with their CV until the form closes, and the President and the Vice
// President choose who goes. Participants are selected solely on their
// active participation in the Society's activities and their
// demonstrated interest in the topic of the visit; the CV plays no part
// in the selection, and the form says so.
//
// Members and alumni (signed in):
//   mine         their interest for one visit, or for every open one
//   upload-url   a one-time link to put their CV (PDF) in private storage
//   submit       records the interest with that CV (or replaces the CV
//                while the form is open and nothing has been decided);
//                the first time, the "interest received" email
//
// The President and the Vice President (and the admin account):
//   list         the candidates of a visit with their participation
//                record (company_visit_candidates), the drafts, what each
//                was told, and the counters
//   decide       drafts Invite / Not this time / Undecided; nobody is told
//   close-now    closes the interest form at once
//   send         sends every draft at once: an invitation (a place on the
//                attendance list, with the ticket) or the kind "another
//                time" email, which keeps the member as a reserve
//   open-place   offers a reserve a place that opened up ("A place has
//                opened up")
//   withdraw     records that an invited member wrote to say they cannot
//                come: their place is freed for a reserve. Nobody can
//                withdraw themselves (no link in any email).
//   cv-url       a short-lived link to open one CV
//   cvs-zip      the CVs of the members invited, in one ZIP, for a host
//                that asks for them
//
// The database (the service role, once a day): cleanup deletes the CVs
// six months after the visit (Privacy Policy, section 15), every file in
// the visit's folder, and those of visits that no longer exist.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'Content-Disposition, Content-Length',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

const BUCKET = EVENT_CVS_BUCKET;
const MAX_CV = 10 * 1024 * 1024;
const SELECTOR_ROLES = ['admin', 'president', 'vice_president'];
const CONTACT = 'as.minerva@unibocconi.it';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CV_RETENTION_MONTHS = 6;

type EventRow = {
  id: string; title: string; date: string | null; start_at: string | null; end_at: string | null; place: string | null;
  online: boolean | null; event_type: string; registration_enabled: boolean; capacity: number | null;
  interest_closes_at: string | null; description: string | null;
};
type Interest = {
  id: string; event_id: string; user_id: string; member_id: string | null; kind: 'member' | 'alumni'; name: string; email: string;
  cv_path: string | null; cv_name: string | null; cv_size: number | null; submitted_at: string; updated_at: string;
  decision: 'pending' | 'invite' | 'not_selected'; decided_by: string | null; decided_at: string | null;
  notified: 'invited' | 'not_selected' | null; notified_at: string | null; spot_opened_at: string | null;
  registration_id: string | null; withdrawn_at: string | null; withdrawn_by: string | null; cv_deleted_at: string | null;
};

const EVENT_COLS = 'id, title, date, start_at, end_at, place, online, event_type, registration_enabled, capacity, interest_closes_at, description';

/** Does this visit select its participants? */
const selects = (e: Pick<EventRow, 'event_type' | 'interest_closes_at'> | null | undefined) =>
  !!e && e.event_type === 'company_visit' && !!e.interest_closes_at;

const isOpen = (e: EventRow, now = Date.now()) =>
  selects(e) && e.registration_enabled && Date.parse(e.interest_closes_at!) > now;

const hasStarted = (e: EventRow, now = Date.now()) => {
  if (e.start_at) return Date.parse(e.start_at) <= now;
  if (e.date) return e.date.slice(0, 10) < new Date(now).toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' });
  return false;
};

const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** What a member sees of their own interest: only what they have been told. */
function memberView(i: Interest) {
  return {
    event_id: i.event_id,
    status: i.notified === 'invited' ? (i.withdrawn_at ? 'withdrawn' : 'invited') : i.notified === 'not_selected' ? 'not_selected' : 'received',
    submitted_at: i.submitted_at,
    cv_name: i.cv_name,
    spot_opened: !!i.spot_opened_at,
  };
}

/** A safe file name for a CV in the ZIP. */
const fileName = (name: string) =>
  [...name].filter((c) => c >= ' ' && !'\\/:*?"<>|'.includes(c)).join('').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Member';

Deno.serve(audited('company-visits', async (req, audit) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const body = await readJsonObject(req);
    if (!body) return json({ error: UNREADABLE_BODY }, 400);
    const action = str(body.action, 40);

    // ── The database's own job: delete CVs six months after the visit ──
    if (action === 'cleanup') {
      if (!token || token !== serviceKey) return json({ error: 'Forbidden' }, 403);
      const cutoff = new Date();
      cutoff.setUTCMonth(cutoff.getUTCMonth() - CV_RETENTION_MONTHS);
      const cutoffDay = cutoff.toISOString().slice(0, 10);
      // One folder per visit: those of visits held before the cutoff, and
      // of visits deleted since, go whole.
      const { data: roots, error } = await supabase.storage.from(BUCKET).list('', { limit: 1000 });
      if (error) throw error;
      const folders = ((roots || []) as { name: string; id: string | null }[]).filter((r) => !r.id && UUID.test(r.name)).map((r) => r.name);
      const { data: evRows, error: evErr } = folders.length
        ? await supabase.from('events').select('id, date').in('id', folders)
        : { data: [], error: null };
      if (evErr) throw evErr;
      const dayOf = new Map(((evRows || []) as { id: string; date: string | null }[]).map((e) => [e.id, e.date]));
      const due = folders.filter((id) => !dayOf.has(id) || (!!dayOf.get(id) && dayOf.get(id)!.slice(0, 10) < cutoffDay));
      let files = 0;
      for (const id of due) {
        files += await removeEventCvs(supabase, id);
        const { error: upErr } = await supabase.from('event_interest')
          .update({ cv_path: null, cv_deleted_at: new Date().toISOString() }).eq('event_id', id).not('cv_path', 'is', null);
        if (upErr) throw upErr;
      }
      console.log(`Company visit CVs: ${files} deleted from ${due.length} visits (held before ${cutoffDay}, or deleted).`);
      return json({ visits: due.length, deleted: files });
    }

    // ── Everybody else is a signed-in person ──
    if (!token) return json({ error: 'Please sign in.' }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Your session has expired. Please sign in again.' }, 401);
    const { data: roleRows } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const roles = rolesOf(roleRows as { role: string }[] | null);
    audit.actor(user, roles);
    audit.request(action, body);
    const isSelector = user.email === OWNER_EMAIL || roles.some((r) => SELECTOR_ROLES.includes(r));

    const readEvent = async (id: unknown): Promise<EventRow | null> => {
      if (typeof id !== 'string' || !UUID.test(id)) return null;
      const { data } = await supabase.from('events').select(EVENT_COLS).eq('id', id).maybeSingle();
      return (data as EventRow | null) ?? null;
    };
    const readInterest = async (id: unknown): Promise<Interest | null> => {
      if (typeof id !== 'string' || !UUID.test(id)) return null;
      const { data } = await supabase.from('event_interest').select('*').eq('id', id).maybeSingle();
      return (data as Interest | null) ?? null;
    };

    // =================================================================
    // MEMBERS AND ALUMNI
    // =================================================================
    if (['mine', 'upload-url', 'submit'].includes(action)) {
      // Members of the association and alumni; not applicants or accounts
      // waiting for approval, and not expelled members.
      const { data: meRow } = await supabase.from('members')
        .select('id, first_name, surname, email, membership_status').eq('user_id', user.id).maybeSingle();
      const me = meRow as { id: string; first_name: string | null; surname: string | null; email: string | null; membership_status: string | null } | null;
      const eligible = (roles.some((r) => !['candidate', 'pending'].includes(r)) || user.email === OWNER_EMAIL)
        && me?.membership_status !== 'expelled';
      const kind: 'member' | 'alumni' = me?.membership_status === 'alumni' || (roles.includes('alumni') && !roles.some((r) => !['alumni', 'candidate', 'pending'].includes(r)))
        ? 'alumni' : 'member';

      if (action === 'mine') {
        let query = supabase.from('event_interest').select('*').eq('user_id', user.id);
        if (body.event_id !== undefined) {
          if (typeof body.event_id !== 'string' || !UUID.test(body.event_id)) return json({ error: 'Unknown visit.' }, 400);
          query = query.eq('event_id', body.event_id);
        }
        const { data, error } = await query;
        if (error) throw error;
        return json({ eligible, interests: ((data || []) as Interest[]).map(memberView) });
      }

      if (!eligible) return json({ error: 'Company visits are open to members and alumni of the Society.' }, 403);
      const ev = await readEvent(body.event_id);
      if (!ev || !selects(ev)) return json({ error: 'This visit does not take expressions of interest.' }, 404);
      audit.subject(ev.title, ev.id);
      if (!isOpen(ev)) return json({ error: 'The interest form for this visit has closed.' }, 409);
      const { data: existingRow } = await supabase.from('event_interest').select('*').eq('event_id', ev.id).eq('user_id', user.id).maybeSingle();
      const existing = existingRow as Interest | null;
      if (existing && (existing.notified || existing.decision !== 'pending')) {
        return json({ error: 'Your interest is already being considered, so your CV can no longer be replaced.' }, 409);
      }

      if (action === 'upload-url') {
        const path = `${ev.id}/${user.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.pdf`;
        const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
        if (error || !data) throw error ?? new Error('no upload link');
        return json({ bucket: BUCKET, path, token: data.token });
      }

      if (action !== 'submit') return json({ error: 'Unknown action' }, 400);
      const path = str(body.path, 300);
      const prefix = `${ev.id}/${user.id}/`;
      if (!path.startsWith(prefix) || !/^\d+-[0-9a-f]{8}\.pdf$/.test(path.slice(prefix.length))) {
        return json({ error: 'The upload could not be found. Please attach your CV again.' }, 400);
      }
      const discard = () => supabase.storage.from(BUCKET).remove([path]);
      const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(path);
      if (dlErr || !blob) return json({ error: 'Your CV did not arrive. Please attach it again.' }, 400);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (bytes.length > MAX_CV) { await discard(); return json({ error: 'The CV must be a PDF under 10 MB.' }, 400); }
      if (new TextDecoder('latin1').decode(bytes.slice(0, 1024)).indexOf('%PDF-') === -1) {
        await discard();
        return json({ error: 'The CV must be a PDF file.' }, 400);
      }
      const cvName = (str(body.file_name, 200) || 'CV.pdf').replace(/[\\/]/g, '');
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      const name = [me?.first_name, me?.surname].filter((x) => x && x.trim()).join(' ').trim()
        || (profile as { full_name: string | null } | null)?.full_name?.trim() || user.email || 'Member';
      const email = (me?.email || user.email || '').trim();
      if (!email) { await discard(); return json({ error: 'Your account has no email address to write to.' }, 400); }
      const now = new Date().toISOString();
      if (existing) {
        const { error } = await supabase.from('event_interest')
          .update({ cv_path: path, cv_name: cvName, cv_size: bytes.length, updated_at: now, name, email, member_id: me?.id ?? null, kind })
          .eq('id', existing.id);
        if (error) { await discard(); throw error; }
        if (existing.cv_path && existing.cv_path !== path) await supabase.storage.from(BUCKET).remove([existing.cv_path]);
        audit.verb('update');
        return json({ interest: memberView({ ...existing, cv_name: cvName, updated_at: now }), replaced: true });
      }
      const { data: row, error } = await supabase.from('event_interest').insert({
        event_id: ev.id, user_id: user.id, member_id: me?.id ?? null, kind, name, email,
        cv_path: path, cv_name: cvName, cv_size: bytes.length,
      }).select('*').single();
      if (error) {
        await discard();
        if (error.code === '23505') return json({ error: 'Your interest is already recorded. Reload the page.' }, 409);
        throw error;
      }
      const { error: mailErr } = await supabase.rpc('company_visit_notice', { p_interest_id: (row as Interest).id, p_kind: 'received' });
      if (mailErr) console.error('interest email not queued', mailErr.message);
      return json({ interest: memberView(row as Interest) });
    }

    // =================================================================
    // THE PRESIDENT AND THE VICE PRESIDENT
    // =================================================================
    const SELECTOR_ACTIONS = ['list', 'decide', 'close-now', 'send', 'open-place', 'withdraw', 'cv-url', 'cvs-zip'];
    if (!SELECTOR_ACTIONS.includes(action)) return json({ error: 'Unknown action' }, 400);
    if (!isSelector) return json({ error: 'Only the President and the Vice President select the participants of a company visit.' }, 403);

    const loadAll = async (eventId: string) => {
      const { data, error } = await supabase.from('event_interest').select('*').eq('event_id', eventId).order('submitted_at', { ascending: true });
      if (error) throw error;
      return (data || []) as Interest[];
    };
    const countsOf = (ev: EventRow, rows: Interest[]) => {
      const invited = rows.filter((r) => r.notified === 'invited' && !r.withdrawn_at).length;
      return {
        interested: rows.length,
        undecided: rows.filter((r) => !r.notified && r.decision === 'pending').length,
        draft_invite: rows.filter((r) => !r.notified && r.decision === 'invite').length,
        draft_not_selected: rows.filter((r) => !r.notified && r.decision === 'not_selected').length,
        invited,
        reserves: rows.filter((r) => r.notified === 'not_selected').length,
        withdrawn: rows.filter((r) => r.withdrawn_at).length,
        places: ev.capacity,
        places_left: ev.capacity === null ? null : Math.max(0, ev.capacity - invited),
      };
    };
    /** A place on the attendance list for an invited member (or the one they already have). */
    const placeFor = async (ev: EventRow, i: Interest): Promise<string> => {
      const { data: found } = await supabase.from('event_registrations').select('id')
        .eq('event_id', ev.id).ilike('email', i.email).maybeSingle();
      if (found) return (found as { id: string }).id;
      const { data, error } = await supabase.from('event_registrations').insert({
        event_id: ev.id, user_id: i.user_id, name: i.name, email: i.email,
        is_member: i.kind === 'member', is_external: false, added_by: user.id,
        ...(i.member_id ? { member_id: i.member_id, member_link: 'account' } : {}),
      }).select('id').single();
      if (error) {
        if (/EVENT_FULL/.test(error.message || '')) throw Object.assign(new Error('EVENT_FULL'), { full: true });
        throw error;
      }
      return (data as { id: string }).id;
    };

    if (action === 'decide') {
      const ev = await readEvent(body.event_id);
      if (!ev || !selects(ev)) return json({ error: 'This visit does not select its participants.' }, 404);
      audit.subject(ev.title, ev.id);
      const decision = str(body.decision, 20);
      if (!['pending', 'invite', 'not_selected'].includes(decision)) return json({ error: 'Choose Invite, Not this time or Undecided.' }, 400);
      const ids = Array.isArray(body.interest_ids) ? (body.interest_ids as unknown[]).filter((x): x is string => typeof x === 'string' && UUID.test(x)).slice(0, 500) : [];
      if (!ids.length) return json({ error: 'Choose at least one member.' }, 400);
      const { data, error } = await supabase.from('event_interest')
        .update({ decision, decided_by: user.id, decided_at: new Date().toISOString() })
        .eq('event_id', ev.id).in('id', ids).is('notified', null).select('id');
      if (error) throw error;
      audit.note({ decision, count: (data || []).length });
      const rows = await loadAll(ev.id);
      return json({ changed: (data || []).length, counts: countsOf(ev, rows) });
    }

    if (action === 'close-now') {
      const ev = await readEvent(body.event_id);
      if (!ev || !selects(ev)) return json({ error: 'This visit does not select its participants.' }, 404);
      audit.subject(ev.title, ev.id);
      if (!isOpen(ev)) return json({ interest_closes_at: ev.interest_closes_at });
      const at = new Date().toISOString();
      const { error } = await supabase.from('events').update({ interest_closes_at: at }).eq('id', ev.id);
      if (error) throw error;
      return json({ interest_closes_at: at });
    }

    if (action === 'send') {
      if (body.confirm !== true) return json({ error: 'Confirm before sending the decisions.' }, 400);
      const ev = await readEvent(body.event_id);
      if (!ev || !selects(ev)) return json({ error: 'This visit does not select its participants.' }, 404);
      audit.subject(ev.title, ev.id);
      if (isOpen(ev)) return json({ error: 'The interest form is still open: close it first, so that nobody applies after the decisions.' }, 409);
      if (hasStarted(ev)) return json({ error: 'The visit has already taken place.' }, 409);
      const rows = await loadAll(ev.id);
      const toInvite = rows.filter((r) => !r.notified && r.decision === 'invite');
      const toDecline = rows.filter((r) => !r.notified && r.decision === 'not_selected');
      if (!toInvite.length && !toDecline.length) return json({ error: 'There are no decisions to send.' }, 400);
      const counts = countsOf(ev, rows);
      if (ev.capacity !== null && counts.invited + toInvite.length > ev.capacity) {
        return json({ error: `There are ${ev.capacity} places and ${counts.invited + toInvite.length} members would be invited. Invite fewer, or raise the places in Registration Forms.` }, 409);
      }
      let invited = 0;
      let declined = 0;
      const now = new Date().toISOString();
      for (const i of toInvite) {
        let registrationId: string;
        try {
          registrationId = await placeFor(ev, i);
        } catch (e) {
          if ((e as { full?: boolean }).full) break;
          throw e;
        }
        const { error } = await supabase.from('event_interest')
          .update({ notified: 'invited', notified_at: now, registration_id: registrationId }).eq('id', i.id).is('notified', null);
        if (error) throw error;
        const { error: mailErr } = await supabase.rpc('company_visit_notice', { p_interest_id: i.id, p_kind: 'invited' });
        if (mailErr) console.error('invitation not queued', mailErr.message);
        invited += 1;
      }
      for (const i of toDecline) {
        const { error } = await supabase.from('event_interest')
          .update({ notified: 'not_selected', notified_at: now }).eq('id', i.id).is('notified', null);
        if (error) throw error;
        const { error: mailErr } = await supabase.rpc('company_visit_notice', { p_interest_id: i.id, p_kind: 'not_selected' });
        if (mailErr) console.error('decision email not queued', mailErr.message);
        declined += 1;
      }
      audit.note({ invited, not_selected: declined });
      return json({ invited, not_selected: declined, counts: countsOf(ev, await loadAll(ev.id)) });
    }

    if (action === 'open-place' || action === 'withdraw') {
      if (body.confirm !== true) return json({ error: 'Confirm first.' }, 400);
      const i = await readInterest(body.interest_id);
      if (!i) return json({ error: 'This member is no longer on the list. Reload the page.' }, 404);
      const ev = await readEvent(i.event_id);
      if (!ev) return json({ error: 'The visit no longer exists.' }, 404);
      audit.subject(`${ev.title}: ${i.name}`, i.id);
      if (hasStarted(ev)) return json({ error: 'The visit has already taken place.' }, 409);

      if (action === 'open-place') {
        if (i.notified !== 'not_selected') return json({ error: 'A place can be offered only to a member kept as a reserve.' }, 409);
        const rows = await loadAll(ev.id);
        const counts = countsOf(ev, rows);
        if (ev.capacity !== null && counts.invited >= ev.capacity) {
          return json({ error: `All ${ev.capacity} places are taken. Record a withdrawal first, or raise the places in Registration Forms.` }, 409);
        }
        let registrationId: string;
        try {
          registrationId = await placeFor(ev, i);
        } catch (e) {
          if ((e as { full?: boolean }).full) return json({ error: 'The visit has no places left.' }, 409);
          throw e;
        }
        const now = new Date().toISOString();
        const { error } = await supabase.from('event_interest')
          .update({ notified: 'invited', notified_at: now, spot_opened_at: now, decision: 'invite', registration_id: registrationId, withdrawn_at: null, withdrawn_by: null })
          .eq('id', i.id);
        if (error) throw error;
        const { error: mailErr } = await supabase.rpc('company_visit_notice', { p_interest_id: i.id, p_kind: 'spot_opened' });
        if (mailErr) console.error('place email not queued', mailErr.message);
        return json({ success: true, counts: countsOf(ev, await loadAll(ev.id)) });
      }

      // withdraw
      if (i.notified !== 'invited' || i.withdrawn_at) return json({ error: 'Only an invited member can be recorded as withdrawn.' }, 409);
      if (i.registration_id) {
        const { data: reg } = await supabase.from('event_registrations').select('id, attended').eq('id', i.registration_id).maybeSingle();
        if ((reg as { attended: boolean } | null)?.attended) return json({ error: 'This member has already been checked in.' }, 409);
        if (reg) {
          const { error } = await supabase.from('event_registrations').delete().eq('id', i.registration_id);
          if (error) throw error;
        }
      }
      const { error } = await supabase.from('event_interest')
        .update({ withdrawn_at: new Date().toISOString(), withdrawn_by: user.id, registration_id: null }).eq('id', i.id);
      if (error) throw error;
      return json({ success: true, counts: countsOf(ev, await loadAll(ev.id)) });
    }

    if (action === 'cv-url') {
      const i = await readInterest(body.interest_id);
      if (!i) return json({ error: 'This member is no longer on the list.' }, 404);
      audit.subject(i.name, i.id);
      if (!i.cv_path) return json({ error: i.cv_deleted_at ? 'This CV was deleted six months after the visit.' : 'No CV was attached.' }, 404);
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(i.cv_path, 10 * 60, { download: `${fileName(i.name)} - CV.pdf` });
      if (error || !data) throw error ?? new Error('no link');
      return json({ url: data.signedUrl });
    }

    if (action === 'cvs-zip') {
      const ev = await readEvent(body.event_id);
      if (!ev || !selects(ev)) return json({ error: 'This visit does not select its participants.' }, 404);
      audit.subject(ev.title, ev.id);
      const rows = (await loadAll(ev.id)).filter((r) => r.notified === 'invited' && !r.withdrawn_at && r.cv_path);
      if (!rows.length) return json({ error: 'No invited member has a CV on file.' }, 404);
      const used = new Set<string>();
      const files: { name: string; data: Uint8Array }[] = [];
      for (const r of rows) {
        const { data: blob, error } = await supabase.storage.from(BUCKET).download(r.cv_path!);
        if (error || !blob) continue;
        let name = `${fileName(r.name)} - CV.pdf`;
        for (let n = 2; used.has(name.toLowerCase()); n++) name = `${fileName(r.name)} (${n}) - CV.pdf`;
        used.add(name.toLowerCase());
        files.push({ name, data: new Uint8Array(await blob.arrayBuffer()) });
      }
      audit.note({ files: files.length });
      const zip = makeZip(files);
      const zipName = `${fileName(ev.title)} - invited CVs.zip`;
      return new Response(zip, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/zip',
          'Content-Length': String(zip.length),
          'Content-Disposition': `attachment; filename="${zipName.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(zipName)}`,
        },
      });
    }

    if (action !== 'list') return json({ error: 'Unknown action' }, 400);
    const ev = await readEvent(body.event_id);
    if (!ev || !selects(ev)) return json({ error: 'This visit does not select its participants.' }, 404);
    const rows = await loadAll(ev.id);
    const { data: stats, error: sErr } = await supabase.rpc('company_visit_candidates', { p_event_id: ev.id });
    if (sErr) throw sErr;
    const statOf = new Map(((stats || []) as { interest_id: string }[]).map((s) => [s.interest_id, s]));
    const memberIds = [...new Set(rows.map((r) => r.member_id).filter(Boolean))] as string[];
    const { data: memberRows } = memberIds.length
      ? await supabase.from('members').select('id, role, division, membership_status').in('id', memberIds)
      : { data: [] };
    const memberOf = new Map(((memberRows || []) as { id: string }[]).map((m) => [m.id, m]));
    const regIds = rows.map((r) => r.registration_id).filter(Boolean) as string[];
    const { data: regRows } = regIds.length
      ? await supabase.from('event_registrations').select('id, attended').in('id', regIds)
      : { data: [] };
    const attendedOf = new Map(((regRows || []) as { id: string; attended: boolean }[]).map((r) => [r.id, r.attended]));
    return json({
      event: ev,
      open: isOpen(ev),
      started: hasStarted(ev),
      contact: CONTACT,
      counts: countsOf(ev, rows),
      candidates: rows.map((r) => ({
        id: r.id, name: r.name, email: r.email, kind: r.kind,
        member: r.member_id ? memberOf.get(r.member_id) ?? null : null,
        submitted_at: r.submitted_at, cv_name: r.cv_name, cv_size: r.cv_size, has_cv: !!r.cv_path, cv_deleted: !!r.cv_deleted_at,
        decision: r.decision, notified: r.notified, notified_at: r.notified_at, spot_opened_at: r.spot_opened_at,
        withdrawn_at: r.withdrawn_at, attended: r.registration_id ? attendedOf.get(r.registration_id) ?? false : false,
        record: statOf.get(r.id) ?? null,
      })),
    });
  } catch (error) {
    console.error('company-visits error:', error);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
}));
