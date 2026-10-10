import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { audited } from '../_shared/activity.ts';
import { allows, normalizeRole, OWNER_EMAIL, rolesOf } from '../_shared/access.ts';
import { readJsonObject, UNREADABLE_BODY, type LooseBody } from '../_shared/request-body.ts';
import { printable, watermarkPdf } from '../_shared/pdf-watermark.ts';
import { SEED } from './seed.ts';

// =====================================================================
// career-brainteasers: Career > Brainteasers.
// ---------------------------------------------------------------------
// TRAINING (everybody with the page, 'career-brainteasers' at 'view')
//   list      the questions WITHOUT their solutions, the reader's own
//             record, and the greenbook's details
//   reveal    one solution. The first time a reader opens a question's
//             solution it is counted: no more than REVEAL_PER_HOUR new
//             ones an hour and REVEAL_PER_DAY a day, so the set is
//             studied rather than copied out. Opening one again is free.
//   progress  the reader's own: solved on their own, needed the solution,
//             a "hard" flag, a private note
//   reset     clears the reader's statuses, flags and notes (the solutions
//             they have opened stay counted)
//
// EDITING ('manage': the President, the Vice President, the Head of
// Operations and the admin account)
//   save      correct a question or add one; hide it from members
//
// THE GREENBOOK
//   greenbook-download    everybody with the page: the PDF with the
//                         reader's name, email and the date on every page
//                         and a notice on the cover. Recorded, at most
//                         GREENBOOK_PER_DAY a day.
//   greenbook-upload-url  the President and the admin account only: a
//   greenbook-commit      one-time link the page uploads a new PDF to,
//   greenbook-remove      then the check that it is a usable PDF, which
//   greenbook-register    replaces the old one; removal; who downloaded.
//
// Nothing here is readable from the browser directly (see migration
// 20261009100000): this function is the only way to the questions, the
// solutions, the records and the file.
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

const RESOURCE = 'career-brainteasers';
const BUCKET = 'career-library';
const GREENBOOK = 'greenbook';
const MAX_PDF = 60 * 1024 * 1024;
export const REVEAL_PER_HOUR = 40;
export const REVEAL_PER_DAY = 150;
const GREENBOOK_PER_DAY = 3;
/** Rows per read: the API's cap on one request. */
const PAGE = 1000;

const LIMIT = { title: 120, field: 40, firm: 60, firms: 30, question: 8000, answer: 20000, note: 2000 };
const ID_RE = /^[a-z0-9][a-z0-9-]{0,79}$/;

/** "9 October 2026", on Rome's calendar. */
function romeDay(d = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}
function romeClock(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: 'numeric', minute: '2-digit', hour12: true }).format(d).toLowerCase();
}
function slugify(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'question';
}
const str = (v: unknown) => (typeof v === 'string' ? v : '');

interface ProblemRow { id: string; title: string; field: string; firms: string[]; question: string; answer?: string; hidden: boolean; sort_order: number; updated_at?: string }
interface ProgressRow { problem_id: string; status: 'solved' | 'needed_help' | null; flagged: boolean; note: string | null; revealed_at: string | null; status_at: string | null }

Deno.serve(audited('career-brainteasers', async (req, audit) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Sign in to continue.' }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authError || !user) return json({ error: 'Your session has expired. Sign in again.' }, 401);
    const { data: roleRows } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const roles = rolesOf(roleRows);
    audit.actor(user, roles);
    if (!allows(roles, user.email, RESOURCE, 'view')) return json({ error: 'Brainteasers are not available for your role.' }, 403);
    const canManage = allows(roles, user.email, RESOURCE, 'manage');
    // The greenbook is replaced by the President and the admin account only.
    const canReplace = user.email === OWNER_EMAIL || roles.some((r) => ['president', 'admin'].includes(normalizeRole(r)));

    const parsed = await readJsonObject(req);
    if (!parsed) return json({ error: UNREADABLE_BODY }, 400);
    const body = parsed as LooseBody;
    const action = typeof body.action === 'string' ? body.action : '';
    audit.request(action, {});

    const progressOf = async (id: string) => {
      const { data } = await supabase.from('brainteaser_progress')
        .select('problem_id, status, flagged, note, revealed_at, status_at').eq('user_id', user.id).eq('problem_id', id).maybeSingle();
      return data as ProgressRow | null;
    };
    const problemOf = async (id: unknown, withAnswer = false) => {
      if (typeof id !== 'string' || !ID_RE.test(id)) return null;
      const { data } = await supabase.from('brainteasers')
        .select(withAnswer ? 'id, title, field, firms, question, answer, hidden, sort_order, updated_at' : 'id, title, field, firms, question, hidden, sort_order, updated_at')
        .eq('id', id).maybeSingle();
      const p = data as ProblemRow | null;
      if (!p || (p.hidden && !canManage)) return null;
      return p;
    };
    const greenbookRow = async () => {
      const { data } = await supabase.from('career_files')
        .select('id, label, file_path, file_name, size_bytes, width, updated_at').eq('kind', GREENBOOK).maybeSingle();
      return data as { id: string; label: string | null; file_path: string; file_name: string; size_bytes: number | null; width: number | null; updated_at: string } | null;
    };
    const readObject = async (path: string): Promise<Uint8Array | null> => {
      const { data, error } = await supabase.storage.from(BUCKET).download(path);
      if (error || !data) return null;
      return new Uint8Array(await data.arrayBuffer());
    };
    const greenbookOut = (g: Awaited<ReturnType<typeof greenbookRow>>) => g ? {
      id: g.id, title: g.label, file_name: g.file_name, size_bytes: g.size_bytes, pages: g.width, updated_at: g.updated_at,
    } : null;

    // ── The questions ───────────────────────────────────────────────
    if (action === 'list') {
      // THE STARTER SET IS LOADED THE FIRST TIME THE PAGE IS OPENED, by
      // whoever opens it. Questions are hidden rather than deleted, so the
      // table only ever grows: fewer rows than the starter set means it is
      // not all in yet (never loaded, or a load cut short), and the next
      // visit completes it. The insert ignores rows already there, so it
      // never overwrites a correction and two visits at once cannot clash.
      // A row the table would refuse is left out rather than allowed to
      // stop the other questions from loading.
      const { count } = await supabase.from('brainteasers').select('id', { count: 'exact', head: true });
      if ((count ?? 0) < SEED.length) {
        const fits = ([id, title, field, firms, question, answer]: typeof SEED[number]) =>
          ID_RE.test(id) && !!title.trim() && title.length <= LIMIT.title && !!field.trim() && field.length <= LIMIT.field
          && firms.length <= LIMIT.firms && !!question && question.length <= LIMIT.question && !!answer && answer.length <= LIMIT.answer;
        for (let i = 0; i < SEED.length; i += 100) {
          const rows = SEED.slice(i, i + 100).map((r, k) => [r, i + k] as const).filter(([r]) => fits(r))
            .map(([[id, title, field, firms, question, answer], n]) => ({ id, title, field, firms, question, answer, sort_order: (n + 1) * 10 }));
          const { error } = await supabase.from('brainteasers').upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
          if (error) console.error('career-brainteasers: starter questions', i + 1, 'to', i + rows.length, 'not loaded:', error.message);
        }
      }
      // Read in pages: the API hands out at most 1000 rows a request, and
      // the set (and one reader's record of it) can outgrow that.
      const problems: ProblemRow[] = [];
      for (let from = 0; ; from += PAGE) {
        let q = supabase.from('brainteasers').select('id, title, field, firms, question, hidden, sort_order, updated_at')
          .order('sort_order', { ascending: true }).order('id', { ascending: true }).range(from, from + PAGE - 1);
        if (!canManage) q = q.eq('hidden', false);
        const { data, error } = await q;
        if (error) throw error;
        problems.push(...((data || []) as ProblemRow[]));
        if (!data || data.length < PAGE) break;
      }
      const mine: ProgressRow[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error: pErr } = await supabase.from('brainteaser_progress')
          .select('problem_id, status, flagged, note, revealed_at, status_at').eq('user_id', user.id)
          .order('problem_id', { ascending: true }).range(from, from + PAGE - 1);
        if (pErr) throw pErr;
        mine.push(...((data || []) as ProgressRow[]));
        if (!data || data.length < PAGE) break;
      }
      const progress: Record<string, Omit<ProgressRow, 'problem_id'>> = {};
      for (const r of mine) {
        const { problem_id, ...rest } = r;
        progress[problem_id] = rest;
      }
      return json({
        problems, progress,
        can_manage: canManage, can_replace_greenbook: canReplace,
        greenbook: greenbookOut(await greenbookRow()),
        limits: { reveal_per_hour: REVEAL_PER_HOUR, reveal_per_day: REVEAL_PER_DAY, greenbook_per_day: GREENBOOK_PER_DAY },
      });
    }

    if (action === 'reveal') {
      const p = await problemOf(body.id, true);
      if (!p) return json({ error: 'This question is no longer available. Reload the page.' }, 404);
      const had = await progressOf(p.id);
      if (!had?.revealed_at && !canManage) {
        const now = Date.now();
        const { data: recent, error } = await supabase.from('brainteaser_progress')
          .select('revealed_at').eq('user_id', user.id).gte('revealed_at', new Date(now - 86400000).toISOString())
          .order('revealed_at', { ascending: true });
        if (error) throw error;
        const times = ((recent || []) as { revealed_at: string }[]).map((r) => new Date(r.revealed_at).getTime());
        const lastHour = times.filter((t) => t > now - 3600000);
        if (lastHour.length >= REVEAL_PER_HOUR) {
          const free = new Date(lastHour[0] + 3600000);
          return json({ error: `You have opened ${REVEAL_PER_HOUR} new solutions in the last hour, the most the page gives in an hour. Solutions you have already opened stay available; new ones again from ${romeClock(free)}.`, limited: true }, 429);
        }
        if (times.length >= REVEAL_PER_DAY) {
          const free = new Date(times[0] + 86400000);
          return json({ error: `You have opened ${REVEAL_PER_DAY} new solutions today, the most the page gives in a day. Solutions you have already opened stay available; new ones again from ${romeClock(free)} tomorrow.`, limited: true }, 429);
        }
      }
      let revealedAt = had?.revealed_at ?? null;
      if (!revealedAt) {
        revealedAt = new Date().toISOString();
        const { error } = await supabase.from('brainteaser_progress')
          .upsert({ user_id: user.id, problem_id: p.id, revealed_at: revealedAt, updated_at: revealedAt }, { onConflict: 'user_id,problem_id' });
        if (error) throw error;
      }
      return json({ id: p.id, answer: p.answer, revealed_at: revealedAt });
    }

    if (action === 'progress') {
      const p = await problemOf(body.id);
      if (!p) return json({ error: 'This question is no longer available. Reload the page.' }, 404);
      const patch: Record<string, unknown> = { user_id: user.id, problem_id: p.id, updated_at: new Date().toISOString() };
      if ('status' in body) {
        if (body.status !== null && body.status !== 'solved' && body.status !== 'needed_help') return json({ error: 'Choose Solved on my own or Needed the solution.' }, 400);
        patch.status = body.status;
        patch.status_at = body.status ? new Date().toISOString() : null;
      }
      if ('flagged' in body) {
        if (typeof body.flagged !== 'boolean') return json({ error: 'Say whether the question is flagged.' }, 400);
        patch.flagged = body.flagged;
      }
      if ('note' in body) {
        if (body.note !== null && typeof body.note !== 'string') return json({ error: 'The note could not be read.' }, 400);
        const note = typeof body.note === 'string' ? body.note.trim() : '';
        if (note.length > LIMIT.note) return json({ error: `A note can be up to ${LIMIT.note} characters.` }, 400);
        patch.note = note || null;
      }
      if (Object.keys(patch).length <= 3) return json({ error: 'Nothing to save.' }, 400);
      const { data, error } = await supabase.from('brainteaser_progress')
        .upsert(patch, { onConflict: 'user_id,problem_id' })
        .select('problem_id, status, flagged, note, revealed_at, status_at').single();
      if (error) throw error;
      const row = data as ProgressRow;
      // A record with nothing left in it is removed.
      if (!row.status && !row.flagged && !row.note && !row.revealed_at) {
        await supabase.from('brainteaser_progress').delete().eq('user_id', user.id).eq('problem_id', p.id);
      }
      const { problem_id: _id, ...rest } = row;
      return json({ id: p.id, progress: rest });
    }

    if (action === 'reset') {
      // Statuses, flags and notes go; the solutions already opened stay
      // counted, so a reset is never a way round the limits.
      const { error } = await supabase.from('brainteaser_progress')
        .update({ status: null, status_at: null, flagged: false, note: null, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      if (error) throw error;
      await supabase.from('brainteaser_progress').delete().eq('user_id', user.id).is('revealed_at', null);
      return json({ success: true });
    }

    // ── The greenbook, for readers ──────────────────────────────────
    if (action === 'greenbook-download') {
      const g = await greenbookRow();
      if (!g) return json({ error: 'The greenbook has not been uploaded yet.' }, 404);
      const since = new Date(Date.now() - 86400000).toISOString();
      const { count } = await supabase.from('greenbook_downloads')
        .select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('downloaded_at', since);
      if ((count ?? 0) >= GREENBOOK_PER_DAY && !canReplace) {
        return json({ error: `You have downloaded the greenbook ${GREENBOOK_PER_DAY} times in the last 24 hours. Use the copy you already have; it is the same book.` }, 429);
      }
      const { data: me } = await supabase.from('members').select('first_name, surname, email').eq('user_id', user.id).maybeSingle();
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      const name = (me ? `${me.first_name ?? ''} ${me.surname ?? ''}`.trim() : '') || profile?.full_name || user.email || 'Member';
      const email = (me?.email || user.email || '').trim();
      // Read straight into bytes, keeping no second copy alive: the book is
      // large, and a function's memory is not.
      const original = await readObject(g.file_path);
      if (!original) throw new Error('greenbook missing from storage');
      const today = romeDay();
      // The name as the PDF's font can print it (Ł as L, Ελένη as Eleni);
      // a name with no Latin form is replaced by the email, so every copy
      // still says whose it is.
      const printed = printable(name).trim();
      const shown = /[A-Za-z]/.test(printed) ? printed : '';
      const issuedTo = shown ? `${shown}${email ? ` (${email})` : ''}` : (email || 'a member of the Society');
      const out = await watermarkPdf(original, {
        footer: `Issued to ${issuedTo} on ${today} · Minerva IMS members only · Not for distribution`,
        cover: [
          `This copy was issued to ${shown || email || 'a member of the Society'} on ${today} for personal study.`,
          'Minerva Investment Management Society: for members only. Do not copy, share or distribute it.',
          'Every copy carries the name of the person it was issued to.',
        ],
      });
      const { error: logErr } = await supabase.from('greenbook_downloads').insert({ user_id: user.id, name, email: email || null, file_id: g.id });
      if (logErr) throw logErr;
      audit.subject(g.label || g.file_name, g.id);
      const base = (g.file_name.replace(/\.pdf$/i, '') || 'greenbook').replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 60);
      const who = (shown || email.split('@')[0]).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
      const parts = out.parts;
      const stream = new ReadableStream<Uint8Array>({
        pull(controller) {
          const next = parts.shift();
          if (next) controller.enqueue(next); else controller.close();
        },
      });
      return new Response(stream, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Length': String(out.length),
          'Content-Disposition': `attachment; filename="${base}_${who || 'member'}.pdf"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    // ── Editing the questions ───────────────────────────────────────
    if (action === 'save') {
      if (!canManage) return json({ error: 'Only the President, the Vice President and the Head of Operations can edit the questions.' }, 403);
      const input = (body.problem && typeof body.problem === 'object' ? body.problem : {}) as Record<string, unknown>;
      const title = str(input.title).trim();
      const field = str(input.field).trim();
      const question = str(input.question).trim();
      const answer = str(input.answer).trim();
      const firmsIn = Array.isArray(input.firms) ? input.firms : [];
      const firms = [...new Set(firmsIn.map((f) => str(f).trim()).filter(Boolean))];
      if (!title || title.length > LIMIT.title) return json({ error: `Give the question a title of up to ${LIMIT.title} characters.` }, 400);
      if (!field || field.length > LIMIT.field) return json({ error: 'Choose the type of question.' }, 400);
      if (!question || question.length > LIMIT.question) return json({ error: `Write the question (up to ${LIMIT.question} characters).` }, 400);
      if (!answer || answer.length > LIMIT.answer) return json({ error: `Write the solution (up to ${LIMIT.answer} characters).` }, 400);
      if (firms.length > LIMIT.firms || firms.some((f) => f.length > LIMIT.firm)) return json({ error: `Up to ${LIMIT.firms} firms, each up to ${LIMIT.firm} characters.` }, 400);
      const hidden = input.hidden === true;
      audit.subject(title);
      const fields = { title, field, firms, question, answer, hidden, updated_by: user.id };
      if (typeof input.id === 'string' && input.id) {
        if (!ID_RE.test(input.id)) return json({ error: 'This question could not be found.' }, 404);
        const { data, error } = await supabase.from('brainteasers').update(fields).eq('id', input.id)
          .select('id, title, field, firms, question, answer, hidden, sort_order, updated_at').maybeSingle();
        if (error) throw error;
        if (!data) return json({ error: 'This question could not be found. Reload the page.' }, 404);
        return json({ problem: data });
      }
      // A new question: an id from its title, made unique.
      const base = slugify(title);
      const { data: taken } = await supabase.from('brainteasers').select('id').like('id', `${base}%`);
      const used = new Set(((taken || []) as { id: string }[]).map((r) => r.id));
      let id = base; let n = 2;
      while (used.has(id)) id = `${base}-${n++}`;
      const { data: last } = await supabase.from('brainteasers').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
      const { data, error } = await supabase.from('brainteasers')
        .insert({ id, ...fields, created_by: user.id, sort_order: ((last as { sort_order: number } | null)?.sort_order ?? 0) + 10 })
        .select('id, title, field, firms, question, answer, hidden, sort_order, updated_at').single();
      if (error) throw error;
      return json({ problem: data });
    }

    // ── The greenbook, for the President and the admin account ─────
    if (action.startsWith('greenbook-')) {
      if (!canReplace) return json({ error: 'Only the President and the admin account can change the greenbook.' }, 403);

      if (action === 'greenbook-upload-url') {
        const path = `${GREENBOOK}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.pdf`;
        const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
        if (error || !data) throw error ?? new Error('no upload link');
        return json({ bucket: BUCKET, path, token: data.token });
      }

      if (action === 'greenbook-commit') {
        const path = str(body.path);
        if (!/^greenbook\/\d+-[0-9a-f]{8}\.pdf$/.test(path)) return json({ error: 'The upload could not be found. Try again.' }, 400);
        const fileName = (str(body.file_name).trim() || 'greenbook.pdf').slice(-200);
        const label = (str(body.title).trim() || 'A Practical Guide to Quantitative Finance Interviews').slice(0, 120);
        const discard = () => supabase.storage.from(BUCKET).remove([path]);
        const bytes = await readObject(path);
        if (!bytes) return json({ error: 'The upload did not arrive. Try again.' }, 400);
        if (bytes.length > MAX_PDF) { await discard(); return json({ error: 'The PDF must be under 60 MB.' }, 400); }
        // The file is checked by watermarking it once, exactly as every
        // download will: a PDF that cannot be watermarked is refused now
        // rather than failing in a member's hands.
        let pages = 0;
        try {
          pages = (await watermarkPdf(bytes, { footer: 'Check', cover: ['Check'] })).pages;
        } catch (e) {
          await discard();
          const why = e instanceof Error && /encrypt|password/i.test(e.message) ? 'It is password-protected or encrypted; upload an unprotected copy.' : 'It could not be read as a PDF.';
          return json({ error: `This file cannot be used. ${why}` }, 400);
        }
        const old = await greenbookRow();
        if (old) await supabase.from('career_files').delete().eq('id', old.id);
        const { data: row, error } = await supabase.from('career_files').insert({
          kind: GREENBOOK, label, file_path: path, file_name: fileName, mime_type: 'application/pdf',
          size_bytes: bytes.length, width: pages, uploaded_by: user.id,
        }).select('id, label, file_path, file_name, size_bytes, width, updated_at').single();
        if (error) { await discard(); throw error; }
        if (old && old.file_path !== path) await supabase.storage.from(BUCKET).remove([old.file_path]);
        audit.subject(label, row.id);
        return json({ greenbook: greenbookOut(row) });
      }

      if (action === 'greenbook-remove') {
        const g = await greenbookRow();
        if (!g) return json({ success: true });
        await supabase.from('career_files').delete().eq('id', g.id);
        await supabase.storage.from(BUCKET).remove([g.file_path]);
        audit.subject(g.label || g.file_name, g.id);
        return json({ success: true });
      }

      if (action === 'greenbook-register') {
        const { data, error } = await supabase.from('greenbook_downloads')
          .select('name, email, downloaded_at').order('downloaded_at', { ascending: false }).limit(300);
        if (error) throw error;
        return json({ downloads: data || [] });
      }
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (error) {
    console.error('career-brainteasers error:', error);
    return json({ error: 'Something went wrong with Brainteasers. Please try again.' }, 500);
  }
}));
