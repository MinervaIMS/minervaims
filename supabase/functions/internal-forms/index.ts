import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { audited } from '../_shared/activity.ts';
import { allows, normalizeRole, OWNER_EMAIL, rolesOf } from '../_shared/access.ts';
import { readFileField, readTextField } from '../_shared/form-file.ts';
import { readJsonObject, UNREADABLE_BODY, type LooseBody } from '../_shared/request-body.ts';
import { romeClock12 } from '../_shared/event-time.ts';
import {
  amountDue, fileProblem, formImagePaths, imageProblem, isQuestion, LIMITS, sanitizeFields, validateAnswers,
  type Answers, type FormField,
} from '../_shared/internal-forms.ts';
import { answersBlock, confirmationBlock, editBlock, paymentBlock } from '../_shared/internal-form-email.ts';

// =====================================================================
// internal-forms: Operations > Internal Forms, and the members who fill
// them in.
// ---------------------------------------------------------------------
// ORGANISERS (the matrix's 'ops-forms' at manage: the President, the Vice
// President, the Head of Operations and the Operations Analyst) build
// forms, open and close them, read the answers, tick payments and delete.
//
// MEMBERS (every active member of the Society: not applicants or alumni) see
// the forms that are open, fill them in, attach files and
// change their answers until the deadline, if the form allows it. Every
// submission sends the member a receipt by email.
//
// The tables have row-level security on and no policy at all: nobody
// reads or writes them except through this function, which is where
// every rule below is enforced. Files live in the private bucket
// `internal-forms`, under <form>/<member>/, and are opened through
// links that work for an hour.
//
// PICTURES the organisers put in a form (the cover, picture blocks and a
// picture per choice) live in the same bucket under <form>/_form/, are
// shown through the same one-hour links, are copied with the form when
// it is duplicated, and are deleted once no version of the form uses
// them. ORDERS: what a member owes is worked out here from what they
// ordered (the shared rules), and kept on their answer as `amount_due`,
// so a later change of price never rewrites an order already placed.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

const BUCKET = 'internal-forms';
const RESOURCE = 'ops-forms';
const SITE = 'https://minervaims.org';
const NOT_MEMBERS = ['candidate', 'pending', 'alumni'];

interface FormRow {
  id: string; title: string; description: string | null; fields: FormField[]; status: 'draft' | 'open' | 'closed';
  closes_at: string | null; allow_edits: boolean; track_payments: boolean; payment_amount: number | null;
  payment_instructions: string | null; confirmation_message: string | null; cover_path: string | null;
  created_by: string | null; created_by_name: string | null; updated_by_name: string | null;
  published_at: string | null; closed_at: string | null; created_at: string; updated_at: string;
}
interface ResponseRow {
  id: string; form_id: string; user_id: string; member_name: string | null; member_email: string | null;
  member_role: string | null; member_division: string | null; answers: Answers; submitted_at: string;
  updated_at: string; edit_count: number; paid: boolean; paid_at: string | null; paid_by_name: string | null; staff_note: string | null;
  amount_due: number | null;
}

const isUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);
const text = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim().slice(0, max);
  return t || null;
};
function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'file';
}
/** "Thursday 1 October 2026, 6:42 pm CEST" on Rome's clock. */
function romeLong(iso: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  return `${day}, ${romeClock12(d)}`;
}
/** Is the form taking answers right now? */
function accepting(f: FormRow, now = Date.now()): boolean {
  return f.status === 'open' && (!f.closes_at || new Date(f.closes_at).getTime() > now);
}
/** What a member sees of the state of a form. */
function memberState(f: FormRow): 'open' | 'closed' {
  return accepting(f) ? 'open' : 'closed';
}
/** The cover a form may use: a picture in the form's own folder, or none. */
function coverOf(formId: string, v: unknown): string | null {
  return typeof v === 'string' && v.startsWith(`${formId}/_form/`) && /^[A-Za-z0-9-]{1,64}\/_form\/[A-Za-z0-9._-]{1,200}$/.test(v) ? v : null;
}
/** Every stored file an answer set points to. */
function filePaths(fields: FormField[], answers: Answers): string[] {
  const out: string[] = [];
  for (const f of fields) {
    if (f.type !== 'file') continue;
    const v = answers?.[f.id];
    if (Array.isArray(v)) for (const x of v as { path?: string }[]) if (x && typeof x.path === 'string') out.push(x.path);
  }
  return out;
}

Deno.serve(audited('internal-forms', async (req, audit) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Sign in to continue.' }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authError || !user) return json({ error: 'Your session has expired. Sign in again.' }, 401);
    const { data: roleRows } = await supabase.from('user_roles').select('role, division').eq('user_id', user.id);
    const roles = rolesOf(roleRows);
    audit.actor(user, roles);

    const canManage = allows(roles, user.email, RESOURCE, 'manage');
    const { data: me } = await supabase.from('members')
      .select('first_name, surname, email, role, division, membership_status')
      .eq('user_id', user.id).maybeSingle();
    // An active member: a member role, and an active roster row where there is one.
    const isMember = (user.email === OWNER_EMAIL || roles.some((r) => !NOT_MEMBERS.includes(normalizeRole(r))))
      && (!me || me.membership_status === 'active');
    const myName = me ? `${me.first_name ?? ''} ${me.surname ?? ''}`.trim() : '';
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
    const displayName = myName || profile?.full_name || user.email || 'Member';

    const getForm = async (id: unknown): Promise<FormRow | null> => {
      if (!isUuid(id)) return null;
      const { data } = await supabase.from('internal_forms').select('*').eq('id', id).maybeSingle();
      return (data as FormRow | null) ?? null;
    };
    /** One-hour links for stored pictures and files, by path. */
    const signAll = async (paths: string[]): Promise<Record<string, string>> => {
      const list = [...new Set(paths.filter(Boolean))].slice(0, 500);
      if (!list.length) return {};
      const { data } = await supabase.storage.from(BUCKET).createSignedUrls(list, 3600);
      const out: Record<string, string> = {};
      for (const s of data || []) if (s.path && s.signedUrl) out[s.path] = s.signedUrl;
      return out;
    };

    // ── File upload (members, multipart) ─────────────────────────────
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const formId = readTextField(form, 'form_id');
      const fieldId = readTextField(form, 'field_id');
      const purpose = readTextField(form, 'purpose');
      audit.request('upload', { form_id: formId, field_id: fieldId, purpose });

      // A picture an organiser puts in the form: the cover, a picture
      // block or a choice's picture.
      if (purpose === 'form-image') {
        if (!canManage) return json({ error: 'Only the organisers can add pictures to a form.' }, 403);
        const f = await getForm(formId);
        if (!f) return json({ error: 'This form no longer exists.' }, 404);
        const file = readFileField(form, 'file');
        if (!file) return json({ error: 'No file was received. Choose the picture again.' }, 400);
        const problem = imageProblem(file.name, file.size);
        if (problem) return json({ error: problem }, 400);
        const path = `${f.id}/_form/${crypto.randomUUID()}-${safeName(file.name)}`;
        const { error: upErr } = await supabase.storage.from(BUCKET)
          .upload(path, await file.arrayBuffer(), { contentType: file.type || 'image/jpeg', upsert: false });
        if (upErr) {
          console.error('internal form picture upload failed', upErr);
          return json({ error: 'The upload failed. Please try again.' }, 500);
        }
        audit.subject(f.title);
        const urls = await signAll([path]);
        return json({ file: { path, name: file.name.slice(-200), size: file.size, type: file.type || '' }, url: urls[path] ?? null });
      }

      if (!isMember) return json({ error: 'Internal forms are for the Society\'s active members.' }, 403);
      const f = await getForm(formId);
      if (!f || f.status === 'draft') return json({ error: 'This form is not available.' }, 404);
      if (!accepting(f)) return json({ error: 'This form is closed and no longer takes answers.' }, 400);
      const field = (f.fields || []).find((x) => x.id === fieldId && x.type === 'file');
      if (!field) return json({ error: 'This question does not take files.' }, 400);
      const file = readFileField(form, 'file');
      if (!file) return json({ error: 'No file was received. Choose the file again.' }, 400);
      const problem = fileProblem(field, file.name, file.size);
      if (problem) return json({ error: problem }, 400);
      const path = `${f.id}/${user.id}/${crypto.randomUUID()}-${safeName(file.name)}`;
      const { error: upErr } = await supabase.storage.from(BUCKET)
        .upload(path, await file.arrayBuffer(), { contentType: file.type || 'application/octet-stream', upsert: false });
      if (upErr) {
        console.error('internal form upload failed', upErr);
        return json({ error: 'The upload failed. Please try again.' }, 500);
      }
      audit.subject(file.name);
      return json({ file: { path, name: file.name.slice(-200), size: file.size, type: file.type || '' } });
    }

    const parsed = await readJsonObject(req);
    if (!parsed) return json({ error: UNREADABLE_BODY }, 400);
    const body = parsed as LooseBody;
    const action = typeof body.action === 'string' ? body.action : '';
    audit.request(action, body);

    // =================================================================
    // MEMBERS
    // =================================================================

    // The forms open to me, and whether I have answered: the Dashboard card.
    if (action === 'my-forms') {
      if (!isMember) return json({ forms: [] });
      const { data, error } = await supabase.from('internal_forms')
        .select('id, title, description, status, closes_at, allow_edits, track_payments, payment_amount, cover_path')
        .eq('status', 'open').order('closes_at', { ascending: true, nullsFirst: false });
      if (error) throw error;
      const open = ((data || []) as FormRow[]).filter((f) => accepting(f));
      const ids = open.map((f) => f.id);
      const mine = ids.length
        ? (await supabase.from('internal_form_responses').select('form_id, submitted_at, updated_at, paid').eq('user_id', user.id).in('form_id', ids)).data || []
        : [];
      const byForm = new Map((mine as { form_id: string; submitted_at: string; updated_at: string; paid: boolean }[]).map((r) => [r.form_id, r]));
      // The cover of each form still waiting for this member, for the Dashboard.
      const covers = await signAll(open.filter((f) => !byForm.has(f.id) && f.cover_path).map((f) => f.cover_path as string));
      return json({
        forms: open.map((f) => ({
          id: f.id, title: f.title, description: f.description, closes_at: f.closes_at, allow_edits: f.allow_edits,
          track_payments: f.track_payments, payment_amount: f.payment_amount,
          cover_url: f.cover_path ? covers[f.cover_path] ?? null : null,
          answered_at: byForm.get(f.id)?.updated_at ?? null, paid: byForm.get(f.id)?.paid ?? false,
        })),
      });
    }

    // One form to fill in, with my answer if I gave one.
    if (action === 'fill-get') {
      const f = await getForm(body.id);
      // A draft exists only for its organisers, who can preview it.
      if (!f || (f.status === 'draft' && !canManage)) return json({ error: 'This form does not exist or has been removed.' }, 404);
      if (!isMember && !canManage) {
        return json({ error: 'Internal forms are for the Society\'s active members.', reason: 'not_member' }, 403);
      }
      let response: ResponseRow | null = null;
      const files: Record<string, string> = {};
      const images = await signAll(formImagePaths(f.fields || [], f.cover_path));
      if (isMember) {
        const { data } = await supabase.from('internal_form_responses').select('*').eq('form_id', f.id).eq('user_id', user.id).maybeSingle();
        response = (data as ResponseRow | null) ?? null;
        const paths = response ? filePaths(f.fields, response.answers) : [];
        if (paths.length) {
          const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
          for (const s of signed || []) if (s.path && s.signedUrl) files[s.path] = s.signedUrl;
        }
      }
      return json({
        form: {
          id: f.id, title: f.title, description: f.description, fields: f.fields, closes_at: f.closes_at,
          allow_edits: f.allow_edits, track_payments: f.track_payments, payment_amount: f.payment_amount,
          payment_instructions: f.payment_instructions, confirmation_message: f.confirmation_message,
          cover_path: f.cover_path ?? null,
          state: f.status === 'draft' ? 'draft' : memberState(f),
        },
        me: { name: displayName, email: me?.email || user.email, can_answer: isMember },
        response: response ? { answers: response.answers, submitted_at: response.submitted_at, updated_at: response.updated_at, paid: response.paid, amount_due: response.amount_due ?? null } : null,
        files,
        images,
      });
    }

    // Send or change my answers.
    if (action === 'submit') {
      if (!isMember) return json({ error: 'Internal forms are for the Society\'s active members.' }, 403);
      const f = await getForm(body.id);
      if (!f || f.status === 'draft') return json({ error: 'This form does not exist or has been removed.' }, 404);
      if (!accepting(f)) return json({ error: f.closes_at && new Date(f.closes_at).getTime() <= Date.now() ? `The deadline has passed: this form closed on ${romeLong(f.closes_at)}.` : 'This form is closed and no longer takes answers.' }, 400);
      const { answers, errors } = validateAnswers(f.fields || [], body.answers, `${f.id}/${user.id}/`);
      // Field by field, so the page can say what is wrong under each question.
      if (Object.keys(errors).length) return json({ invalid: true, message: 'Some answers need attention.', errors });

      const { data: prev } = await supabase.from('internal_form_responses').select('*').eq('form_id', f.id).eq('user_id', user.id).maybeSingle();
      const before = prev as ResponseRow | null;
      if (before && !f.allow_edits) return json({ error: 'You have already answered, and this form does not accept changes.' }, 409);

      const now = new Date().toISOString();
      // What this member owes for what they ordered, fixed at this moment.
      const due = amountDue(f.track_payments, f.payment_amount === null ? null : Number(f.payment_amount), f.fields || [], answers);
      const identity = {
        member_name: displayName.slice(0, 200),
        member_email: (me?.email || user.email || '').slice(0, 254),
        member_role: me?.role ?? normalizeRole(roles[0] ?? ''),
        member_division: me?.division ?? null,
      };
      let saved: ResponseRow;
      if (before) {
        const { data, error } = await supabase.from('internal_form_responses')
          .update({ ...identity, answers, amount_due: due, updated_at: now, edit_count: (before.edit_count ?? 0) + 1 })
          .eq('id', before.id).select('*').single();
        if (error) throw error;
        saved = data as ResponseRow;
        // Files the member replaced are deleted, so nothing lingers unseen.
        const kept = new Set(filePaths(f.fields, answers));
        const gone = filePaths(f.fields, before.answers).filter((p) => !kept.has(p));
        if (gone.length) await supabase.storage.from(BUCKET).remove(gone);
      } else {
        const { data, error } = await supabase.from('internal_form_responses')
          .insert({ form_id: f.id, user_id: user.id, ...identity, answers, amount_due: due, submitted_at: now, updated_at: now })
          .select('*').single();
        if (error) throw error;
        saved = data as ResponseRow;
      }
      audit.subject(f.title);

      // The receipt. A failure here never undoes the answer.
      let emailed = false;
      const to = identity.member_email;
      if (to) {
        try {
          const { error: mailError } = await supabase.rpc('enqueue_app_email', {
            p_key: 'internal_form_receipt',
            p_to: to,
            p_vars: {
              first_name: (me?.first_name || displayName.split(' ')[0] || 'Member'),
              member_name: displayName,
              form_title: f.title,
              submitted_on: romeLong(now),
              form_url: `${SITE}/forms/${f.id}`,
              answers_block: answersBlock(f.fields || [], answers),
              payment_block: f.track_payments ? paymentBlock(due, f.payment_instructions) : '',
              edit_block: editBlock(f.allow_edits, f.closes_at ? romeLong(f.closes_at) : null),
              confirmation_block: confirmationBlock(f.confirmation_message),
            },
          });
          // rpc() reports a failure instead of throwing it.
          if (mailError) throw mailError;
          emailed = true;
        } catch (e) {
          console.error('internal form receipt failed', e);
        }
      }
      return json({ success: true, emailed, response: { answers: saved.answers, submitted_at: saved.submitted_at, updated_at: saved.updated_at, paid: saved.paid, amount_due: saved.amount_due ?? null } });
    }

    // =================================================================
    // ORGANISERS
    // =================================================================
    if (!canManage) return json({ error: 'Internal Forms are run by the President, the Vice President and Operations.' }, 403);

    if (action === 'list') {
      const { data, error } = await supabase.from('internal_forms').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const forms = (data || []) as FormRow[];
      const { data: counts } = await supabase.from('internal_form_responses').select('form_id, paid');
      const tally = new Map<string, { responses: number; paid: number }>();
      for (const r of (counts || []) as { form_id: string; paid: boolean }[]) {
        const t = tally.get(r.form_id) ?? { responses: 0, paid: 0 };
        t.responses += 1;
        if (r.paid) t.paid += 1;
        tally.set(r.form_id, t);
      }
      const covers = await signAll(forms.map((f) => f.cover_path ?? '').filter(Boolean));
      return json({ forms: forms.map((f) => ({
        ...f, responses: tally.get(f.id)?.responses ?? 0, paid_count: tally.get(f.id)?.paid ?? 0,
        cover_url: f.cover_path ? covers[f.cover_path] ?? null : null,
      })) });
    }

    if (action === 'get') {
      const f = await getForm(body.id);
      if (!f) return json({ error: 'This form no longer exists.' }, 404);
      const { data, error } = await supabase.from('internal_form_responses').select('*').eq('form_id', f.id).order('submitted_at', { ascending: true });
      if (error) throw error;
      return json({ form: f, responses: data || [], images: await signAll(formImagePaths(f.fields || [], f.cover_path)) });
    }

    if (action === 'save') {
      const input = (body.form && typeof body.form === 'object' ? body.form : {}) as Record<string, unknown>;
      const title = text(input.title, LIMITS.title);
      if (!title) return json({ error: 'Give the form a title.' }, 400);
      // Pictures may only come from this form's own folder; a new form has none yet.
      const ownId = isUuid(input.id) ? input.id : '';
      const { fields, error: fieldError } = sanitizeFields(input.fields, ownId ? `${ownId}/_form/` : 'none/');
      if (fieldError) return json({ error: fieldError }, 400);
      let closesAt: string | null = null;
      if (input.closes_at) {
        const d = new Date(String(input.closes_at));
        if (Number.isNaN(d.getTime())) return json({ error: 'The deadline is not a valid date.' }, 400);
        closesAt = d.toISOString();
      }
      const amount = input.payment_amount === null || input.payment_amount === '' || input.payment_amount === undefined
        ? null : Number(input.payment_amount);
      if (amount !== null && (!Number.isFinite(amount) || amount < 0 || amount > 100000)) return json({ error: 'The amount to pay is not valid.' }, 400);
      const record = {
        title,
        description: text(input.description, 4000),
        fields,
        closes_at: closesAt,
        allow_edits: input.allow_edits !== false,
        track_payments: input.track_payments === true,
        payment_amount: input.track_payments === true && amount !== null ? Math.round(amount * 100) / 100 : null,
        payment_instructions: input.track_payments === true ? text(input.payment_instructions, 1000) : null,
        confirmation_message: text(input.confirmation_message, 1000),
        cover_path: ownId ? coverOf(ownId, input.cover_path) : null,
        updated_by_name: displayName,
        updated_at: new Date().toISOString(),
      };
      if (isUuid(input.id)) {
        const existing = await getForm(input.id);
        if (!existing) return json({ error: 'This form no longer exists.' }, 404);
        if (existing.status === 'open' && !fields.some(isQuestion)) return json({ error: 'An open form needs at least one question.' }, 400);
        const { data, error } = await supabase.from('internal_forms').update(record).eq('id', existing.id).select('*').single();
        if (error) throw error;
        // Pictures the form no longer shows are deleted.
        const kept = new Set(formImagePaths(fields, record.cover_path));
        const gone = formImagePaths(existing.fields || [], existing.cover_path).filter((p) => !kept.has(p));
        if (gone.length) await supabase.storage.from(BUCKET).remove(gone);
        audit.subject(title);
        return json({ form: data, images: await signAll([...kept]) });
      }
      const { data, error } = await supabase.from('internal_forms')
        .insert({ ...record, status: 'draft', created_by: user.id, created_by_name: displayName })
        .select('*').single();
      if (error) throw error;
      audit.subject(title);
      return json({ form: data });
    }

    if (action === 'set-status') {
      const f = await getForm(body.id);
      if (!f) return json({ error: 'This form no longer exists.' }, 404);
      const status = body.status;
      if (status !== 'open' && status !== 'closed' && status !== 'draft') return json({ error: 'Unknown state.' }, 400);
      if (status === 'open') {
        if (!(f.fields || []).some(isQuestion)) return json({ error: 'Add at least one question before opening the form.' }, 400);
        if (f.closes_at && new Date(f.closes_at).getTime() <= Date.now()) return json({ error: 'The deadline is in the past. Move it, or remove it, before opening the form.' }, 400);
      }
      if (status === 'draft') {
        const { count } = await supabase.from('internal_form_responses').select('id', { count: 'exact', head: true }).eq('form_id', f.id);
        if ((count ?? 0) > 0) return json({ error: 'This form already has answers, so it cannot go back to draft. Close it instead.' }, 400);
      }
      const patch: Record<string, unknown> = { status, updated_by_name: displayName, updated_at: new Date().toISOString() };
      if (status === 'open') patch.published_at = f.published_at ?? new Date().toISOString();
      if (status === 'closed') patch.closed_at = new Date().toISOString();
      if (status === 'open') patch.closed_at = null;
      const { data, error } = await supabase.from('internal_forms').update(patch).eq('id', f.id).select('*').single();
      if (error) throw error;
      audit.subject(f.title);
      return json({ form: data });
    }

    if (action === 'duplicate') {
      const f = await getForm(body.id);
      if (!f) return json({ error: 'This form no longer exists.' }, 404);
      const { data, error } = await supabase.from('internal_forms').insert({
        title: `${f.title} (copy)`.slice(0, LIMITS.title), description: f.description, fields: [],
        closes_at: null, allow_edits: f.allow_edits, track_payments: f.track_payments, payment_amount: f.payment_amount,
        payment_instructions: f.payment_instructions, confirmation_message: f.confirmation_message,
        status: 'draft', created_by: user.id, created_by_name: displayName, updated_by_name: displayName,
      }).select('*').single();
      if (error) throw error;
      // The copy gets its own copy of every picture, so deleting either
      // form never takes the other's pictures with it.
      const copy = data as FormRow;
      const from = `${f.id}/_form/`; const to = `${copy.id}/_form/`;
      for (const p of formImagePaths(f.fields || [], f.cover_path)) {
        const { error: cpErr } = await supabase.storage.from(BUCKET).copy(p, to + p.slice(from.length));
        if (cpErr) console.error('picture copy failed', p, cpErr);
      }
      const moved = JSON.parse(JSON.stringify(f.fields || []).split(from).join(to)) as FormField[];
      const { data: done, error: upErr } = await supabase.from('internal_forms')
        .update({ fields: moved, cover_path: f.cover_path ? to + f.cover_path.slice(from.length) : null })
        .eq('id', copy.id).select('*').single();
      if (upErr) throw upErr;
      audit.subject(f.title);
      return json({ form: done });
    }

    if (action === 'delete') {
      const f = await getForm(body.id);
      if (!f) return json({ success: true });
      // Every file under the form's folder: each member's, and the form's own pictures (_form).
      const { data: folders } = await supabase.storage.from(BUCKET).list(f.id, { limit: 1000 });
      for (const folder of folders || []) {
        const { data: inside } = await supabase.storage.from(BUCKET).list(`${f.id}/${folder.name}`, { limit: 1000 });
        const paths = (inside || []).map((x) => `${f.id}/${folder.name}/${x.name}`);
        if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
      }
      const { error } = await supabase.from('internal_forms').delete().eq('id', f.id);
      if (error) throw error;
      audit.subject(f.title);
      return json({ success: true });
    }

    if (action === 'set-paid') {
      if (!isUuid(body.response_id)) return json({ error: 'Unknown answer.' }, 400);
      const paid = body.paid === true;
      const { data, error } = await supabase.from('internal_form_responses').update({
        paid, paid_at: paid ? new Date().toISOString() : null, paid_by_name: paid ? displayName : null,
      }).eq('id', body.response_id).select('id, paid, paid_at, paid_by_name').single();
      if (error) throw error;
      return json({ response: data });
    }

    if (action === 'set-note') {
      if (!isUuid(body.response_id)) return json({ error: 'Unknown answer.' }, 400);
      const { data, error } = await supabase.from('internal_form_responses')
        .update({ staff_note: text(body.note, 2000) }).eq('id', body.response_id).select('id, staff_note').single();
      if (error) throw error;
      return json({ response: data });
    }

    if (action === 'delete-response') {
      if (!isUuid(body.response_id)) return json({ error: 'Unknown answer.' }, 400);
      const { data: r } = await supabase.from('internal_form_responses').select('*').eq('id', body.response_id).maybeSingle();
      if (!r) return json({ success: true });
      const f = await getForm((r as ResponseRow).form_id);
      const paths = f ? filePaths(f.fields, (r as ResponseRow).answers) : [];
      if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
      const { error } = await supabase.from('internal_form_responses').delete().eq('id', body.response_id);
      if (error) throw error;
      audit.subject((r as ResponseRow).member_name ?? '');
      return json({ success: true });
    }

    // Links that open answers' files for an hour.
    if (action === 'sign') {
      const paths = Array.isArray(body.paths) ? (body.paths as unknown[]).filter((p): p is string => typeof p === 'string' && !p.includes('..')).slice(0, 500) : [];
      if (!paths.length) return json({ urls: {} });
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
      if (error) throw error;
      const urls: Record<string, string> = {};
      for (const s of data || []) if (s.path && s.signedUrl) urls[s.path] = s.signedUrl;
      return json({ urls });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('internal-forms error:', error);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
}));
