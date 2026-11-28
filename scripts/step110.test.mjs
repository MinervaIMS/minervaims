// =====================================================================
// STEP 110: the eighteen changes of the step, each pinned where it lives.
// The activity log has its own file (scripts/activity-log.test.mjs).
// ---------------------------------------------------------------------
//   node --test scripts/step110.test.mjs
//   MIMS_PG=<psql connection> node --test scripts/step110.test.mjs
// =====================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const PG = process.env.MIMS_PG;
const migrationPath = (name) => {
  for (const dir of ['supabase/migrations', 'drizzle/migrations']) {
    let files = [];
    try { files = readdirSync(join(ROOT, dir)); } catch { continue; }
    const f = files.find((x) => x.endsWith(`_${name}.sql`));
    if (f) return `${dir}/${f}`;
  }
  throw new Error(`migration ${name} not found`);
};

test('1-2. My Profile opens on its content; the header names the reader on one line, with a round picture', () => {
  const profile = code('src/components/admin/MyProfile.tsx');
  assert.doesNotMatch(profile, /<ProfileIdentity/, 'no page opens with the band');
  assert.match(profile, /<h1 className="sr-only">My Profile: \{PROFILE_PAGE_LABEL\[current\]\}<\/h1>/);
  const ident = code('src/components/admin/WorkspaceIdentity.tsx');
  assert.match(ident, /h-14 w-14 shrink-0 overflow-hidden rounded-full/);
  assert.match(ident, /<MarqueeName text=\{`\$\{shownName\}, \$\{roleLabel\}`\} className="text-\[28px\] leading-\[1\.15\]"/);
  assert.match(ident, /<span className="px-2\.5 text-foreground\/40">·<\/span>/);
});

test('3. the Time Machine is the whole page, with aligned columns and the square LinkedIn mark', () => {
  const page = code('src/components/admin/TimeMachine.tsx');
  // Step 112: the page is light, only the machine is dark (scripts/step112.test.mjs).
  assert.match(page, /className="tm-root relative isolate bg-background font-body text-foreground"/);
  assert.match(page, /<TimeWarp engine=\{engine\} stageRef=\{stageRef\} \/>/);
  assert.match(page, /<table className="w-full table-fixed font-body text-small" data-tm-table>/);
  assert.match(page, /<colgroup>/);
  assert.match(page, /import linkedinIcon from '@\/assets\/linkedin-icon\.png';/);
  assert.match(page, /Download CSV/);
  const console_ = code('src/components/admin/TimeMachineConsole.tsx');
  assert.match(console_, /data-ro\s+aria-labelledby="tm-console-title"/, 'travelling writes nothing, for every reader');
  assert.match(console_, /updatePlaybackRate/, 'the rings change speed without a jump');
  assert.match(console_, /if \(e\.key === 'Escape'\)/);
  assert.match(read('src/index.css'), /#ws-content \.tm-root \{ --tm-px: 1\.5rem; --tm-pt: 1\.5rem; --tm-pb: 5\.5rem; \}/);
  const m = read(migrationPath('step110_time_machine_linkedin'));
  assert.match(m, /'linkedin_url', li\.url\)/);
  assert.match(m, /linkedin\\\.com/);
  assert.match(m, /REVOKE ALL ON FUNCTION public\.time_machine_for\(uuid\) FROM PUBLIC, anon, authenticated;/);
});

test('4. Users: every pending approval at once, each checked again by the server', () => {
  const fn = code('supabase/functions/admin-users/index.ts');
  const block = fn.slice(fn.indexOf("if (action === 'delete-pending')"), fn.indexOf("if (action === 'delete') {"));
  assert.ok(fn.indexOf("if (!isAdmin) {") < fn.indexOf("if (action === 'delete-pending')"), 'the President and the admin account only');
  for (const kept of ['your own account', 'the association account', 'has a workspace role now', 'an applicant, in Recruiting']) assert.match(block, new RegExp(kept));
  assert.match(read('src/components/admin/UserManagement.tsx'), /Delete all \{pendingUsers\.length\}/);
  assert.match(read('supabase/functions/_shared/activity-registry.ts'), /'admin-users:delete-pending': 'delete',/);
});

test('5. Past Boards: the square LinkedIn mark, in one column', () => {
  const boards = code('src/components/shared/PastBoards.tsx');
  assert.match(boards, /import linkedinIcon from '@\/assets\/linkedin-icon\.png';/);
  assert.doesNotMatch(boards, /linkedin-black/);
  assert.match(boards, /sm:w-\[12\.5rem\] sm:flex-none/, 'every name in a box of one width, so the marks align');
});

test('6. Spring 2026 had no Head of Media & Communication: corrected everywhere, with a backup', () => {
  const m = read(migrationPath('step110_spring_2026_media_role'));
  assert.match(m, /CREATE TABLE IF NOT EXISTS public\.role_fix_backup_step110/);
  for (const t of ['roster_entries', 'semester_members', 'membership_certificates']) assert.match(m, new RegExp(`'${t}'`), t);
  assert.match(m, /e\.semester_key = '2026-spring' AND e\.role_label = 'Head of Media & Communication'/);
  assert.match(m, /SET role_label = 'Media & Communication Analyst', division_key = 'media', source = 'edit'/);
  assert.match(m, /ON CONFLICT \(source_table, row_id\) DO NOTHING/);
});

test('7. Association On Display: past days by who signed up and who came', () => {
  const page = code('src/components/admin/AssociationOnDisplay.tsx');
  assert.match(page, /signed up/);
  assert.match(page, /attended/);
  assert.match(page, /Attendance not taken/);
  const fn = code('supabase/functions/admin-aod/index.ts');
  assert.match(fn, /\.\.\.\(isSenior \? \{ attendees: \[\] \} : \{\}\)/, 'names of those present for the roles that manage the days');
});

test('8. a live page in a device: one design-system layout, the device on the page, one switch', () => {
  const show = code('src/components/shared/DeviceShowcase.tsx');
  assert.match(show, /export function DeviceShowcase/);
  assert.match(show, /export function DeviceSwitch/);
  const preview = code('src/components/admin/recruiting/ApplicantPreview.tsx');
  assert.doesNotMatch(preview, /aria-label="Their pages at this stage"/, 'no row of their pages beside the device');
  assert.doesNotMatch(preview, /overflow-hidden rounded-xl border border-separator">\s*\{\/\*/);
  assert.match(preview, /<DeviceSwitch family=\{device\}/);
  const frame = code('src/pages/ApplicantFrame.tsx');
  assert.match(frame, /const z = target && given > 0 && Math\.abs\(given - target\) > 4 \? given \/ target : 1;/, 'the page fits itself to its device');
  assert.match(code('src/lib/device-frames.ts'), /export const DEVICES/);
});

test('9. Candidates Screening: no choice columns; the remaining candidates rejected by the President or the Vice-President once closed', () => {
  const page = code('src/components/admin/CandidatesManagement.tsx');
  assert.doesNotMatch(page, /<ColumnFilter label="First choice"/);
  assert.doesNotMatch(page, /<ColumnFilter label="Second choice"/);
  assert.match(page, /Reject remaining/);
  const fn = code('supabase/functions/admin-applications/index.ts');
  const block = fn.slice(fn.indexOf("if (action === 'reject-remaining')"), fn.indexOf("// ── set-evaluation-division"));
  assert.match(block, /roleNames\.some\(\(r\) => r === 'president' \|\| r === 'vice_president'\)/);
  assert.match(block, /if \(!closed\)/);
  assert.match(block, /rejection_post_interview' : 'rejection_pre_interview'/, 'each receives the usual rejection email');
  assert.match(block, /\.eq\('status', a\.status\)/, 'never a candidate moved on meanwhile');
});

test('10. Recruiting: Screening first, Application Setup after Offers, Applicant Preview last', async () => {
  const nav = read('src/lib/workspace-nav.ts');
  const recruiting = nav.slice(nav.indexOf("key: 'applications', slug: 'applications'"), nav.indexOf("key: 'events', slug: 'events'"));
  const order = [...recruiting.matchAll(/\{ key: '([a-z-]+)', slug:/g)].map((m) => m[1]);
  assert.deepEqual(order, ['applications-screening', 'applications-interview-calendar', 'applications-calls', 'applications-joiners', 'applications-setup', 'applications-preview']);
  assert.match(nav, /'applications-website': \{ key: 'applications-setup', tab: 'dates-and-divisions'/);
  assert.match(nav, /'applications-form': \{ key: 'applications-setup', tab: 'questions'/);
  assert.match(read('src/lib/access/matrix.ts'), /'applications-setup': \['applications-website', 'applications-form'\],/);
  assert.match(read('supabase/functions/_shared/access.ts'), /'applications-setup': \['applications-website', 'applications-form'\],/);
  assert.match(read('src/pages/MinervaWorkspace.tsx'), /case 'applications-setup':/);
});

test('11-12. Latest Reports: the glass + opens the report page; the report page has no rule and carries the seal', () => {
  const rs = code('src/components/shared/ReportsSection.tsx');
  assert.match(rs, /<Link className="rplus" to=\{rep\.href\}/);
  const css = read('src/index.css');
  assert.match(css, /inset 0 0 14px 2px hsl\(0 0% 100% \/ \.75\)/, 'a white glow inside the glass');
  const rp = code('src/pages/ReportPage.tsx');
  assert.match(rp, /<div data-page-hero className="relative">/);
  // The legal pages' seal, drawn without its white ground (the dotted field shows through).
  assert.match(rp, /import sealLogo from '@\/assets\/full-logo-color-mark\.svg';/);
  assert.match(rp, /className="hidden h-auto w-\[176px\] shrink-0 select-none lg:block xl:w-\[208px\]"/);
});

test('13-14. Career in its new order; Settings, Mobile View removed', () => {
  const nav = read('src/lib/workspace-nav.ts');
  const career = nav.slice(nav.indexOf("key: 'career', slug: 'career'"), nav.indexOf("key: 'calendar', slug: 'calendar'"));
  assert.deepEqual([...career.matchAll(/\{ key: '([a-z-]+)', slug:/g)].map((m) => m[1]),
    ['career-templates', 'career-linkedin', 'career-ib', 'career-brainteasers', 'career-gpa', 'career-gmat', 'career-smart']);
  for (const f of ['src/lib/workspace-nav.ts', 'src/lib/mobile-policy.ts', 'src/lib/access/matrix.ts', 'supabase/functions/_shared/access.ts', 'src/pages/MinervaWorkspace.tsx', 'src/lib/workspace-guide.ts', 'src/lib/workspace-manual.ts', 'src/lib/workspace-tours.ts']) {
    assert.doesNotMatch(read(f), /settings-mobile/, f);
  }
  assert.ok(!existsSync(join(ROOT, 'src/components/admin/MobileViewTable.tsx')));
  // An old link to it opens Role Permissions, whose help now tells its rule.
  assert.match(nav, /\{ sectionKey: 'settings', slug: 'mobile-view', key: 'settings-roles' \}/);
  assert.doesNotMatch(read('src/lib/workspace-guide.ts'), /is ticked here once it has been checked on a phone/);
});

test('16. the certificate: black and white, smaller, since when and the path, never the reports', () => {
  const pdf = code('supabase/functions/membership-certificate/pdf.ts');
  assert.doesNotMatch(pdf, /PURPLE/, 'the seal is the one mark in colour');
  assert.match(pdf, /centred\(page, 'Certificate of Membership', y, \{ font: garamond, size: 26, color: INK \}\);/);
  assert.match(pdf, /Member since/);
  assert.match(pdf, /PATH IN THE SOCIETY/);
  assert.doesNotMatch(pdf, /report/i);
  const fn = code('supabase/functions/membership-certificate/index.ts');
  assert.match(fn, /supabase\.rpc\('certificate_path'/);
  assert.match(fn, /\.update\(\{ member_since: memberSince, path \}\)\.eq\('id', c\.id\)\.is\('path', null\)/, 'kept once, never rewritten');
  const m = read(migrationPath('step110_certificate_path'));
  assert.match(m, /ADD COLUMN IF NOT EXISTS member_since text/);
  assert.match(m, /REVOKE ALL ON FUNCTION public\.certificate_path\(uuid, text, text\) FROM PUBLIC, anon, authenticated;/);
});

test('17-18. Sent Emails in Settings, Automatic Emails moved there; each member\'s emails in People, Members', () => {
  const nav = read('src/lib/workspace-nav.ts');
  const website = nav.slice(nav.indexOf("key: 'website', slug: 'website'"), nav.indexOf("key: 'settings', slug: 'settings'"));
  assert.doesNotMatch(website, /ops-auto-emails/);
  const settings = nav.slice(nav.indexOf("key: 'settings', slug: 'settings'"), nav.indexOf("key: 'welcome', slug: 'how-to-use'"));
  assert.match(settings, /key: 'ops-auto-emails', slug: 'automatic-emails'/);
  assert.match(settings, /key: 'settings-sent-emails', slug: 'sent-emails'/);
  assert.match(nav, /\{ fromSection: 'website', slug: 'automatic-emails', sectionKey: 'settings', key: 'ops-auto-emails' \}/, 'the old address still opens it');
  assert.match(read('src/lib/access/matrix.ts'), /'settings-sent-emails': 'ops-auto-emails',/);
  assert.match(read('src/pages/MinervaWorkspace.tsx'), /return <AutoEmails view="register" \/>;/);
  const fn = code('supabase/functions/admin-auto-emails/index.ts');
  assert.match(fn, /if \(action === 'member-emails'\)/);
  assert.match(read('supabase/functions/_shared/activity-registry.ts'), /'admin-auto-emails': \['list', 'sign', 'member-emails'\],/);
  const members = code('src/components/admin/MembersManagement.tsx');
  assert.match(members, /const seesEmails = !limitedToOwnDivision && access\.canView\('ops-auto-emails'\);/);
  assert.match(members, /<MemberEmailsDialog target=\{emailListOf\}/);
});

test('the workspace resolves the moved and merged addresses', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const { transformSync } = require(join(ROOT, 'node_modules', 'esbuild'));
  // The navigation imports icons and aliases; checked here on its source shape only.
  const nav = read('src/lib/workspace-nav.ts');
  assert.match(nav, /const moved = MOVED_PAGES\.find\(\(m\) => m\.fromSection === sectionSlug && m\.slug === subSlug\);/);
  assert.ok(transformSync(nav, { loader: 'ts' }).code.length > 0);
});

test('the Step 110 migrations run twice and change only what they name', { skip: !PG && 'MIMS_PG not set' }, () => {
  const run = (f) => execFileSync('psql', [PG, '-v', 'ON_ERROR_STOP=1', '-q', '-f', join(ROOT, f)], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  for (const name of ['step110_time_machine_linkedin', 'step110_spring_2026_media_role', 'step110_certificate_path']) {
    run(migrationPath(name));
    run(migrationPath(name));
  }
  const sql = (q) => execFileSync('psql', [PG, '-At', '-c', q], { encoding: 'utf8' }).trim();
  assert.equal(sql("select has_function_privilege('authenticated', 'public.certificate_path(uuid, text, text)', 'execute')"), 'f');
  assert.equal(sql("select has_table_privilege('authenticated', 'public.role_fix_backup_step110', 'select')"), 'f');
});

test('nothing added carries an em dash', () => {
  for (const f of [
    'scripts/step110.test.mjs', 'src/components/admin/TimeMachine.tsx', 'src/components/admin/TimeMachineConsole.tsx', 'src/components/admin/WorkspaceIdentity.tsx',
    'src/components/admin/MyProfile.tsx', 'src/components/admin/profile/ProfileIdentity.tsx', 'src/components/shared/PastBoards.tsx', 'src/components/admin/UserManagement.tsx',
    'src/components/admin/AssociationOnDisplay.tsx', 'src/components/shared/DeviceShowcase.tsx', 'src/components/admin/recruiting/DeviceStage.tsx',
    'src/components/admin/recruiting/ApplicantPreview.tsx', 'src/components/admin/recruiting/ApplicationSetup.tsx', 'src/components/admin/recruiting/RejectRemaining.tsx',
    'src/components/admin/CandidatesManagement.tsx', 'src/lib/device-frames.ts', 'src/pages/ApplicantFrame.tsx', 'src/components/shared/ReportsSection.tsx',
    'src/pages/ReportPage.tsx', 'src/components/shared/PageIntroduction.tsx', 'src/components/admin/AutoEmails.tsx', 'src/components/admin/people/MemberEmailsDialog.tsx',
    'src/components/admin/MembersManagement.tsx', 'supabase/functions/membership-certificate/pdf.ts', 'supabase/functions/admin-users/index.ts',
    'supabase/functions/admin-aod/index.ts', 'supabase/functions/admin-auto-emails/index.ts', 'src/lib/workspace-guide.ts', 'src/lib/workspace-manual.ts',
    'src/components/admin/HowToUse.tsx', 'src/lib/workspace-tours.ts', 'src/lib/workspace-nav.ts', migrationPath('step110_time_machine_linkedin'),
    migrationPath('step110_spring_2026_media_role'), migrationPath('step110_certificate_path'),
  ]) assert.doesNotMatch(read(f), /\u2014/, f);
});
