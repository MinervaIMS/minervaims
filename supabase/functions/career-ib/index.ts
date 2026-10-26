import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { audited } from '../_shared/activity.ts';
import { allows, normalizeRole, OWNER_EMAIL, rolesOf } from '../_shared/access.ts';
import { readJsonObject, UNREADABLE_BODY, type LooseBody } from '../_shared/request-body.ts';
import {
  bookOut, bookRegister, bookRow, bookUploadUrl, commitBook, downloadBook, removeBook, type BookSpec,
} from '../_shared/career-book.ts';
import { SEED, type SeedQuestion } from './seed.ts';

// =====================================================================
// career-ib: Career > IB Questions (Step 101).
// ---------------------------------------------------------------------
// Two banks of four-option questions, built as Career > Brainteasers is:
//   redbook    Wall Street Prep, "Investment Banking Interview Questions"
//   blueprint  Breaking Into Wall Street, "The 400 Investment Banking
//              Interview Questions & Answers" (the "Banker Blueprint")
//
// TRAINING (everybody with the page, 'career-ib' at 'view')
//   list      the questions of both banks WITHOUT their right answers or
//             explanations, the reader's own record, and the two guides
//   answer    the reader's choice for one question: whether it is right,
//             the right option and the guide's explanation. The first time
//             a reader is given a question's answer it is counted: no more
//             than ANSWER_PER_HOUR new ones an hour and ANSWER_PER_DAY a day,
//             so the banks are practised rather than copied out. Answering
//             again a question already answered is free.
//   progress  the reader's own: a flag, a private note
//   reset     clears the reader's answers, flags and notes in one bank
//             (the answers already given out stay counted)
//
// EDITING ('manage': the President, the Vice President, the Head of
// Operations and the admin account)
//   full      one question with its right answer and explanation, to edit
//   save      correct a question or add one; hide it from members
//
// THE GUIDES (one PDF per bank; see _shared/career-book.ts)
//   guide-download    everybody with the page: the reader's own copy,
//                     watermarked with their name, recorded
//   guide-upload-url  the President and the admin account only: a
//   guide-commit      one-time upload link, the check that it is a usable
//   guide-remove      PDF, removal, and who downloaded it
//   guide-register
//
// Nothing here is readable from the browser directly (see migration
// 20261029090000): this function is the only way to the questions, the
// answers, the records and the guides.
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

const RESOURCE = 'career-ib';
export const ANSWER_PER_HOUR = 100;
export const ANSWER_PER_DAY = 300;
const GUIDE_PER_DAY = 3;
/** Rows per read: the API's cap on one request. */
const PAGE = 1000;

type Bank = 'redbook' | 'blueprint';
const BANKS: Bank[] = ['redbook', 'blueprint'];
const isBank = (v: unknown): v is Bank => typeof v === 'string' && (BANKS as string[]).includes(v);
/** The prefix of a question's id in each bank, also for questions added in the page. */
const PREFIX: Record<Bank, string> = { redbook: 'IB', blueprint: 'BB' };

export const GUIDES: Record<Bank, BookSpec> = {
  redbook: { kind: 'ib_redbook', folder: 'ib-redbook', defaultTitle: 'Investment Banking Interview Questions', perDay: GUIDE_PER_DAY },
  blueprint: { kind: 'ib_blueprint', folder: 'ib-blueprint', defaultTitle: 'The 400 Investment Banking Interview Questions & Answers', perDay: GUIDE_PER_DAY },
};

const LIMIT = { subject: 60, section: 80, question: 2000, original: 2000, instruction: 300, statement: 2000, option: 500, explanation: 8000, note: 2000 };
const ID_RE = /^[A-Z]{2}-[A-Z0-9-]{1,30}$/;
const LETTERS = ['A', 'B', 'C', 'D'] as const;
type Letter = typeof LETTERS[number];
const isLetter = (v: unknown): v is Letter => typeof v === 'string' && (LETTERS as readonly string[]).includes(v);

/** "9:30 pm", on Rome's clock. */
function romeClock(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: 'numeric', minute: '2-digit', hour12: true }).format(d).toLowerCase();
}
const str = (v: unknown) => (typeof v === 'string' ? v : '');

const PUBLIC_COLS = 'id, bank, subject, section, question, original, kind, instruction, statement, options, page, hidden, sort_order, updated_at';
const FULL_COLS = `${PUBLIC_COLS}, correct, explanation`;

interface QuestionRow {
  id: string; bank: Bank; subject: string; section: string; question: string; original: string | null;
  kind: 'technical' | 'completion'; instruction: string; statement: string | null; options: string[];
  page: number | null; hidden: boolean; sort_order: number; updated_at?: string;
  correct?: Letter; explanation?: string;
}
interface ProgressRow {
  question_id: string; status: 'right' | 'wrong' | null; choice: Letter | null; attempts: number;
  flagged: boolean; note: string | null; revealed_at: string | null; status_at: string | null;
}
const PROGRESS_COLS = 'question_id, status, choice, attempts, flagged, note, revealed_at, status_at';

/** Whether a seed row fits the table, so one row the table would refuse cannot stop the others. */
function fits(q: SeedQuestion): boolean {
  const len = (s: string | null, max: number, min = 1) => s !== null && s.trim().length >= min && s.length <= max;
  return ID_RE.test(q.id) && isBank(q.bank) && len(q.subject, LIMIT.subject) && len(q.section, LIMIT.section)
    && len(q.question, LIMIT.question) && (q.original === null || q.original.length <= LIMIT.original)
    && (q.kind === 'technical' || (q.kind === 'completion' && !!q.statement && q.statement.includes('____')))
    && len(q.instruction, LIMIT.instruction) && (q.statement === null || q.statement.length <= LIMIT.statement)
    && q.options.length === 4 && q.options.every((o) => len(o, LIMIT.option)) && isLetter(q.correct)
    && len(q.explanation, LIMIT.explanation);
}

Deno.serve(audited('career-ib', async (req, audit) => {
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
    if (!allows(roles, user.email, RESOURCE, 'view')) return json({ error: 'IB Questions are not available for your role.' }, 403);
    const canManage = allows(roles, user.email, RESOURCE, 'manage');
    // The guides are replaced by the President and the admin account only, as the greenbook is.
    const canReplace = user.email === OWNER_EMAIL || roles.some((r) => ['president', 'admin'].includes(normalizeRole(r)));

    const parsed = await readJsonObject(req);
    if (!parsed) return json({ error: UNREADABLE_BODY }, 400);
    const body = parsed as LooseBody;
    const action = typeof body.action === 'string' ? body.action : '';
    audit.request(action, {});

    const progressOf = async (id: string) => {
      const { data } = await supabase.from('ib_question_progress').select(PROGRESS_COLS)
        .eq('user_id', user.id).eq('question_id', id).maybeSingle();
      return data as ProgressRow | null;
    };
    const questionOf = async (id: unknown, full = false) => {
      if (typeof id !== 'string' || !ID_RE.test(id)) return null;
      const { data } = await supabase.from('ib_questions').select(full ? FULL_COLS : PUBLIC_COLS).eq('id', id).maybeSingle();
      const q = data as QuestionRow | null;
      if (!q || (q.hidden && !canManage)) return null;
      return q;
    };
    const progressOut = (r: ProgressRow) => {
      const { question_id: _id, ...rest } = r;
      return rest;
    };

    // ── The questions ───────────────────────────────────────────────
    if (action === 'list') {
      // THE STARTER SET IS LOADED THE FIRST TIME THE PAGE IS OPENED, as
      // Brainteasers' is: questions are hidden rather than deleted, so the
      // table only grows, and fewer starter questions than the starter set
      // means it is not all in yet. Questions added in the page ("IB-N1",
      // "BB-N1") are not counted, so one added cannot hide one missing.
      // The insert ignores rows already there, so it never overwrites a
      // correction and two visits at once cannot clash.
      const { count } = await supabase.from('ib_questions').select('id', { count: 'exact', head: true });
      const { count: added } = await supabase.from('ib_questions').select('id', { count: 'exact', head: true }).like('id', '__-N%');
      if ((count ?? 0) - (added ?? 0) < SEED.length) {
        for (let i = 0; i < SEED.length; i += 100) {
          const rows = SEED.slice(i, i + 100).filter(fits).map((q) => ({
            id: q.id, bank: q.bank, subject: q.subject, section: q.section, question: q.question, original: q.original,
            kind: q.kind, instruction: q.instruction, statement: q.statement, options: q.options, correct: q.correct,
            explanation: q.explanation, page: q.page, sort_order: q.order,
          }));
          const { error } = await supabase.from('ib_questions').upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
          if (error) console.error('career-ib: starter questions', i + 1, 'to', i + rows.length, 'not loaded:', error.message);
        }
      }
      const questions: QuestionRow[] = [];
      for (let from = 0; ; from += PAGE) {
        let q = supabase.from('ib_questions').select(PUBLIC_COLS)
          .order('bank', { ascending: false }).order('sort_order', { ascending: true }).order('id', { ascending: true })
          .range(from, from + PAGE - 1);
        if (!canManage) q = q.eq('hidden', false);
        const { data, error } = await q;
        if (error) throw error;
        questions.push(...((data || []) as QuestionRow[]));
        if (!data || data.length < PAGE) break;
      }
      const mine: ProgressRow[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase.from('ib_question_progress').select(PROGRESS_COLS).eq('user_id', user.id)
          .order('question_id', { ascending: true }).range(from, from + PAGE - 1);
        if (error) throw error;
        mine.push(...((data || []) as ProgressRow[]));
        if (!data || data.length < PAGE) break;
      }
      const progress: Record<string, ReturnType<typeof progressOut>> = {};
      for (const r of mine) progress[r.question_id] = progressOut(r);
      const guides: Record<string, ReturnType<typeof bookOut>> = {};
      for (const b of BANKS) guides[b] = bookOut(await bookRow(supabase, GUIDES[b]));
      return json({
        questions, progress, guides,
        can_manage: canManage, can_replace_guides: canReplace,
        limits: { answer_per_hour: ANSWER_PER_HOUR, answer_per_day: ANSWER_PER_DAY, guide_per_day: GUIDE_PER_DAY },
      });
    }

    if (action === 'answer') {
      if (!isLetter(body.choice)) return json({ error: 'Choose one of the four answers.' }, 400);
      const q = await questionOf(body.id, true);
      if (!q) return json({ error: 'This question is no longer available. Reload the page.' }, 404);
      const had = await progressOf(q.id);
      if (!had?.revealed_at && !canManage) {
        const now = Date.now();
        const { data: recent, error } = await supabase.from('ib_question_progress')
          .select('revealed_at').eq('user_id', user.id).gte('revealed_at', new Date(now - 86400000).toISOString())
          .order('revealed_at', { ascending: true });
        if (error) throw error;
        const times = ((recent || []) as { revealed_at: string }[]).map((r) => new Date(r.revealed_at).getTime());
        const lastHour = times.filter((t) => t > now - 3600000);
        if (lastHour.length >= ANSWER_PER_HOUR) {
          const free = new Date(lastHour[0] + 3600000);
          return json({ error: `You have answered ${ANSWER_PER_HOUR} new questions in the last hour, the most the page checks in an hour. Questions you have already answered can be answered again; new ones from ${romeClock(free)}.`, limited: true }, 429);
        }
        if (times.length >= ANSWER_PER_DAY) {
          const free = new Date(times[0] + 86400000);
          return json({ error: `You have answered ${ANSWER_PER_DAY} new questions today, the most the page checks in a day. Questions you have already answered can be answered again; new ones from ${romeClock(free)} tomorrow.`, limited: true }, 429);
        }
      }
      const at = new Date().toISOString();
      const right = body.choice === q.correct;
      const { data, error } = await supabase.from('ib_question_progress').upsert({
        user_id: user.id, question_id: q.id, status: right ? 'right' : 'wrong', choice: body.choice,
        attempts: (had?.attempts ?? 0) + 1, flagged: had?.flagged ?? false, note: had?.note ?? null,
        revealed_at: had?.revealed_at ?? at, status_at: at, updated_at: at,
      }, { onConflict: 'user_id,question_id' }).select(PROGRESS_COLS).single();
      if (error) throw error;
      return json({ id: q.id, right, correct: q.correct, explanation: q.explanation, progress: progressOut(data as ProgressRow) });
    }

    if (action === 'progress') {
      const q = await questionOf(body.id);
      if (!q) return json({ error: 'This question is no longer available. Reload the page.' }, 404);
      const patch: Record<string, unknown> = { user_id: user.id, question_id: q.id, updated_at: new Date().toISOString() };
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
      const { data, error } = await supabase.from('ib_question_progress')
        .upsert(patch, { onConflict: 'user_id,question_id' }).select(PROGRESS_COLS).single();
      if (error) throw error;
      const row = data as ProgressRow;
      // A record with nothing left in it is removed.
      if (!row.status && !row.flagged && !row.note && !row.revealed_at) {
        await supabase.from('ib_question_progress').delete().eq('user_id', user.id).eq('question_id', q.id);
      }
      return json({ id: q.id, progress: progressOut(row) });
    }

    if (action === 'reset') {
      if (!isBank(body.bank)) return json({ error: 'Choose the bank to start over.' }, 400);
      // Answers, flags and notes go, in that bank only; the answers already
      // given out stay counted, so a reset is never a way round the limits.
      const ids: string[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase.from('ib_questions').select('id').eq('bank', body.bank)
          .order('id', { ascending: true }).range(from, from + PAGE - 1);
        if (error) throw error;
        ids.push(...((data || []) as { id: string }[]).map((r) => r.id));
        if (!data || data.length < PAGE) break;
      }
      for (let i = 0; i < ids.length; i += 200) {
        const chunk = ids.slice(i, i + 200);
        const { error } = await supabase.from('ib_question_progress')
          .update({ status: null, choice: null, attempts: 0, status_at: null, flagged: false, note: null, updated_at: new Date().toISOString() })
          .eq('user_id', user.id).in('question_id', chunk);
        if (error) throw error;
        await supabase.from('ib_question_progress').delete().eq('user_id', user.id).in('question_id', chunk).is('revealed_at', null);
      }
      return json({ success: true });
    }

    // ── Editing the questions ───────────────────────────────────────
    if (action === 'full') {
      if (!canManage) return json({ error: 'Only the President, the Vice President and the Head of Operations can edit the questions.' }, 403);
      const q = await questionOf(body.id, true);
      if (!q) return json({ error: 'This question could not be found. Reload the page.' }, 404);
      return json({ question: q });
    }

    if (action === 'save') {
      if (!canManage) return json({ error: 'Only the President, the Vice President and the Head of Operations can edit the questions.' }, 403);
      const input = (body.question && typeof body.question === 'object' ? body.question : {}) as Record<string, unknown>;
      const bank = input.bank;
      const subject = str(input.subject).trim();
      const section = str(input.section).trim();
      const question = str(input.question).trim();
      const original = str(input.original).trim() || null;
      const kind = input.kind === 'completion' ? 'completion' : 'technical';
      const instruction = str(input.instruction).trim() || 'Select the single best answer.';
      const statement = kind === 'completion' ? str(input.statement).trim() : null;
      const options = Array.isArray(input.options) ? input.options.map((o) => str(o).trim()) : [];
      const correct = input.correct;
      const explanation = str(input.explanation).trim();
      const page = input.page === null || input.page === '' || input.page === undefined ? null : Number(input.page);
      if (!isBank(bank)) return json({ error: 'Choose the bank.' }, 400);
      if (!subject || subject.length > LIMIT.subject) return json({ error: `Give the subject (up to ${LIMIT.subject} characters).` }, 400);
      if (!section || section.length > LIMIT.section) return json({ error: `Give the subsection (up to ${LIMIT.section} characters).` }, 400);
      if (!question || question.length > LIMIT.question) return json({ error: `Write the question (up to ${LIMIT.question} characters).` }, 400);
      if (original && original.length > LIMIT.original) return json({ error: `The guide's wording can be up to ${LIMIT.original} characters.` }, 400);
      if (instruction.length > LIMIT.instruction) return json({ error: `The instruction can be up to ${LIMIT.instruction} characters.` }, 400);
      if (kind === 'completion' && (!statement || !statement.includes('____') || statement.length > LIMIT.statement)) return json({ error: 'Write the statement to complete, with ____ where the missing term goes.' }, 400);
      if (options.length !== 4 || options.some((o) => !o || o.length > LIMIT.option)) return json({ error: `Write all four answers (each up to ${LIMIT.option} characters).` }, 400);
      if (new Set(options.map((o) => o.toLowerCase())).size !== 4) return json({ error: 'The four answers must be different.' }, 400);
      if (!isLetter(correct)) return json({ error: 'Choose the right answer.' }, 400);
      if (!explanation || explanation.length > LIMIT.explanation) return json({ error: `Write the explanation (up to ${LIMIT.explanation} characters).` }, 400);
      if (page !== null && (!Number.isInteger(page) || page < 1 || page > 2000)) return json({ error: 'The page of the guide is a whole number, or empty.' }, 400);
      const hidden = input.hidden === true;
      audit.subject(question.slice(0, 120));
      const fields = { bank, subject, section, question, original, kind, instruction, statement, options, correct, explanation, page, hidden, updated_by: user.id };
      if (typeof input.id === 'string' && input.id) {
        if (!ID_RE.test(input.id)) return json({ error: 'This question could not be found.' }, 404);
        const { data, error } = await supabase.from('ib_questions').update(fields).eq('id', input.id).select(FULL_COLS).maybeSingle();
        if (error) throw error;
        if (!data) return json({ error: 'This question could not be found. Reload the page.' }, 404);
        return json({ question: data });
      }
      // A new question: the bank's prefix and the next number added here.
      const prefix = `${PREFIX[bank]}-N`;
      const { data: taken } = await supabase.from('ib_questions').select('id').like('id', `${prefix}%`);
      const used = new Set(((taken || []) as { id: string }[]).map((r) => r.id));
      let n = used.size + 1;
      while (used.has(`${prefix}${n}`)) n += 1;
      const { data: last } = await supabase.from('ib_questions').select('sort_order').eq('bank', bank)
        .order('sort_order', { ascending: false }).limit(1).maybeSingle();
      const { data, error } = await supabase.from('ib_questions')
        .insert({ id: `${prefix}${n}`, ...fields, created_by: user.id, sort_order: ((last as { sort_order: number } | null)?.sort_order ?? 0) + 10 })
        .select(FULL_COLS).single();
      if (error) throw error;
      return json({ question: data });
    }

    // ── The guides ──────────────────────────────────────────────────
    if (action.startsWith('guide-')) {
      if (!isBank(body.bank)) return json({ error: 'Choose the guide.' }, 400);
      const spec = GUIDES[body.bank];

      if (action === 'guide-download') {
        const r = await downloadBook(supabase, spec, user, canReplace, corsHeaders);
        if (r.subject) audit.subject(r.subject.name, r.subject.id);
        return r.response ?? json(r.body, r.status);
      }

      if (!canReplace) return json({ error: 'Only the President and the admin account can change the guides.' }, 403);

      if (action === 'guide-upload-url') return json(await bookUploadUrl(supabase, spec));

      if (action === 'guide-commit') {
        const r = await commitBook(supabase, spec, user.id, { path: str(body.path), file_name: str(body.file_name), title: str(body.title) });
        if (r.subject) audit.subject(r.subject.name, r.subject.id);
        return json(r.body, r.status);
      }

      if (action === 'guide-remove') {
        const r = await removeBook(supabase, spec);
        if (r.subject) audit.subject(r.subject.name, r.subject.id);
        return json(r.body, r.status);
      }

      if (action === 'guide-register') return json({ downloads: await bookRegister(supabase, spec) });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (error) {
    console.error('career-ib error:', error);
    return json({ error: 'Something went wrong with IB Questions. Please try again.' }, 500);
  }
}));
