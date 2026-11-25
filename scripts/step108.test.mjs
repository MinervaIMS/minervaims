// =====================================================================
// STEP 108: THE FIXES AND THE NEW PIECES, HELD IN PLACE.
// ---------------------------------------------------------------------
//   node --test scripts/step108.test.mjs
//   MIMS_PG=<psql connection string> node --test scripts/step108.test.mjs
//
// The fee collection's semester, one name per role, one person per
// record, the short links, the drawdowns, the applicant's devices, the
// pre-filled fields, the workspace header and the Time Machine's
// machine. With a Postgres at hand, the role names and the name keys are
// also run through the database's own functions.
// =====================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/**
 * A migration by its name, wherever the project keeps it: as delivered
 * (supabase/migrations/<time>_<name>.sql) or as Lovable applies it
 * (drizzle/migrations/<nnnn>_<step>_<name>.sql, since Step 108).
 */
const migrationPath = (name) => {
  for (const dir of ['supabase/migrations', 'drizzle/migrations']) {
    let files = [];
    try { files = readdirSync(join(ROOT, dir)); } catch { continue; }
    const f = files.find((x) => x.endsWith(`_${name}.sql`));
    if (f) return `${dir}/${f}`;
  }
  throw new Error(`migration ${name} not found`);
};
const require = createRequire(import.meta.url);
const load = async (rel, name) => {
  const { build } = require('esbuild');
  const outDir = join(ROOT, 'node_modules', '.cache', 'step108-test');
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, `${name}.mjs`);
  await build({ entryPoints: [join(ROOT, rel)], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'silent', alias: { '@': join(ROOT, 'src') } });
  return import(`${pathToFileURL(out).href}?${Date.now()}`);
};
const PG = process.env.MIMS_PG;
const sql = (q) => execFileSync('psql', [PG, '-At', '-c', q], { encoding: 'utf8' }).trim();

const FEES = await load('src/lib/fee-semester.ts', 'fee-semester');
const ROSTERS = await load('src/lib/rosters.ts', 'rosters');
const SHORT = await load('src/lib/short-links.ts', 'short-links');
const MATCH = await load('supabase/functions/_shared/member-match.ts', 'member-match');

test('a fee collection is named after its semester, and closes into that semester', () => {
  assert.deepEqual(FEES.feeSemesterFromLabel('Fall 2026'), { key: '2026-fall', label: 'Fall 2026' });
  assert.deepEqual(FEES.feeSemesterFromLabel(' Spring 2027 '), { key: '2027-spring', label: 'Spring 2027' });
  for (const bad of ['Autumn 2026', 'fall 2026', 'Fall 26', 'Sep-Jan 2026', '']) assert.equal(FEES.feeSemesterFromLabel(bad), null, bad);
  // The choices: this semester, the next, the one just ended.
  assert.deepEqual(FEES.feeSemesterChoices(new Date(2026, 10, 24)).map((s) => s.label), ['Fall 2026', 'Spring 2027', 'Spring 2026']);
  assert.deepEqual(FEES.feeSemesterChoices(new Date(2027, 0, 20)).map((s) => s.label), ['Fall 2026', 'Spring 2027', 'Spring 2026'], 'January is still Fall');
  assert.deepEqual(FEES.feeSemesterChoices(new Date(2027, 2, 1)).map((s) => s.label), ['Spring 2027', 'Fall 2027', 'Fall 2026']);
  // A Spring collection closed late, in September, is still Spring's.
  assert.equal(FEES.registerSemesterFor('Spring 2026', new Date(2026, 8, 15)).key, '2026-spring');
  assert.equal(FEES.registerSemesterFor('Sep-Jan 2025', new Date(2025, 10, 1)).key, '2025-fall', 'an older label: the day, as before');
  assert.equal(read('src/lib/fee-semester.ts'), read('supabase/functions/_shared/fee-semester.ts'), 'the functions keep the same copy');
  const fn = read('supabase/functions/admin-fees/index.ts');
  assert.match(fn, /if \(!feeSemesterFromLabel\(label\)\) \{/, 'the server refuses any other name');
  assert.match(fn, /registerSemesterFor\(period\.semester_label, now\)/);
  assert.doesNotMatch(fn, /const isFall = m >= 9/, 'no semester from the closing day');
  const page = read('src/components/admin/MembershipFee.tsx');
  assert.match(page, /feeSemesterChoices\(\)/);
  assert.doesNotMatch(page, /Autumn/);
  assert.doesNotMatch(read('src/components/admin/ApplicationSettings.tsx'), /Autumn/);
});

test('the Autumn 2026 collection is removed with a backup, and no email', () => {
  const m = read(migrationPath('remove_autumn_2026_collection'));
  assert.match(m, /CREATE TABLE IF NOT EXISTS public\.data_backup/);
  assert.match(m, /lower\(regexp_replace\(btrim\(semester_label\), '\\s\+', ' ', 'g'\)\) = 'autumn 2026'/);
  assert.match(m, /IF v_count > 1 THEN/, 'never guesses between two');
  for (const t of ['fee_periods', 'membership_fees', 'semester_members', 'semester_snapshots', 'roster_entries', 'treasury_entries']) {
    assert.match(m, new RegExp(`SELECT '${t}', `), `${t} is copied before anything is deleted`);
  }
  const body = m.slice(m.indexOf('DO $step108_autumn$'));
  assert.ok(body.indexOf("INSERT INTO public.data_backup") < body.indexOf('DELETE FROM'), 'backups first');
  assert.doesNotMatch(m, /INSERT INTO public\.membership_fees|UPDATE public\.membership_fees/, 'nothing that could queue a fee email');
  for (const d of ['DELETE FROM public.semester_members   WHERE fee_period_id = v_id', 'DELETE FROM public.semester_snapshots WHERE fee_period_id = v_id', 'DELETE FROM public.fee_periods        WHERE id = v_id']) {
    assert.ok(m.includes(d), `limited to the one collection: ${d}`);
  }
  assert.match(m, /AND t\.source = 'membership_fees'/, 'only its own automatic Treasury entry');
});

test('a role has one name in every semester, in the code and in the database', () => {
  const cases = [
    ['Portfolio Analyst', 'Portfolio Management Analyst'],
    ['Senior Portfolio Analyst', 'Portfolio Management Senior Analyst'],
    ['Senior Equity Research Analyst', 'Equity Research Senior Analyst'],
    ['Equity Research Group Leader', 'Equity Research Team Leader'],
    ['Macro Research Group Leader', 'Macro Research Team Leader'],
    ['Portfolio Management Analyst', 'Portfolio Management Analyst'],
    ['Equities Strategist - Lead', 'Equities Strategist - Lead'],
    ['Markets & Alternatives Research Analyst', 'Markets & Alternatives Research Analyst'],
    ['Head of Portfolio Management', 'Head of Portfolio Management'],
    ['Member (role not stated)', 'Member (role not stated)'],
  ];
  for (const [from, to] of cases) assert.equal(ROSTERS.canonicalRoleLabel(from), to, from);
  assert.equal(read('src/lib/rosters.ts'), read('supabase/functions/_shared/rosters.ts'));
  assert.match(read('supabase/functions/admin-rosters/index.ts'), /const role = canonicalRoleLabel\(/, 'a correction is saved in the one name');
  const m = read(migrationPath('canonical_role_names'));
  assert.match(m, /CREATE TRIGGER roster_entries_canonical_role\s+BEFORE INSERT OR UPDATE OF role_label ON public\.roster_entries/);
  assert.ok(m.indexOf("'step108_role_names', to_jsonb(e)") < m.indexOf('UPDATE public.roster_entries\n     SET role_label'), 'copied before renamed');
  if (PG) {
    const fn = m.slice(m.indexOf('CREATE OR REPLACE FUNCTION public.roster_canonical_role'), m.indexOf('REVOKE ALL ON FUNCTION public.roster_canonical_role'));
    const q = `BEGIN; ${fn.replace('public.roster_canonical_role', 'pg_temp.rcr')}; SELECT string_agg(pg_temp.rcr(x), '|' ORDER BY o) FROM unnest(ARRAY[${cases.map(([f]) => `'${f.replace(/'/g, "''")}'`).join(',')}]) WITH ORDINALITY AS t(x, o); ROLLBACK;`;
    const out = execFileSync('psql', [PG, '-At', '-c', q], { encoding: 'utf8' }).split('\n').find((l) => l.includes('|'));
    assert.equal(out, cases.map(([, to]) => to).join('|'), 'the database names them the same way');
  }
});

test('one person, one record: names fold, joins are backed up, near matches are asked', () => {
  // The attendance key: letters with no accent to drop are written plainly.
  assert.equal(MATCH.normaliseName('Rezan Bağcıoğlu'), 'bagcioglu rezan');
  assert.equal(MATCH.normaliseName('Łukasz Øster (Guest)'), 'lukasz oster');
  assert.equal(MATCH.normaliseName('Marco Caccia'), MATCH.normaliseName('caccia marco (Unverified)'));
  const m = read(migrationPath('people_one_person'));
  assert.match(m, /normalize\(lower\(translate\(/, 'every accent the old list missed is taken off');
  assert.match(m, /'step108_name_keys', to_jsonb\(p\)/, 'keys are copied before they change');
  assert.match(m, /CREATE OR REPLACE FUNCTION public\.people_join\(p_keep uuid, p_merge uuid, p_reason text/);
  assert.match(m, /INSERT INTO public\.people_merge_log/);
  assert.match(m, /HAVING count\(\*\) = 2/, 'only a name exactly two people carry');
  assert.match(m, /NOT \(a\.types && b\.types\)/, 'never two members or two alumni');
  assert.match(m, /REVOKE ALL ON FUNCTION public\.people_join\(uuid, uuid, text, text, text\) FROM PUBLIC, anon, authenticated;/);
  const rosters = read('supabase/functions/admin-rosters/index.ts');
  assert.match(rosters, /'match-proposals', 'match-decide'/);
  assert.ok(rosters.indexOf("if (!canEdit) return json") < rosters.indexOf("action === 'match-decide'"), 'only the President and the Vice-President answer');
  assert.match(rosters, /This pair has already been answered/, 'only a pair the list offers');
  const reg = read('supabase/functions/admin-event-reg/index.ts');
  for (const a of ["action === 'guest-candidates'", "action === 'link-person'"]) assert.ok(reg.includes(a), a);
  assert.match(reg, /const person = personId \? await confirmCandidate\(fullName, personId\) : null;/, 'a guest is linked only to a person the name still leads to');
  const registry = read('supabase/functions/_shared/activity-registry.ts');
  assert.match(registry, /'admin-event-reg:link-person': 'update'/);
  assert.match(registry, /'admin-rosters:match-decide': 'update'/);
  if (PG) {
    const fn = m.slice(m.indexOf('CREATE OR REPLACE FUNCTION public.person_name_key(p_first text, p_surname text)'), m.indexOf('-- The attendance key'));
    const q = `BEGIN; ${fn.replace('public.person_name_key', 'pg_temp.pnk')} SELECT pg_temp.pnk('Rezan', 'Bağcıoğlu') || '|' || pg_temp.pnk('Rezan', 'Bagcioglu') || '|' || pg_temp.pnk('Niccolò', 'Bragaglia') || '|' || pg_temp.pnk('Pāvels', 'Karcevs'); ROLLBACK;`;
    const out = execFileSync('psql', [PG, '-At', '-c', q], { encoding: 'utf8' }).split('\n').find((l) => l.includes('|'));
    assert.equal(out, 'rezan bagcioglu|rezan bagcioglu|niccolo bragaglia|pavels karcevs');
  }
});

test('short links lead where the long links lead, and nowhere else', () => {
  assert.equal(SHORT.readShortCode(' k7f2qx '), 'K7F2QX');
  for (const bad of ['K7F2Q', 'K7F2QX1', 'K7F2Q0', 'ILO123', '../etc']) assert.equal(SHORT.readShortCode(bad), null, bad);
  assert.ok(SHORT.isShortTarget('e', '/events/11111111-2222-3333-4444-555555555555/register'));
  assert.ok(SHORT.isShortTarget('f', '/forms/11111111-2222-3333-4444-555555555555'));
  for (const bad of ['https://evil.example/x', '//evil.example', '/workspace', '/forms/x']) assert.ok(!SHORT.isShortTarget('e', bad) && !SHORT.isShortTarget('f', bad), bad);
  const m = read(migrationPath('short_links'));
  assert.match(m, /AND \(e\.registration_enabled OR e\.show_on_website\)/);
  assert.match(m, /AND f\.status <> 'draft'/);
  assert.match(m, /GRANT EXECUTE ON FUNCTION public\.short_link_target\(text, text\) TO anon, authenticated, service_role;/);
  assert.match(m, /DISABLE TRIGGER update_events_updated_at/, 'the backfill does not make every event look edited');
  const app = read('src/App.tsx');
  assert.match(app, /<Route path="\/e\/:code" element=\{<Suspense fallback=\{<PageLoader \/>\}><ShortLink kind="e" \/>/);
  assert.match(app, /<Route path="\/f\/:code" element=\{<Suspense fallback=\{<PageLoader \/>\}><ShortLink kind="f" \/>/);
  assert.match(read('src/pages/ShortLink.tsx'), /if \(!error && isShortTarget\(kind, data\)\) navigate\(data, \{ replace: true \}\);/);
  assert.match(read('src/components/admin/EventForms.tsx'), /const url = eventShareLink\(ev\);/);
  assert.match(read('src/components/admin/forms/InternalForms.tsx'), /navigator\.clipboard\.writeText\(formShareLink\(f\)\)/);
});

test('the drawdowns are the database\'s, drawn only when asked for', () => {
  const chart = read('src/components/shared/FundPerformanceChart.tsx');
  assert.match(chart, /fetchFundRecords\(\)/);
  assert.match(chart, /if \(!showDd \|\| records\) return;/, 'read only once the switch is pressed');
  assert.match(chart, /aria-pressed=\{showDd\}/);
  assert.match(chart, /record\.drawdowns \?\? \[\]/);
  assert.doesNotMatch(chart, /peak\s*=|Math\.max\(peak/, 'no drawdown worked out in the browser');
  const m = read(migrationPath('fund_drawdowns'));
  assert.match(m, /'drawdowns', v_eps,/);
  assert.match(m, /'drawdown', round\(100 \* u\.d, 6\)/);
  const css = read('src/index.css');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s+\.fund-dd-in, \.fund-dd-band \{ animation: none; \}/);
});

test('the applicant\'s workspace is shown in real devices, safely', () => {
  const frame = read('src/pages/ApplicantFrame.tsx');
  assert.match(frame, /const allowed = !!user && canView\('applications-preview'\);/);
  assert.match(frame, /startApplicantPreview\(readStage/, 'the sample, before anything is drawn');
  assert.match(frame, /if \(e\.origin !== window\.location\.origin \|\| e\.source !== window\.parent\) return;/);
  assert.match(frame, /window\.parent\.postMessage\(\{ type: PREVIEW_PAGE_MESSAGE, page, stage \}, window\.location\.origin\)/);
  const page = read('src/components/admin/recruiting/ApplicantPreview.tsx');
  assert.match(page, /e\.origin !== window\.location\.origin \|\| e\.source !== frameRef\.current\?\.contentWindow/);
  assert.match(page, /postMessage\(\{ type: PREVIEW_MESSAGE, \.\.\.m \}, window\.location\.origin\)/);
  assert.match(read('src/App.tsx'), /<Route path="\/workspace\/applicant-preview-frame" element=/);
  const devices = read('src/lib/applicant-frame.ts');
  for (const d of ['laptop', 'tablet-landscape', 'tablet-portrait', 'phone']) {
    assert.match(devices, new RegExp(`key: '${d}'`));
    assert.ok(existsSync(join(ROOT, `src/assets/devices/${d}.webp`)), `${d} frame`);
  }
  const stage = read('src/components/admin/recruiting/DeviceStage.tsx');
  assert.match(stage, /className="ap-frame pointer-events-none absolute inset-0 h-full w-full select-none"/, 'the frame on top never takes a click');
  // Inside the workspace's 90% zoom a transformed frame is painted unscaled
  // once the page scrolls: the page in the device is scaled with zoom.
  assert.match(stage, /const \[useZoom\] = useState\(\(\) => zoomMeasuresAsDrawn\(\)\);/);
  assert.match(stage, /\? \{ width: spec\.viewport\.width, height: spec\.viewport\.height, zoom: scale \}/);
  assert.match(stage, /if \(w > 0\) setScale\(Math\.min\(1, w \/ spec\.viewport\.width\)\);/, 'never drawn larger than the screen');
  assert.match(stage, /const \[src\] = useState\(\(\) => `\$\{PREVIEW_FRAME_PATH\}\?\$\{new URLSearchParams\(start\)\.toString\(\)\}`\);/, 'starts at the stage shown, never reloaded by a stage');
  // The handshake: a page just loaded never pulls the preview back.
  assert.match(frame, /if \(!ready \|\| !synced\.current \|\| window\.parent === window\) return;/);
  assert.match(page, /if \(m\?\.type === PREVIEW_READY_MESSAGE\) \{ post\(now\.current\); return; \}/);
  assert.match(page, /<Dialog open=\{big\} onOpenChange=\{setBig\}>/, 'Full size');
  assert.match(read('src/index.css'), /\.ap-node-active, \.ap-toast, \.ap-new, \.ap-page-in \{ animation: none; \}/);
});

test('fields filled from the records say so, and the header names the reader', () => {
  const kit = read('src/components/admin/kit/Prefilled.tsx');
  assert.match(kit, /export const PREFILLED_LABEL = 'From the records';/);
  assert.match(read('src/components/admin/events/AlumniCallFields.tsx'), /fill\('position', r\.job_area\);/);
  const authors = read('src/components/admin/archive/AuthorsEditor.tsx');
  assert.match(authors, /const fromRecords = typed \? '' : \(p\.role \?\? ''\)\.trim\(\);/, 'a role typed first wins');
  assert.match(authors, /filled\.release\(keyOf\(a\.name\)\)/, 'the mark goes once changed');
  const ident = read('src/components/admin/WorkspaceIdentity.tsx');
  assert.match(ident, /if \(reduced\) \{ setOverflow\(false\); return; \}/, 'no movement under reduced motion');
  assert.match(ident, /aria-hidden="true" className="whitespace-nowrap"/, 'the loop\'s second copy is not read twice');
  const ws = read('src/pages/MinervaWorkspace.tsx');
  assert.match(ws, /<WorkspaceIdentity name=\{identityName\} roleLabel=\{roleLabel\}/);
  const profile = read('src/components/admin/MyProfile.tsx');
  assert.match(profile, /\{current === 'my-role' \? \(\s+<h1 className="sr-only">My Profile: \{PROFILE_PAGE_LABEL\['my-role'\]\}<\/h1>/, 'Personal Information keeps its heading without the band');
  const tm = read('src/components/admin/TimeMachineConsole.tsx');
  assert.match(tm, /if \(reducedMotion\(\)\) \{ arrive\(target\); return; \}/);
  assert.match(tm, /Skip/);
});

test('nothing added carries an em dash', () => {
  const files = [
    'src/lib/fee-semester.ts', 'supabase/functions/_shared/fee-semester.ts', 'src/lib/short-links.ts', 'src/lib/applicant-frame.ts',
    'src/pages/ShortLink.tsx', 'src/pages/ApplicantFrame.tsx', 'src/components/admin/recruiting/DeviceStage.tsx',
    'src/components/admin/recruiting/ApplicantPreview.tsx', 'src/components/admin/TimeMachineConsole.tsx', 'src/components/admin/TimeMachine.tsx',
    'src/components/admin/PeopleMatches.tsx', 'src/components/admin/attendance/SamePerson.tsx', 'src/components/admin/kit/Prefilled.tsx',
    'src/components/admin/WorkspaceIdentity.tsx', 'src/components/shared/FundPerformanceChart.tsx', 'src/components/admin/EventAttendance.tsx',
    'src/components/admin/attendance/TeamsImportDialog.tsx', 'src/components/admin/events/AlumniCallFields.tsx', 'src/components/admin/archive/AuthorsEditor.tsx',
    'src/lib/workspace-guide.ts', 'src/lib/workspace-manual.ts', 'src/components/admin/HowToUse.tsx', 'src/lib/AGENTS.md', 'supabase/AGENTS.md',
    migrationPath('remove_autumn_2026_collection'), migrationPath('canonical_role_names'),
    migrationPath('people_one_person'), migrationPath('short_links'), migrationPath('fund_drawdowns'),
    'scripts/step108.test.mjs',
  ];
  for (const f of files) assert.ok(!read(f).includes('\u2014'), `${f}: no em dash`);
});
