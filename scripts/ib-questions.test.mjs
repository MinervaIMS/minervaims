// =====================================================================
// ib-questions.test.mjs: Career > IB Questions (Step 101).
// ---------------------------------------------------------------------
//   node --test scripts/ib-questions.test.mjs
//
// Pure checks on the sources, no database and no network:
//   * the starter set holds the two banks as supplied, 202 RedBook and
//     145 Banker Blueprint questions, each with four different answers,
//     one of them right, an explanation and the page of its guide;
//   * the list the browser receives never carries the right answers or
//     the explanations, and the limits the help states are the ones the
//     function applies;
//   * the access matrix gives the Vice President and the Head of
//     Operations 'manage', in the browser's copy and the functions' copy;
//   * the page reuses Brainteasers' list and progress, whose own words
//     are unchanged, and the coming-soon page no longer stands in for it;
//   * the function is declared as Brainteasers' is, checking the session
//     itself, and the activity registry places it and names its writes;
//   * the migration only adds, and keeps everything from the browser;
//   * every help dot of the page opens a topic that exists;
//   * nothing added carries an em dash.
// =====================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const require = createRequire(import.meta.url);
const { buildSync } = require(join(ROOT, 'node_modules', 'esbuild'));
const CACHE = join(ROOT, 'node_modules', '.cache', 'ib-questions-test');
mkdirSync(CACHE, { recursive: true });
const load = async (p, name) => {
  const out = join(CACHE, `${name}.mjs`);
  buildSync({
    entryPoints: [join(ROOT, p)], bundle: true, outfile: out, format: 'esm', platform: 'node',
    alias: { '@': join(ROOT, 'src') }, packages: 'external', jsx: 'automatic',
    define: { 'import.meta.env.DEV': 'false' }, logLevel: 'silent',
  });
  return import(`${pathToFileURL(out).href}?${Date.now()}`);
};

const FN = 'supabase/functions/career-ib/';
const IB = 'src/components/admin/career/ib/';
const BT = 'src/components/admin/career/brainteasers/';
const MIGRATION = 'supabase/migrations/20261029090000_career_ib_questions.sql';

test('the starter set holds the two banks as supplied', async () => {
  const { SEED } = await load(`${FN}seed.ts`, 'seed');
  assert.equal(SEED.length, 347);
  assert.equal(SEED.filter((q) => q.bank === 'redbook').length, 202);
  assert.equal(SEED.filter((q) => q.bank === 'blueprint').length, 145);
  const ids = new Set();
  for (const q of SEED) {
    assert.match(q.id, /^[A-Z]{2}-[A-Z0-9-]{1,30}$/, q.id);
    // Questions added in the page are numbered IB-N1, BB-N1...: no starter id looks like one.
    assert.doesNotMatch(q.id, /^..-N/, q.id);
    assert.ok(!ids.has(q.id), `${q.id} twice`); ids.add(q.id);
    assert.ok(q.subject.trim() && q.section.trim() && q.question.trim() && q.instruction.trim(), q.id);
    assert.equal(q.options.length, 4, q.id);
    assert.ok(q.options.every((o) => o.trim()), q.id);
    assert.equal(new Set(q.options.map((o) => o.trim().toLowerCase())).size, 4, `${q.id}: answers must differ`);
    assert.ok(['A', 'B', 'C', 'D'].includes(q.correct), q.id);
    assert.ok(q.explanation.trim().length > 20, q.id);
    assert.ok(Number.isInteger(q.page) && q.page > 0, q.id);
    if (q.kind === 'completion') assert.equal(q.statement.split('____').length, 2, `${q.id}: one gap`);
    else { assert.equal(q.kind, 'technical', q.id); assert.equal(q.statement, null, q.id); }
  }
});

test('the starter set reads as the house style asks: no em dash, Brainteasers in one word', async () => {
  const { SEED } = await load(`${FN}seed.ts`, 'seed');
  for (const q of SEED) {
    const text = [q.subject, q.section, q.question, q.original ?? '', q.instruction, q.statement ?? '', ...q.options].join('\n');
    assert.doesNotMatch(text, /\u2014/, q.id);
    assert.doesNotMatch(q.explanation, /\u2014/, q.id);
  }
  assert.ok(SEED.some((q) => q.subject === 'Brainteasers'));
  assert.ok(!SEED.some((q) => /Brain Teasers/.test(q.subject)));
});

test('the right answer and the explanation reach the browser only once a question is answered', () => {
  const src = read(`${FN}index.ts`);
  const pub = src.match(/const PUBLIC_COLS = '([^']+)'/)[1].split(/,\s*/);
  assert.ok(!pub.includes('correct') && !pub.includes('explanation'), pub.join(', '));
  assert.match(src, /const FULL_COLS = `\$\{PUBLIC_COLS\}, correct, explanation`/);
  // The list reads PUBLIC_COLS; FULL_COLS only for the editors.
  assert.match(src, /select\(full \? FULL_COLS : PUBLIC_COLS\)/);
  assert.match(src, /let q = supabase\.from\('ib_questions'\)\.select\(PUBLIC_COLS\)/);
});

test('the limits the help states are the ones the function applies', () => {
  const src = read(`${FN}index.ts`);
  const hour = Number(src.match(/export const ANSWER_PER_HOUR = (\d+);/)[1]);
  const day = Number(src.match(/export const ANSWER_PER_DAY = (\d+);/)[1]);
  const guides = Number(src.match(/const GUIDE_PER_DAY = (\d+);/)[1]);
  assert.deepEqual([hour, day, guides], [100, 300, 3]);
  const guide = read('src/lib/workspace-guide.ts');
  const entry = guide.slice(guide.indexOf("key: 'career-ib'"), guide.indexOf("key: 'reports-upload'"));
  assert.match(entry, new RegExp(`up to ${hour} new questions an hour and ${day} a day`));
  assert.match(entry, /Up to three downloads of each guide a day/);
  assert.match(read('src/lib/workspace-manual.ts'), new RegExp(`checks up to ${hour} new questions an hour and ${day} a day`));
});

test('the Vice President and the Head of Operations manage IB Questions, in both copies of the matrix', async () => {
  const { resolveLevel } = await load('src/lib/access/matrix.ts', 'matrix');
  for (const r of ['president', 'admin', 'vice_president', 'head_of_operations']) {
    assert.equal(resolveLevel([r], 'career-ib'), 'manage', r);
    assert.equal(resolveLevel([r], 'career-brainteasers'), 'manage', r);
  }
  for (const r of ['analyst', 'senior_analyst', 'head_of_division', 'head_of_media', 'alumni', 'operations_analyst']) {
    assert.equal(resolveLevel([r], 'career-ib'), 'view', r);
  }
  // The functions check again, from their own copy: it must say the same for every role.
  const fn = await load('supabase/functions/_shared/access.ts', 'access-fn');
  for (const r of Object.keys(fn.MATRIX)) {
    assert.equal(fn.resolveLevel([r], 'career-ib'), resolveLevel([r], 'career-ib'), r);
  }
});

test('IB Questions has its own page, reusing Brainteasers\' list and progress', () => {
  const ws = read('src/pages/MinervaWorkspace.tsx');
  assert.match(ws, /case 'career-ib':\s*return <IbQuestions \/>;/);
  assert.match(ws, /const IbQuestions = lazy\(\(\) => import\('@\/components\/admin\/career\/ib\/IbQuestions'\)\);/);
  const soon = read('src/components/admin/career/CareerComingSoon.tsx');
  assert.match(soon, /type Which = 'smart' \| 'gmat';/);
  assert.doesNotMatch(soon, /\bib:/);
  const page = read(`${IB}IbQuestions.tsx`);
  for (const piece of ['ProblemList', 'ProgressView', 'BookView', 'MultiPick']) assert.match(page + read(`${IB}PracticeView.tsx`), new RegExp(`\\b${piece}\\b`), piece);
  assert.match(read(`${IB}QuestionPanel.tsx`), /<NoteSection /);
  assert.match(read(`${BT}ProblemPanel.tsx`), /<NoteSection pid=\{problem\.id\} initial=\{progress\?\.note\} onNote=\{onNote\} \/>/);
  // The page is opened on a phone in full, as Brainteasers is.
  assert.match(read('src/lib/mobile-policy.ts'), /'career-ib',/);
});

test('Brainteasers keeps its own words: the shared pieces default to them', () => {
  const list = read(`${BT}ProblemList.tsx`);
  for (const [k, v] of [['solved', 'Solved on my own'], ['needed', 'Needed the solution'], ['notDone', 'Not done yet'], ['flagged', 'Flagged as hard'], ['typeLabel', 'Type'], ['firmLabel', 'Firm']]) {
    assert.match(list, new RegExp(`\\n  ${k}: '${v}',`), k);
  }
  assert.match(list, /const Needed = vocab\.neededIcon \?\? LifeBuoy;/);
  assert.match(list, /vocab = BRAINTEASER_VOCAB/);
  const prog = read(`${BT}ProgressView.tsx`);
  assert.match(prog, /helpPage: 'career-brainteasers',\n  done: 'Done',\n  notDone: 'Not done yet',/);
  assert.match(prog, /vocab = BRAINTEASER_PROGRESS_VOCAB/);
  // Brainteasers itself passes no words of its own, so it reads exactly as before.
  const bt = read(`${BT}Brainteasers.tsx`);
  assert.doesNotMatch(bt, /vocab=/);
  assert.match(read(`${BT}GreenbookView.tsx`), /BookView/);
});

test('the function checks the session itself, as Brainteasers\' does', () => {
  const config = read('supabase/config.toml');
  assert.match(config, /\[functions\.career-brainteasers\]\s+verify_jwt = false/);
  assert.match(config, /\[functions\.career-ib\]\s+verify_jwt = false/);
  assert.match(read(`${FN}index.ts`), /Deno\.serve\(audited\('career-ib', /);
});

test('the activity registry places the function and names its writes', () => {
  const reg = read('supabase/functions/_shared/activity-registry.ts');
  assert.match(reg, /'career-ib': \{[^}]*'Career'[^}]*'IB Questions'/);
  assert.match(reg, /'career-ib': \['list', 'full', 'guide-register', 'guide-upload-url'\]/);
  for (const [a, kind] of [['answer', 'update'], ['progress', 'update'], ['reset', 'update'], ['guide-download', 'download'], ['guide-commit', 'upload'], ['guide-remove', 'delete']]) {
    assert.match(reg, new RegExp(`'career-ib:${a}': '${kind}',`), a);
  }
});

test('the migration only adds, and keeps everything from the browser', () => {
  const sql = read(MIGRATION);
  assert.doesNotMatch(sql, /\bdrop\s+table\b|\btruncate\b|\bdelete\s+from\b/i);
  for (const t of ['ib_questions', 'ib_question_progress', 'career_book_downloads']) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${t}\\b`, 'i'), t);
    assert.match(sql, new RegExp(`alter table public\\.${t} enable row level security`, 'i'), t);
    assert.match(sql, new RegExp(`revoke all on public\\.${t} from public, anon, authenticated`, 'i'), t);
  }
  assert.doesNotMatch(sql, /create policy/i);
  assert.match(sql, /'ib_redbook'/);
  assert.match(sql, /'ib_blueprint'/);
});

test('every help dot of the page opens a topic that exists', () => {
  const guide = read('src/lib/workspace-guide.ts');
  const entry = guide.slice(guide.indexOf("key: 'career-ib'"), guide.indexOf("key: 'reports-upload'"));
  const topics = new Set([...entry.matchAll(/\{ id: '([a-z-]+)'/g)].map((m) => m[1]));
  const used = new Set();
  for (const f of readdirSync(join(ROOT, IB))) {
    const src = read(`${IB}${f}`);
    for (const m of src.matchAll(/page="career-ib" topic="([a-z-]+)"/g)) used.add(m[1]);
    for (const m of src.matchAll(/page: 'career-ib', topic: '([a-z-]+)'/g)) used.add(m[1]);
  }
  // The shared list and progress open the same two topics on either page.
  used.add('filters'); used.add('progress');
  assert.ok(used.size >= 5);
  for (const t of used) assert.ok(topics.has(t), `missing topic ${t}`);
});

test('the answers are shuffled, the same way for a question while the page is open', async () => {
  const { shuffledOrder } = await load(`${IB}ib-model.ts`, 'ib-model');
  const firsts = new Set();
  for (let i = 0; i < 40; i += 1) {
    const o = shuffledOrder(`IB-${i}`, 'visit');
    assert.deepEqual([...o].sort(), [0, 1, 2, 3]);
    assert.deepEqual(shuffledOrder(`IB-${i}`, 'visit'), o);
    firsts.add(o[0]);
  }
  assert.equal(firsts.size, 4, 'every answer is sometimes shown first');
});

test('nothing added carries an em dash', () => {
  const files = [
    `${FN}index.ts`, 'supabase/functions/_shared/career-book.ts', MIGRATION, 'src/lib/ib-questions-api.ts',
    'src/components/admin/career/BookView.tsx', `${BT}NoteSection.tsx`, `${BT}ProblemList.tsx`, `${BT}ProgressView.tsx`,
    ...readdirSync(join(ROOT, IB)).map((f) => `${IB}${f}`),
  ];
  for (const f of files) assert.doesNotMatch(read(f), /\u2014/, f);
});
