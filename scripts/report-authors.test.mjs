// =====================================================================
// EVERY REPORT AUTHOR LINKED (Step 105).
// ---------------------------------------------------------------------
// An author links to their Members or Alumni profile when the editor
// picked them or exactly one listed person carries the name, and to the
// archive filtered to their reports otherwise. The archive matches names
// as the database does. Pablo Panizza is added to the alumni once. The
// correction of "Siddanth" waits for the President's confirmation, so it
// is kept out of the migrations.
//
//   node --test scripts/report-authors.test.mjs
// =====================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const MIGRATION = 'supabase/migrations/20261109090300_report_author_links.sql';

const require = createRequire(import.meta.url);
const { buildSync } = require(join(ROOT, 'node_modules', 'esbuild'));
const CACHE = join(ROOT, 'node_modules', '.cache', 'report-authors-test');
mkdirSync(CACHE, { recursive: true });
async function load(path) {
  const out = join(CACHE, 'module.mjs');
  buildSync({ entryPoints: [join(ROOT, path)], bundle: true, outfile: out, format: 'esm', platform: 'node', alias: { '@': join(ROOT, 'src') }, packages: 'external', logLevel: 'silent' });
  return import(`${pathToFileURL(out).href}?${Date.now()}`);
}

test('names match as public.person_tokens and public_reports match them', async () => {
  const { personTokens, sameAuthor, authorArchivePath } = await load('src/lib/reports-public.ts');
  assert.deepEqual(personTokens('Siddhanth Narayana Achanta'), ['achanta', 'narayana', 'siddhanth']);
  assert.deepEqual(personTokens('Jos\u00e9 M\u00fcller-Rossi'), ['jose', 'muller', 'rossi']);
  assert.deepEqual(personTokens('A. B. Smith'), ['smith'], 'single letters are dropped');
  assert.ok(sameAuthor('Siddhanth Narayana Achanta', 'siddhanth narayana achanta'));
  assert.ok(sameAuthor('Siddhanth Achanta', 'Siddhanth Narayana Achanta'), 'a middle name on one cover only');
  assert.ok(!sameAuthor('Siddanth Narayana Achanta', 'Siddhanth Narayana Achanta'), 'a different spelling is a different name');
  assert.ok(!sameAuthor('Smith', 'John Smith'), 'one word never contains another name');
  assert.equal(authorArchivePath(' Berend Dasbach '), '/archive?author=Berend%20Dasbach');
  // The SQL the tokens mirror.
  const sql = readdirSync(join(ROOT, 'supabase/migrations')).filter((f) => f.endsWith('.sql')).map((f) => read(`supabase/migrations/${f}`)).join('\n');
  assert.match(sql, /FUNCTION public\.person_tokens\(p text\)/);
});

test('public_reports links every author, in one pass, with the same output shape', () => {
  const sql = read(MIGRATION);
  assert.match(sql, /'\/archive\?author=' \|\| public\.url_query_value\(a\.name\)\s*\) AS link/);
  assert.match(sql, /WITH people AS MATERIALIZED \(\s*SELECT kind, id::text AS id, tokens FROM public\.public_people_index\(\)/, 'the people are read once');
  assert.doesNotMatch(sql, /resolve_report_authors\(/, 'never once per report (AGENTS.md)');
  assert.match(sql, /jsonb_build_object\('name', name, 'role', role, 'link', link\)/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.public_reports\(text\) TO anon, authenticated;/);
});

test('Pablo Panizza is added once, and nothing existing is changed', () => {
  const sql = read(MIGRATION);
  assert.match(sql, /INSERT INTO public\.alumni \(name, surname, graduation_year, company, city, job_area\)\s*SELECT 'Pablo', 'Panizza', 2027,/);
  assert.match(sql, /WHERE NOT EXISTS \(\s*SELECT 1 FROM public\.alumni a\s*WHERE public\.person_tokens\(/);
  assert.doesNotMatch(sql, /\b(UPDATE public\.|DELETE FROM|TRUNCATE)\b/);
});

test('the confirmed spelling correction: backed up first, only his rows, safe twice, with an undo', () => {
  const p = 'supabase/migrations/20261109090700_siddhanth_spelling.sql';
  assert.ok(existsSync(join(ROOT, p)));
  assert.ok(!existsSync(join(ROOT, 'supabase/manual/step105_siddhanth_spelling.sql')), 'one copy, the migration');
  const sql = read(p);
  assert.match(sql, /confirmed by the President/);
  for (const t of ['team_members', 'members', 'people']) {
    const backup = sql.search(new RegExp(`INSERT INTO public\\.step105_name_fix_backup[\\s\\S]*?FROM public\\.${t}\\b`));
    const update = sql.search(new RegExp(`UPDATE public\\.${t}\\b`));
    assert.ok(backup >= 0 && update > backup, `${t}: backed up before it is changed`);
  }
  const updates = sql.replace(/^--.*$/gm, '').match(/UPDATE public\.\w+[\s\S]*?;/g) || [];
  assert.equal(updates.length, 3, 'three updates, no more');
  for (const u of updates) assert.match(u, /= 'Siddanth' AND surname ILIKE '%Achanta%'/, 'only his rows, so a second run changes nothing');
  assert.match(sql, /ON CONFLICT DO NOTHING/);
  assert.match(sql, /name_key = public\.person_name_key\('Siddhanth', surname\)/);
  assert.match(sql, /-- UNDO \(only if needed\)/);
  assert.doesNotMatch(sql.replace(/^--.*$/gm, ''), /\b(DELETE FROM|TRUNCATE|DROP TABLE)\b/);
});

test('the archive narrows to one author and says so', () => {
  const src = read('src/pages/Archive.tsx');
  assert.match(src, /const authorFilter = \(searchParams\.get\("author"\) \|\| ""\)\.trim\(\);/);
  assert.match(src, /if \(authorFilter && !authorNames\(file\.authors\)\.some\(\(n\) => sameAuthor\(n, authorFilter\)\)\) return false;/);
  assert.match(src, /<span className="text-muted-foreground">Reports by<\/span>/);
  assert.match(src, /\(authorFilter \? 1 : 0\) \+/, 'Clear filters counts it');
});
