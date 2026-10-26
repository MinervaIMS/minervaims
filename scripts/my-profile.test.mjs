// =====================================================================
// my-profile.test.mjs: My Profile in three pages (Step 97B).
// ---------------------------------------------------------------------
//   node --test scripts/my-profile.test.mjs
//
// Pure checks on the sources, no database and no network:
//   * My Profile has three pages for a member, one for an applicant, and
//     the old address and the commitment emails still lead somewhere;
//   * the two new pages share My Profile's permission exactly, for every
//     role, and grant an applicant nothing;
//   * all three pages work on a phone (Step 98; Step 97B opened only the
//     commitment);
//   * the two database reads answer for the caller alone, are open to a
//     signed-in member and nobody else, and are listed in the registry;
//   * Your projects is read in one pass, by the report pages' own rule,
//     so it answers in time on the live data;
//   * the migration changes an email only where it is still the Step 97
//     copy, deletes nothing, and the emails lead to the Commitment page;
//   * every page has its help, and nothing added carries an em dash.
// =====================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const require = createRequire(import.meta.url);
const { buildSync } = require(join(ROOT, 'node_modules', 'esbuild'));
// Bundled, so the `@/` imports resolve; the icons and React are left to
// node_modules, which is why the bundle is written inside it.
const CACHE = join(ROOT, 'node_modules', '.cache', 'my-profile-test');
mkdirSync(CACHE, { recursive: true });
const load = async (p) => {
  const out = join(CACHE, basename(p).replace(/\.tsx?$/, '.mjs'));
  buildSync({
    entryPoints: [join(ROOT, p)], bundle: true, outfile: out, format: 'esm', platform: 'node',
    alias: { '@': join(ROOT, 'src') }, external: ['lucide-react', 'react'], define: { 'import.meta.env.DEV': 'false' }, logLevel: 'silent',
  });
  return import(`${pathToFileURL(out).href}?${Date.now()}`);
};

const MIGRATION = 'supabase/migrations/20261027090000_my_profile_pages.sql';
const nav = await load('src/lib/workspace-nav.ts');
const matrix = await load('src/lib/access/matrix.ts');
const mobile = await load('src/lib/mobile-policy.ts');

test('a member has three My Profile pages; an applicant keeps one', () => {
  const mine = nav.NAV.find((s) => s.key === 'my-role');
  assert.equal(mine.slug, 'my-profile');
  assert.deepEqual(mine.subItems.map((s) => [s.key, s.slug, s.label]), [
    ['my-role', 'personal-information', 'Personal Information'],
    ['my-membership', 'membership', 'Membership'],
    ['my-commitment', 'commitment', 'Commitment'],
  ]);
  assert.ok(mine.subItems.every((s) => !s.allowed), 'no extra permission predicate: the section decides');
  assert.deepEqual(nav.CANDIDATE_NAV.find((s) => s.key === 'my-role').subItems, [], "the applicant's profile is one page");
});

test('the old address opens Personal Information, and the new ones resolve', () => {
  const full = nav.filterNav({ can: () => false });
  const mine = full.find((s) => s.key === 'my-role');
  assert.ok(mine, 'My Profile is always in the navigation');
  assert.deepEqual(nav.resolveWorkspaceTarget(full, 'my-profile', null), { status: 'ok', sectionKey: 'my-role', subKey: 'my-role' });
  assert.deepEqual(nav.resolveWorkspaceTarget(full, 'my-profile', 'commitment'), { status: 'ok', sectionKey: 'my-role', subKey: 'my-commitment' });
  assert.equal(nav.workspacePath('my-role', 'my-membership'), '/workspace/my-profile/membership');
  assert.equal(nav.workspacePath('my-role', null), '/workspace/my-profile');
  const cand = nav.candidateNav({ invited: false, offered: false });
  assert.equal(nav.resolveWorkspaceTarget(cand, 'my-profile', null).status, 'ok');
  assert.equal(nav.resolveWorkspaceTarget(cand, 'my-profile', 'commitment').status, 'forbidden', 'an applicant cannot open a member page');
  // The workspace redirects the email's `?commitment=1`, and an applicant on a member's page.
  const ws = read('src/pages/MinervaWorkspace.tsx');
  assert.match(ws, /workspacePath\('my-role', 'my-commitment'\)\}\?commitment=1/);
  assert.match(ws, /if \(isCandidate\) \{\s*if \(subSlug\) navigate\(workspacePath\('my-role', null\)/);
});

test('Membership and Commitment open exactly where My Profile opens, for every role', () => {
  assert.deepEqual(matrix.SHARED_RESOURCES, { 'my-membership': 'my-role', 'my-commitment': 'my-role' });
  const roles = ['admin', 'president', 'vice_president', 'head_of_asset_management', 'head_of_division', 'portfolio_manager', 'team_leader',
    'senior_analyst', 'analyst', 'head_of_media', 'media_analyst', 'operations_analyst', 'head_of_operations', 'advisor', 'alumni', 'member', 'pending', 'candidate'];
  for (const r of roles) {
    const base = matrix.resolveLevel([r], 'my-role');
    for (const k of ['my-membership', 'my-commitment']) assert.equal(matrix.resolveLevel([r], k), base, `${r}: ${k}`);
  }
  for (const k of ['my-membership', 'my-commitment']) assert.equal(matrix.CANDIDATE_RESOURCES[k], undefined, `an applicant has no ${k}`);
  // The tables in Settings list the three pages.
  const sections = read('src/lib/workspace-sections.ts');
  for (const k of ['my-role', 'my-membership', 'my-commitment']) assert.match(sections, new RegExp(`key: '${k}'`));
});

// Step 97B opened only the commitment on a phone; Step 98 opened the rest
// of My Profile, the member's own details and certificate.
test('on a phone all three pages of My Profile work in full', () => {
  for (const k of ['my-role', 'my-membership', 'my-commitment']) assert.equal(mobile.mobilePolicyFor(k), 'full', k);
});

test('the two reads answer for the caller alone', () => {
  const sql = read(MIGRATION);
  for (const fn of ['my_roster_history', 'my_report_projects']) {
    assert.match(sql, new RegExp(`CREATE OR REPLACE FUNCTION public\\.${fn}\\(\\)\\s*RETURNS jsonb`), `${fn} takes no argument`);
    assert.match(sql, new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\(\\) FROM PUBLIC, anon;`), `${fn}: not for anybody signed out`);
    assert.match(sql, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${fn}\\(\\) TO authenticated, service_role;`), `${fn}: for a signed-in member`);
  }
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.my_person_id\(\) FROM PUBLIC, anon, authenticated;/, 'the person lookup is the server’s alone');
  assert.match(sql, /IF auth\.uid\(\) IS NULL THEN\s*RAISE EXCEPTION/);
  // Authors are matched by the report pages' own rule, unchanged.
  assert.match(sql, /public\.resolve_report_authors\(f\.authors, v_people\)/);
  assert.match(sql, /WHERE f\.deleted_at IS NULL/);
  // No person code, no source, nobody else.
  assert.doesNotMatch(sql.slice(sql.indexOf('my_roster_history()'), sql.indexOf('my_report_projects()')), /'code'|'source'/);
  const reg = read('supabase/functions/_shared/activity-registry.ts');
  assert.match(reg, /'my_roster_history', 'my_report_projects'/, 'listed with the client reads');
  const api = read('src/lib/profile-api.ts');
  assert.match(api, /rpc\('my_roster_history'\)/);
  assert.match(api, /rpc\('my_report_projects'\)/);
});

test('Your projects is read in one pass, by the report pages\' rule, so the live data answers in time', () => {
  // Matching the authors of every report through resolve_report_authors()
  // re-read every person once per report: on the live data that passed the
  // 8 seconds a signed-in reader is given, and the card could not be read.
  const sql = read('supabase/migrations/20261030090000_my_report_projects_one_pass.sql');
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.my_report_projects\(\)\s*RETURNS jsonb/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.my_report_projects\(\) FROM PUBLIC, anon;/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.my_report_projects\(\) TO authenticated, service_role;/);
  assert.match(sql, /IF v_uid IS NULL THEN\s*RAISE EXCEPTION/);
  // The function's code, without its comments.
  const body = sql.slice(sql.indexOf('AS $$'), sql.lastIndexOf('$$;')).replace(/--.*$/gm, '');
  assert.doesNotMatch(body, /resolve_report_authors\(|public_people_json\(/, 'no per-report pass over the people');
  assert.equal(body.match(/public\.public_people_index\(\)/g).length, 1, 'the people are read once');
  assert.match(body, /people AS MATERIALIZED/);
  assert.match(body, /WHERE deleted_at IS NULL/);
  assert.match(body, /ORDER BY f\.date DESC NULLS LAST, f\.created_at DESC/);
  // The same four steps, in the same order, as resolve_report_authors().
  const rule = (text, v) => {
    const from = text.indexOf('COALESCE(\n', text.indexOf(`SELECT ${v}.`));
    return text.slice(from, text.indexOf(') AS link', from)).replace(new RegExp(`\\b${v}\\.`, 'g'), 'X.').replace(/\s+/g, ' ');
  };
  const original = read('supabase/migrations/20261023120000_evidence_reports_funds.sql');
  const resolve = original.slice(original.indexOf('FUNCTION public.resolve_report_authors'), original.indexOf('FUNCTION public.public_people_json'));
  assert.equal(rule(body, 'c'), rule(resolve, 'a'));
  assert.ok(rule(body, 'c').length > 400);
  assert.doesNotMatch(sql, /\u2014/);
});

test('the migration changes an email only where it is the Step 97 copy, and deletes nothing', () => {
  const sql = read(MIGRATION);
  const updates = sql.match(/UPDATE public\.auto_email_templates SET body = \$e[0-9a-z]+\$[\s\S]*?\$e[0-9a-z]+\$\s*WHERE key = '([a-z_]+)' AND md5\(body\) = '[0-9a-f]{32}';/g) || [];
  assert.equal(updates.length, 4, 'four guarded updates');
  for (const k of ['declaration_signed', 'commitment_request', 'commitment_reminder', 'commitment_recorded']) {
    assert.ok(updates.some((u) => u.includes(`WHERE key = '${k}'`)), k);
  }
  const top = sql.replace(/\$\$[\s\S]*?\$\$/g, '').replace(/\$e[0-9a-z]+\$[\s\S]*?\$e[0-9a-z]+\$/g, '');
  assert.doesNotMatch(top, /\b(DELETE FROM|DROP TABLE|DROP FUNCTION|TRUNCATE)\b/i);
  assert.match(sql, /https:\/\/minervaims\.org\/workspace\/my-profile\/commitment/);
  const emails = read('supabase/functions/_shared/transactional-emails.ts');
  assert.match(emails, /const COMMITMENT_PAGE = `\$\{SITE\}\/workspace\/my-profile\/commitment`;/);
  assert.match(emails, /'Read what you signed', COMMITMENT_PAGE/);
  assert.match(emails, /'See your answer', COMMITMENT_PAGE/);
  assert.equal((emails.match(/My Profile, Commitment, in the Minerva Workspace/g) || []).length, 2);
});

test('every page has its help, and the manual knows the three pages', () => {
  const keys = read('src/lib/workspace-guide-keys.ts');
  const guide = read('src/lib/workspace-guide.ts');
  const manual = read('src/lib/workspace-manual.ts');
  for (const k of ['my-role', 'my-membership', 'my-commitment']) {
    assert.match(keys, new RegExp(`'${k}'`), `${k} has a help button`);
    assert.match(guide, new RegExp(`key: '${k}', section: 'General'`), `${k} has a help entry`);
    assert.match(manual, new RegExp(`\\n  '${k}': \\{\\n    detail:`), `${k} has its page detail`);
  }
});

test('no em dash in anything Step 97B added', () => {
  const files = [
    MIGRATION, 'src/lib/profile-api.ts', 'src/components/admin/MyProfile.tsx', 'src/components/admin/CommitmentPanel.tsx',
    'src/components/admin/profile/profile-ui.tsx', 'src/components/admin/profile/ProfileIdentity.tsx',
    'src/components/admin/profile/PersonalInformation.tsx', 'src/components/admin/profile/MembershipPage.tsx',
    'src/components/admin/profile/CommitmentPage.tsx', 'src/components/shared/DeclarationBody.tsx', 'src/lib/declaration-text.ts',
  ];
  for (const f of files) assert.doesNotMatch(read(f), /—/, f);
});
