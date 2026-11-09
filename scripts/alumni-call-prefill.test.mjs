// =====================================================================
// AN ALUMNUS ON AN ALUMNI CALL, FILLED IN FROM THE RECORDS (Step 105).
// ---------------------------------------------------------------------
// Picking an alumnus from the directory fills in the company on file and
// the role and division they held at Minerva; every field stays editable;
// a (?) says where the records are corrected; the status, the responsible
// person and the internal notes are no longer asked for, and a saved call
// keeps the values it has. This test fails if any of that comes undone,
// or if the database's list of planners and the access matrix disagree.
//
//   node --test scripts/alumni-call-prefill.test.mjs
// =====================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const require = createRequire(import.meta.url);
const { buildSync } = require(join(ROOT, 'node_modules', 'esbuild'));
const CACHE = join(ROOT, 'node_modules', '.cache', 'alumni-call-prefill-test');
mkdirSync(CACHE, { recursive: true });
const load = async (p, name) => {
  const out = join(CACHE, `${name}.mjs`);
  buildSync({
    entryPoints: [join(ROOT, p)], bundle: true, outfile: out, format: 'esm', platform: 'node',
    alias: { '@': join(ROOT, 'src') }, packages: 'external', jsx: 'automatic',
    define: { 'import.meta.env': JSON.stringify({ DEV: false, VITE_SUPABASE_URL: 'http://localhost:54321', VITE_SUPABASE_PUBLISHABLE_KEY: 'test', VITE_SUPABASE_PROJECT_ID: 'test' }) },
    logLevel: 'silent',
  });
  return import(`${pathToFileURL(out).href}?${Date.now()}`);
};

const MIGRATION = 'supabase/migrations/20261109090200_alumni_call_prefill.sql';
const LEGACY = { head_of_division: ['head_of_equity', 'head_of_investment', 'head_of_macro', 'head_of_portfolio', 'head_of_quant'], advisor: ['silent_advisor'] };

test('the database answers exactly the roles that open Create Event or manage alumni calls', async () => {
  const { DEFAULT_MATRIX, resolveLevel, atLeast } = await load('src/lib/access/matrix.ts', 'matrix');
  // As workspace-nav.ts opens Create Event: p.can('events-create') || p.can('events-alumni-calls', 'manage').
  const planners = Object.keys(DEFAULT_MATRIX).filter((r) =>
    resolveLevel([r], 'events-create') !== 'none' || atLeast(resolveLevel([r], 'events-alumni-calls'), 'manage'));
  const expected = new Set(planners.flatMap((r) => [r, ...(LEGACY[r] ?? [])]));
  const sql = read(MIGRATION);
  const fn = sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.plans_alumni_calls'), sql.indexOf('REVOKE EXECUTE ON FUNCTION public.plans_alumni_calls'));
  const listed = new Set([...fn.slice(fn.indexOf('IN (')).matchAll(/'([a-z_]+)'/g)].map((m) => m[1]));
  assert.deepEqual([...listed].sort(), [...expected].sort());
  assert.match(read('src/lib/workspace-nav.ts'), /key: 'events-create', slug: 'create', label: 'Create Event', allowed: \(p\) => p\.can\('events-create'\) \|\| p\.can\('events-alumni-calls', 'manage'\)/);
});

test('the prefill reads one role and one division per alumnus, for planners only, and writes nothing', () => {
  const sql = read(MIGRATION);
  assert.match(sql, /RETURNS TABLE \(alumni_id uuid, company text, job_area text, role_label text, division_key text\)/);
  assert.match(sql, /AND public\.plans_alumni_calls\(auth\.uid\(\)\);/);
  assert.match(sql, /cardinality\(coalesce\(p_alumni_ids, ARRAY\[\]::uuid\[\]\)\) <= 10/);
  assert.match(sql, /ORDER BY public\.roster_office_rank\(e\.role_label\) NULLS LAST,\s*public\.semester_ordinal\(e\.semester_key\) DESC/);
  assert.match(sql, /e\.role_label !~\* '\^\(member \\\(\|on semester break\)'/);
  assert.doesNotMatch(sql.replace(/--.*$/gm, ''), /\bcode\b/i, 'the person code is never read');
  assert.match(sql, /REVOKE EXECUTE ON FUNCTION public\.alumni_call_prefill\(uuid\[\]\) FROM anon;/);
  assert.doesNotMatch(sql, /\b(INSERT INTO|UPDATE public\.|DELETE FROM|TRUNCATE)\b/);
});

test('a roster role reads as the form writes it', async () => {
  const { formerFromRoster, describeAlumnus } = await load('src/lib/alumni-call.ts', 'alumni-call');
  assert.deepEqual(formerFromRoster('Equity Research Analyst', 'equity'), { former_role: 'Analyst', former_division: 'equity' });
  assert.deepEqual(formerFromRoster('Head of Macro Research', 'macro'), { former_role: 'Head of Division', former_division: 'macro' });
  assert.deepEqual(formerFromRoster('Co-Head of Equity Research', 'equity'), { former_role: 'Co-Head of Division', former_division: 'equity' });
  assert.deepEqual(formerFromRoster('Portfolio Manager', 'portfolio'), { former_role: 'Portfolio Manager', former_division: 'portfolio' });
  assert.deepEqual(formerFromRoster('Head of Media & Communication', 'media'), { former_role: 'Head of Division', former_division: 'media' });
  assert.deepEqual(formerFromRoster('Vice President', 'board'), { former_role: 'Vice President', former_division: null });
  assert.deepEqual(formerFromRoster('Head of Asset Management', 'asset_management'), { former_role: 'Head of Asset Management', former_division: null });
  assert.deepEqual(formerFromRoster('Risk Analyst', 'risk'), { former_role: 'Risk Analyst', former_division: null });
  assert.deepEqual(formerFromRoster(null, null), { former_role: '', former_division: null });
  const w = formerFromRoster('Equity Research Analyst', 'equity');
  assert.equal(describeAlumnus({ name: 'A', position: 'Associate', company: 'UBS', ...w }), 'Associate at UBS, former Analyst in Equity Research');
  assert.equal(describeAlumnus({ name: 'A', company: 'UBS', ...formerFromRoster('President', 'board') }), 'UBS, former President');
  // The functions keep the same copy of the module.
  assert.equal(read('src/lib/alumni-call.ts'), read('supabase/functions/_shared/alumni-call.ts'));
});

test('the form fills in, stays editable, explains corrections and no longer asks for status, owner or notes', () => {
  const src = read('src/components/admin/events/AlumniCallFields.tsx');
  assert.doesNotMatch(src, /readOnly=\{!!p\.alumni_id\}/, 'the name can be changed');
  assert.match(src, /alumniCallPrefill\(\[a\.id\]\)\.then/);
  assert.match(src, /company: \(p\.company \?\? ''\)\.trim\(\) \? p\.company :/, 'never over what was typed');
  assert.match(src, /former_role: \(p\.former_role \?\? ''\)\.trim\(\) \? p\.former_role : was\.former_role,/);
  assert.match(src, /<HelpDot page="events-create" topic="alumni-fix" \/>/);
  for (const gone of [/Responsible person/, /Internal notes/, /ALUMNI_CALL_STATUSES/, /topic="alumni-status"/, /<Textarea/]) assert.doesNotMatch(src, gone);
  const guide = read('src/lib/workspace-guide.ts');
  assert.match(guide, /id: 'alumni-fix', title: 'When the records are wrong'/);
  assert.match(guide, /People, Alumni, which the President and the admin account edit/);
  assert.match(guide, /People, Time Machine, which only the President and the Vice President correct/);
  assert.doesNotMatch(guide, /id: 'alumni-status'/);
  // A saved call keeps its values: the draft carries them through.
  const draft = read('src/lib/alumni-call-draft.ts');
  assert.match(draft, /status: plan\.status,/);
  assert.match(draft, /responsible_person: trim\(d\.responsible_person\),/);
  assert.match(draft, /notes: trim\(d\.notes\),/);
  assert.doesNotMatch(read('src/components/admin/events/AlumniCallDialog.tsx'), /ALUMNI_CALL_STATUS_LABELS/);
  assert.doesNotMatch(read('src/pages/MinervaWorkspace.tsx'), /ALUMNI_CALL_STATUS_LABELS/);
});

test('company visit selection counts events attended as People > Members does', () => {
  const src = read('src/components/admin/events/CompanyVisitSelection.tsx');
  assert.match(src, /memberEventAttendance\(session, sem\.start, sem\.end\)/);
  assert.match(src, /<MemberEventsDialog target=\{eventsOf\} onClose=\{\(\) => setEventsOf\(null\)\} \/>/);
  assert.match(src, /<span className="text-foreground">\{went\}<\/span>\/\{attendance\.total\}/);
  assert.doesNotMatch(src, /<\/span> this year/);
  const members = read('src/components/admin/MembersManagement.tsx');
  assert.match(members, /memberEventAttendance\(session, sem\.start, sem\.end\)/);
  assert.match(members, /<span className="text-foreground">\{attendance\.counts\[m\.id\] \?\? 0\}<\/span>\/\{attendance\.total\}/);
});
