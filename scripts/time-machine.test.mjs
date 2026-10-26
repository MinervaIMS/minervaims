// =====================================================================
// time-machine.test.mjs: the Time Machine, the person record and the
// workspace's own map (Step 94B).
// ---------------------------------------------------------------------
//   node --test scripts/time-machine.test.mjs
//
// Pure checks on the sources, no database and no network:
//   * every subsection the workspace menu lists has its screen (Step 96,
//     written on an older copy of MinervaWorkspace.tsx, turned the
//     Rosters page into "under construction" and nothing noticed);
//   * People > Rosters is the Time Machine, everywhere it is named;
//   * a career inside Minerva reads as the President's workbook does:
//     the path, the steps up, the promotions, a semester with no record;
//   * the Step 94B migration reads no secret, copies a duplicate person
//     before joining it, deletes nothing else, and checks every caller;
//   * the Society has no X account, and no email subject names the
//     Society before the " | Minerva IMS" every subject ends with.
// =====================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const require = createRequire(import.meta.url);
const { transformSync } = require(join(ROOT, 'node_modules', 'esbuild'));
const load = async (p) => import('data:text/javascript;base64,'
  + Buffer.from(transformSync(read(p), { loader: 'ts', format: 'esm' }).code).toString('base64'));

const MIGRATION = 'supabase/migrations/20261028090000_time_machine_people_record.sql';
const career = await load('src/lib/career.ts');

test('every subsection in the workspace menu has its screen', () => {
  const nav = read('src/lib/workspace-nav.ts');
  const page = read('src/pages/MinervaWorkspace.tsx');
  const keys = [...nav.matchAll(/\{ key: '([a-z0-9-]+)', slug:/g)].map((m) => m[1]);
  assert.ok(keys.length > 40, `found ${keys.length} subsections`);
  const missing = keys.filter((k) => !page.includes(`case '${k}'`) && !page.includes(`=== '${k}'`));
  assert.deepEqual(missing, [], `no screen for: ${missing.join(', ')}`);
  assert.match(page, /case 'people-rosters':\s*\n\s*return <TimeMachine \/>;/);
});

test('People > Rosters is the Time Machine wherever it is named', () => {
  assert.match(read('src/lib/workspace-nav.ts'), /key: 'people-rosters', slug: 'time-machine', label: 'Time Machine'/);
  assert.match(read('src/lib/workspace-sections.ts'), /\{ key: 'people-rosters', label: 'Time Machine' \}/);
  assert.match(read('src/lib/workspace-guide.ts'), /key: 'people-rosters', section: 'People', label: 'Time Machine'/);
  assert.match(read('src/lib/workspace-manual.ts'), /'people-rosters': \{\s*detail: \[\s*"The Time Machine:/);
  assert.match(read('supabase/functions/_shared/activity-registry.ts'), /'admin-rosters': \{ section: 'People', subsection: 'Time Machine' \}/);
  const reads = read('supabase/functions/_shared/activity-registry.ts');
  for (const fn of ['time_machine', 'person_record', 'people_overview']) assert.ok(reads.includes(`'${fn}'`), `${fn} is a declared read`);
  // The registers moved out of People > Members, into their semester.
  const members = read('src/components/admin/MembersManagement.tsx');
  assert.doesNotMatch(members, /semester_members/);
  assert.match(members, /People, Time Machine/);
});

test('a career inside Minerva: the path, the steps up, the gaps', () => {
  const s = (semester, role, team = null, live = false) => {
    const [y, t] = semester.split('-');
    return { semester, label: `${t === 'fall' ? 'Fall' : 'Spring'} ${y}`, role, team, live };
  };
  // The President's own path, as the alumni workbook records it.
  const president = career.careerSummary([
    s('2024-fall', 'Portfolio Analyst', 'multi-asset'), s('2025-spring', 'Portfolio Analyst', 'dps'),
    s('2025-fall', 'Portfolio Manager', 'multi-asset'), s('2026-spring', 'Head of Asset Management'),
    s('2026-fall', 'President', null, true),
  ]);
  assert.equal(president.since.label, 'Fall 2024');
  assert.equal(president.semesters, 5);
  assert.equal(president.promotions, 3);
  assert.deepEqual(president.growth.map((g) => `${g.role} (${g.label})`),
    ['Portfolio Analyst (Fall 2024)', 'Portfolio Manager (Fall 2025)', 'Head of Asset Management (Spring 2026)', 'President (Fall 2026)']);
  assert.equal(president.highest, 'President');
  // Another fund is another stretch; the same role on, one stretch.
  const analyst = career.careerPath([
    s('2022-fall', 'Equity Research Analyst'), s('2023-spring', 'Equity Research Analyst'),
    s('2024-spring', 'Equity Research Analyst'), s('2024-fall', 'Equity Research Team Leader'),
  ]);
  assert.deepEqual(analyst.map((x) => (x.kind === 'gap' ? `gap ${career.stretchLabel(x)}` : `${career.stretchLabel(x)}: ${x.roles[0].role}`)), [
    'Fall 2022 to Spring 2023: Equity Research Analyst', 'gap Fall 2023',
    'Spring 2024: Equity Research Analyst', 'Fall 2024: Equity Research Team Leader',
  ]);
  // A desk's lead strategist leads it, as a team leader leads a team.
  const desk = career.careerSummary([
    s('2024-fall', 'Fixed Income Strategist'), s('2025-fall', 'Fixed Income Strategist - Lead'),
    s('2026-spring', 'Investment Research Team Leader'), s('2026-fall', 'Head of Investment Research', null, true),
  ]);
  assert.equal(desk.promotions, 2);
  // A placeholder is part of the path, never a step up.
  assert.equal(career.roleTier('Member (role not stated)'), 0);
  assert.equal(career.roleTier('On semester break (exchange)'), 0);
  const order = ['Equity Research Analyst', 'Senior Equity Research Analyst', 'Macro Research Group Leader',
    'Co-Head of Macro Research', 'Head of Macro Research', 'Head of Asset Management', 'Vice President', 'President'];
  order.reduce((prev, role) => { assert.ok(career.roleTier(role) > prev, `${role} ranks above the role before it`); return career.roleTier(role); }, 0);
});

test('the Step 94B migration reads no secret, keeps a copy before joining two people, and deletes nothing else', () => {
  const sql = read(MIGRATION);
  assert.doesNotMatch(sql, /vault|decrypted_secret|service_role_key/i);
  const deletes = [...sql.matchAll(/DELETE FROM ([a-z_.]+)/gi)].map((m) => m[1]);
  assert.deepEqual(deletes.sort(), ['public.people', 'public.roster_entries']);
  const merge = sql.slice(sql.indexOf('FUNCTION public.people_merge_duplicates'), sql.indexOf('DO $merge$'));
  assert.ok(merge.indexOf('INSERT INTO public.people_merge_log') < merge.indexOf('DELETE FROM public.people'), 'the copy comes first');
  assert.match(merge, /NOT EXISTS \(SELECT 1 FROM public\.roster_entries e WHERE e\.person_id = p\.id\)/, 'only a person with no history of their own is joined');
  assert.match(merge, /count\(\*\) FROM pair x WHERE x\.dup_id = p\.dup_id\) = 1/);
  assert.match(merge, /count\(\*\) FROM pair x WHERE x\.into_id = p\.into_id\) = 1/);
  // The register's DELETE only follows a register row the fee collection removed.
  const trigger = sql.slice(sql.indexOf('FUNCTION public.roster_from_register'), sql.indexOf('CREATE TRIGGER roster_from_register'));
  assert.match(trigger, /IF TG_OP = 'DELETE' THEN\s*DELETE FROM public\.roster_entries[\s\S]*?e\.source = 'register';/);
  // Every read checks its caller, and only the readers of every division open a person.
  for (const fn of ['time_machine_for', 'person_record_for', 'people_overview_for']) {
    const body = sql.slice(sql.indexOf(`FUNCTION public.${fn}(`));
    assert.match(body.slice(0, 600), /public\.roster_access\(p_uid\)/, `${fn} asks who is calling`);
    assert.match(sql, new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\([^)]*\\) FROM PUBLIC, anon, authenticated;`), `${fn} is the server's`);
  }
  assert.match(sql, /IF a ->> 'scope' <> 'all' THEN RAISE EXCEPTION 'You cannot open a person''s record\.'/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.person_record\(text, uuid\) FROM PUBLIC, anon;/);
  // A report author counts for one person, or for nobody.
  const authors = sql.slice(sql.indexOf('FUNCTION public.report_authorships'), sql.indexOf('REVOKE ALL ON FUNCTION public.report_authorships'));
  assert.match(authors, /CASE WHEN ex\.n = 1 THEN ex\.person_id END/);
  assert.match(authors, /CASE WHEN ex\.n IS NULL AND nr\.n = 1 THEN nr\.person_id END/);
  assert.match(authors, /f\.status = 'published' AND f\.deleted_at IS NULL/);
});

test('the person code stays inside the workspace', () => {
  for (const p of ['src/components/admin/TimeMachine.tsx']) {
    const src = read(p);
    const csv = src.slice(src.indexOf('const exportCsv'), src.indexOf('const exportPdf'));
    assert.doesNotMatch(csv, /code/, `${p}: the CSV carries no person code`);
  }
  assert.doesNotMatch(read('supabase/functions/admin-rosters/pdf.ts'), /\.code\b/);
});

test('the Society has no X account, and no email subject names the Society twice', () => {
  for (const p of ['index.html', 'src/components/shared/Seo.tsx', 'src/lib/seo/site.ts', 'vite.static-pages.ts']) {
    assert.doesNotMatch(read(p), /twitter:site"? content|name="twitter:site"|TWITTER_HANDLE|@MIMS/, p);
  }
  const emails = read('supabase/functions/_shared/transactional-emails.ts');
  const subjects = [...emails.matchAll(/\bt\(\s*'([a-z_]+)',\s*(['"`])(?:(?!\2).)*\2,\s*(['"`])((?:(?!\3).)*)\3/g)].map((m) => [m[1], m[4]]);
  assert.ok(subjects.length >= 20, `found ${subjects.length} subjects`);
  for (const [key, subject] of subjects) {
    assert.doesNotMatch(subject, /Minerva IMS|MIMS|Minerva Investment/, `${key}: "${subject}" is followed by " | Minerva IMS" already`);
  }
  assert.ok(subjects.some(([key, subject]) => key === 'offer_to_join' && subject === 'Your offer of membership'));
});
