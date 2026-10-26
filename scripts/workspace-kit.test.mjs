// =====================================================================
// workspace-kit.test.mjs: the Step 98 kit, and the pages built with it
// (Batch 2: Recruiting; Batch 3: Events; Batch 4: People and Settings).
// ---------------------------------------------------------------------
//   node --test scripts/workspace-kit.test.mjs
//
// Pure checks on the sources, no database and no network:
//   * the six Recruiting pages work in full on a phone, and their notes
//     exception for Team Leaders and Portfolio Managers holds on a phone
//     as on a computer;
//   * the registers keep their header in view and become cards on a
//     phone, with their filters in a sheet and named above the list;
//   * rare actions that cannot be undone wait in More, marked destructive;
//   * the candidate window and the applicants' statuses are untouched;
//   * the kit sits beside `components/ui` and changes nothing in it;
//   * the filter chips say what is filtered;
//   * every page of Events works on a phone, and deleting there is asked
//     in the workspace's own window, never the browser's;
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
const CACHE = join(ROOT, 'node_modules', '.cache', 'workspace-kit-test');
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

const RECRUITING = [
  'applications-website', 'applications-screening', 'applications-interview-calendar',
  'applications-calls', 'applications-joiners', 'applications-form',
];
const A = 'src/components/admin/';

test('the six Recruiting pages work in full on a phone', async () => {
  const mobile = await load('src/lib/mobile-policy.ts', 'mobile-policy');
  for (const k of RECRUITING) assert.equal(mobile.mobilePolicyFor(k), 'full', k);
});

test('notes for Team Leaders and Portfolio Managers hold on a phone as on a computer', () => {
  for (const p of [`${A}CandidatesManagement.tsx`, `${A}NewJoiners.tsx`]) {
    const src = read(p);
    assert.match(src, /const notesAllowedInReadOnly = canAddNotes && !canManage\('applications-screening'\);/, p);
    assert.doesNotMatch(src, /useIsDesktop/, p);
  }
});

test('the registers hold their header, become cards on a phone and say which filters are on', () => {
  for (const p of [`${A}CandidatesManagement.tsx`, `${A}NewJoiners.tsx`]) {
    const src = read(p);
    for (const piece of ['<RegisterPage>', '<Pinned>', '<RegisterFrame>', 'className={REGISTER_HEAD}', '<RecordList', '<RecordCard', '<FilterSheet', '<FilterSummary']) {
      assert.ok(src.includes(piece), `${p}: ${piece}`);
    }
    // The column that says whose row it is stays in view.
    assert.ok(/REGISTER_(FIRST|HELD)_COLUMN/.test(src), `${p}: a held name column`);
    // The old "Clear filters" button in the toolbar moved into the summary line.
    assert.doesNotMatch(src, /<ClearFilters/, p);
  }
  const calls = read(`${A}PhoneCalls.tsx`);
  assert.ok(calls.includes('<RecordList') && calls.includes('sticky -top-6'), 'Phone Calls: cards and a held header');
  // The header sticks to the pane: no box of its own may scroll under it.
  assert.doesNotMatch(read('src/components/admin/kit/Register.tsx'), /overflow-x-auto/);
});

test('rare actions that cannot be undone wait in More, last and in red', () => {
  assert.match(read(`${A}InterviewCalendar.tsx`), /key: 'clear', label: 'Clear all', icon: Trash2, destructive: true/);
  assert.match(read(`${A}NewJoiners.tsx`), /key: 'withdraw', label: 'Withdraw the offer', icon: Undo2, destructive: true/);
  const more = read('src/components/admin/kit/MoreMenu.tsx');
  assert.match(more, /const risky = actions\.filter\(\(a\) => a\.destructive\)/);
  assert.match(more, /min-h-12/, 'a 44 px line per action on a phone');
});

test('the candidate window is untouched', () => {
  // The window, its arrows and its contents are drawn exactly as before.
  for (const p of [`${A}CandidatesManagement.tsx`, `${A}NewJoiners.tsx`]) {
    const src = read(p);
    assert.ok(src.includes('<DialogContent ref={detailPaneRef} className="max-w-[96vw] w-[96vw] max-h-[94vh] overflow-y-auto">'), p);
    assert.ok(src.includes('aria-label="Previous candidate"') && src.includes('aria-label="Next candidate"'), p);
  }
  for (const p of [`${A}InterviewCalendar.tsx`, `${A}PhoneCalls.tsx`]) {
    assert.ok(read(p).includes('<DialogContent className="max-w-[96vw] w-[96vw] max-h-[94vh] overflow-y-auto">'), p);
  }
  // No kit piece reaches into the candidate window's own components.
  for (const f of readdirSync(join(ROOT, 'src/components/admin/recruiting'))) {
    assert.doesNotMatch(read(`src/components/admin/recruiting/${f}`), /admin\/kit\//, f);
  }
});

test('applicant statuses are drawn by the same labels and colours on cards as in the tables', () => {
  const screening = read(`${A}CandidatesManagement.tsx`);
  assert.equal(screening.match(/statusBadgeClass\(a\.status\)\}`\}>\{STATUS_LABELS\[a\.status\]\}/g)?.length, 2, 'table and card');
  const calls = read(`${A}PhoneCalls.tsx`);
  assert.equal(calls.match(/statusBadgeClass\(c\.status\)\}`\}>\{STATUS_LABELS\[c\.status\]\}/g)?.length, 2, 'table and card');
  const offers = read(`${A}NewJoiners.tsx`);
  assert.equal(offers.match(/\$\{st\.tone\}`\}>\{st\.label\}/g)?.length, 2, 'table and card');
});

test('the kit sits beside components/ui and does not change it', () => {
  const kit = readdirSync(join(ROOT, 'src/components/admin/kit'));
  assert.deepEqual(kit.sort(), ['BottomSheet.tsx', 'ConfirmDialog.tsx', 'Filters.tsx', 'MoreMenu.tsx', 'RecommendationGroup.tsx', 'RecordCard.tsx', 'Register.tsx', 'touch-calendar.ts']);
  // The 16 px close of the shared sheet is still there: the kit has its own.
  assert.match(read('src/components/ui/sheet.tsx'), /<X className="h-4 w-4" \/>/);
  assert.match(read('src/components/admin/kit/BottomSheet.tsx'), /h-11 w-11/);
  // The month picker keeps its own sizes; the Interview Calendar passes larger ones for a phone.
  assert.match(read('src/components/ui/calendar.tsx'), /day: cn\(buttonVariants\(\{ variant: "ghost" \}\), "h-9 w-9 p-0 font-normal aria-selected:opacity-100"\)/);
  assert.match(read(`${A}InterviewCalendar.tsx`), /classNames=\{TOUCH_CALENDAR_CLASSNAMES\}/);
});

test('the filter chips name what is filtered', async () => {
  const { filterChips } = await load('src/components/admin/kit/Filters.tsx', 'filters');
  const groups = [
    { key: 'status', label: 'Status', options: [{ value: 'a', label: 'CV opened' }, { value: 'b', label: 'Rejected' }, { value: 'c', label: 'Joined' }], selected: ['a', 'b', 'c'], onChange: () => {} },
    { key: 'year', label: 'Year', options: [{ value: 'y1', label: 'Bachelor, 1st year' }], selected: [], onChange: () => {} },
  ];
  const chips = filterChips(groups, { value: '  rossi ', clear: () => {} });
  assert.deepEqual(chips.map((c) => c.label), ['Search: “rossi”', 'Status: CV opened, Rejected and 1 more']);
  assert.deepEqual(filterChips(groups.slice(1)), []);
});

test('every page of Events works in full on a phone', async () => {
  const mobile = await load('src/lib/mobile-policy.ts', 'mobile-policy-events');
  for (const k of ['events-mine', 'events-create', 'events-forms', 'events-attendance', 'events-archive', 'events-on-display']) {
    assert.equal(mobile.mobilePolicyFor(k), 'full', k);
  }
  const ws = read('src/pages/MinervaWorkspace.tsx');
  // The archive's actions are drawn on a phone too, and an alumni call opens editable there.
  assert.doesNotMatch(ws, /\{isDesktop && \(\s*<div className="flex items-center gap-2 shrink-0">/);
  assert.match(ws, /canEdit=\{canEditAlumniCalls\}/);
  assert.match(ws, /<div className="mt-2 flex flex-wrap items-center gap-2 lg:hidden">\{eventActions\(event, onWeb\)\}<\/div>/);
  // Create Event: 44 px fields on a phone, and its button in reach.
  assert.match(read(`${A}EventCreate.tsx`), /className="ws-form-touch /);
  assert.match(read('src/index.css'), /\.ws-form-touch input:not\(\[type='checkbox'\]\)/);
});

test('deleting in Events is asked in the workspace\'s own window, and says what goes with it', () => {
  const ws = read('src/pages/MinervaWorkspace.tsx');
  assert.doesNotMatch(ws, /confirm\('Are you sure you want to delete this event\?'\)/);
  assert.match(ws, /title: 'Delete this event\?'/);
  assert.match(ws, /with its registrations and its attendance/);
  const aod = read(`${A}AssociationOnDisplay.tsx`);
  assert.doesNotMatch(aod, /confirm\('Delete this day/);
  assert.match(aod, /title: 'Delete this day\?'/);
  const att = read(`${A}EventAttendance.tsx`);
  // Removing somebody is in More and asks first; no bin removes on one press.
  assert.doesNotMatch(att, /onClick=\{\(\) => remove\(r\.id\)\}/);
  assert.equal(att.match(/onSelect: \(\) => askRemove\(r\)/g)?.length, 2, 'the phone list and the table');
  // The kit's window answers true only for its red button.
  assert.match(read('src/components/admin/kit/ConfirmDialog.tsx'), /onClick=\{\(\) => settle\(true\)\}/);
});

test('People and Settings work in full on a phone, as cards, with rare actions in More', async () => {
  const mobile = await load('src/lib/mobile-policy.ts', 'mobile-policy-people');
  for (const k of ['people-members', 'people-rosters', 'people-alumni', 'people-invites', 'settings-users', 'settings-roles', 'settings-mobile', 'settings-activity', 'settings-certificates', 'settings-declarations', 'events-alumni-calls']) {
    assert.equal(mobile.mobilePolicyFor(k), 'full', k);
  }
  for (const p of ['MembersManagement.tsx', 'InvitesManagement.tsx', 'UserManagement.tsx', 'CertificateRegister.tsx', 'ActivityManagement.tsx']) {
    const src = read(`${A}${p}`);
    assert.ok(src.includes('<RecordList') && src.includes('<RecordCard') && src.includes('<RegisterFrame>') && src.includes('className={REGISTER_HEAD}'), p);
  }
  for (const [p, label] of [
    ['MembersManagement.tsx', 'Move to alumni or remove'], ['AlumniManagement.tsx', 'Delete alumnus'],
    ['InvitesManagement.tsx', 'Revoke the invitation'], ['UserManagement.tsx', 'Remove this account'],
    ['CertificateRegister.tsx', 'Withdraw the certificate'],
  ]) {
    assert.match(read(`${A}${p}`), new RegExp(`label: '${label}'[^}]*destructive: true`), p);
  }
  const alumni = read(`${A}AlumniManagement.tsx`);
  assert.doesNotMatch(alumni, /confirm\('Are you sure you want to delete this alumni\?'\)/);
  assert.match(alumni, /title: 'Delete this alumnus\?'/);
  // The commitment board folds to one line on a phone and stays open on a computer.
  assert.match(read(`${A}CommitmentBoard.tsx`), /className=\{`mt-3 overflow-x-auto \$\{open \? '' : 'max-lg:hidden'\}`\}/);
  // The Time Machine: correcting on the row, removing under More.
  assert.match(read(`${A}TimeMachine.tsx`), /label: `Remove from \$\{s\.label\}`, icon: Trash2, destructive: true/);
  assert.match(read(`${A}SettingsDeclarations.tsx`), /ws-form-touch/);
  // The permissions grid holds both its header and its first column.
  const roles = read(`${A}RolePermissionsTable.tsx`);
  assert.match(roles, /sticky left-0 top-0 z-30/);
  assert.match(roles, /sticky top-0 z-20 bg-muted/);
});

test('Reports and Career work in full on a phone, with their deletions asked in the workspace\'s own window', async () => {
  const mobile = await load('src/lib/mobile-policy.ts', 'mobile-policy-reports');
  for (const k of ['reports-upload', 'reports-archive', 'reports-templates', 'reports-funds', 'reports-divisions',
    'career-templates', 'career-cv', 'career-cl', 'career-linkedin', 'career-gpa', 'career-brainteasers']) {
    assert.equal(mobile.mobilePolicyFor(k), 'full', k);
  }
  // Every library follows the role on a phone; the access hook still
  // lowers it for a page that is not yet open for editing there.
  const library = read(`${A}ResourceManager.tsx`);
  assert.match(library, /const manage = canManage;/);
  assert.doesNotMatch(library, /useIsDesktop/);
  // No browser grey box is left on these pages.
  for (const p of ['FileManagement.tsx', 'FundsPerformances.tsx']) {
    assert.doesNotMatch(read(`${A}${p}`), /[^.\w]confirm\(`/, p);
  }
  const archive = read(`${A}FileManagement.tsx`);
  assert.match(archive, /title: 'Delete this report\?'/);
  assert.match(archive, /title: 'Delete this report permanently\?'/);
  assert.match(archive, /label: 'Delete report', icon: Trash2, destructive: true/);
  assert.match(archive, /label: 'Delete permanently', icon: Trash2, destructive: true/);
  // The fund grid keeps the year and the actions in view.
  const funds = read(`${A}FundsPerformances.tsx`);
  assert.match(funds, /sticky left-0 z-10 bg-muted[^"]*">Year/);
  assert.match(funds, /sticky right-0 z-10 bg-muted[^"]*">Actions/);
  // The long forms keep their button at the foot of a phone's screen.
  for (const p of ['ReportUpload.tsx', 'DivisionPagesEditor.tsx']) {
    assert.match(read(`${A}${p}`), /max-lg:sticky max-lg:-bottom-\[5\.5rem\]/, p);
  }
  assert.match(read(`${A}career/brainteasers/ProblemEditor.tsx`), /max-lg:sticky max-lg:-bottom-6/);
});

test('Social Media and Operations work in full on a phone; the forms people fill in are not touched', async () => {
  const mobile = await load('src/lib/mobile-policy.ts', 'mobile-policy-ops');
  for (const k of ['smm-editorial', 'smm-social', 'smm-ig', 'smm-li', 'smm-other', 'smm-graphics', 'smm-brand', 'smm-ads',
    'ops-fee', 'ops-treasury', 'ops-forms', 'ops-external', 'ops-docs']) {
    assert.equal(mobile.mobilePolicyFor(k), 'full', k);
  }
  // The role decides on a phone as on a computer: no page holds its own
  // "computer only" gate any more.
  const editorial = read(`${A}EditorialCalendar.tsx`);
  assert.match(editorial, /const canEdit = canManage\('smm-editorial'\);/);
  assert.doesNotMatch(editorial, /useIsDesktop/);
  // A phone has no dragging: a day is added to from its own list.
  assert.match(editorial, /Add an item on \{shortDay\(selected\)\}/);
  const forms = read(`${A}forms/InternalForms.tsx`);
  assert.doesNotMatch(forms, /useIsDesktop|Read-only on a phone/);
  assert.match(forms, /label: 'Delete', icon: Trash2, destructive: true/);
  assert.match(forms, /label: 'Delete the form', icon: Trash2, destructive: true/);
  // Registers read as cards on a phone.
  for (const p of ['AdsRegister.tsx', 'Treasury.tsx']) {
    const src = read(`${A}${p}`);
    assert.ok(src.includes('<RecordList') && src.includes('<RecordCard') && src.includes('hidden lg:block max-w-full'), p);
  }
  assert.match(read(`${A}MembershipFee.tsx`), /<label className="flex min-h-14 cursor-pointer items-center gap-3 px-3 py-2">/);
  // The page a member or a guest fills a form in is not part of this batch.
  assert.doesNotMatch(read('src/pages/InternalFormPage.tsx'), /Step 98/);
});

test('every page works in full on a phone except the Dashboard and the Calendar, as approved', async () => {
  const mobile = await load('src/lib/mobile-policy.ts', 'mobile-policy-website');
  for (const k of ['website-pages', 'website-readings', 'website-testimonials', 'website-history', 'website-faqs', 'ops-newsletter', 'ops-auto-emails', 'welcome']) {
    assert.equal(mobile.mobilePolicyFor(k), 'full', k);
  }
  // Every subsection the menu lists is on the phone list (Step 98 is complete).
  const nav = read('src/lib/workspace-nav.ts');
  const listed = [...nav.matchAll(/\{ key: '([a-z-]+)', slug: '[a-z-]+', label: '[^']+', allowed:/g)].map((m) => m[1]);
  assert.ok(listed.length > 40, String(listed.length));
  for (const k of listed) assert.equal(mobile.mobilePolicyFor(k), 'full', k);
  // The two approved pages stay read only on a phone, ribbon included; a
  // page added later starts read only until it is checked.
  for (const k of ['dashboard', 'calendar', 'a-page-added-tomorrow']) assert.equal(mobile.mobilePolicyFor(k), 'view', k);
  assert.match(read(`${A}MobileWorkspaceShell.tsx`), /mobilePolicyFor\(activeSubKey \?\? activeSectionKey\)/);
  // Readings: no grey box, and a way to reorder without dragging.
  const readings = read(`${A}ReadingsManagement.tsx`);
  assert.doesNotMatch(readings, /[^.\w]confirm\('/);
  assert.match(readings, /title: 'Delete this reading\?'/);
  assert.match(readings, /label: 'Move up'/);
  assert.match(readings, /label: 'Move down'/);
  assert.match(readings, /touch-none/);
  for (const [p, label] of [
    ['ReadingsManagement.tsx', 'Delete reading'], ['TestimonialsManagement.tsx', 'Remove testimonial'],
    ['HistoryManagement.tsx', 'Clear this year'], ['JoinFaqsManagement.tsx', 'Remove this question'],
    ['NewsletterManagement.tsx', 'Remove subscriber'],
  ]) {
    assert.match(read(`${A}${p}`), new RegExp(`label: '${label}'[^}]*destructive: true`), p);
  }
  for (const p of ['PagesVisibilityManagement.tsx', 'NewsletterManagement.tsx', 'AutoEmails.tsx']) {
    const src = read(`${A}${p}`);
    assert.ok(src.includes('<RecordList') && src.includes('<RecordCard') && src.includes('<FilterSheet'), p);
  }
  // Each page is titled as the menu names it.
  for (const [p, title] of [
    ['ReportUpload.tsx', 'Upload Report'], ['FileManagement.tsx', 'Report Archive'], ['EditorialCalendar.tsx', 'Editorial Calendar'],
    ['AdsRegister.tsx', 'Ads & Spending'], ['AutoEmails.tsx', 'Automatic Emails'], ['HowToUse.tsx', 'How To Use'],
  ]) {
    assert.match(read(`${A}${p}`), new RegExp(`title="${title}"`), p);
    assert.match(nav, new RegExp(`label: '${title}'`), title);
  }
  assert.match(read('src/pages/MinervaWorkspace.tsx'), /title="Templates & Repositories"/);
});

test('found while checking on a phone: what was fixed stays fixed', () => {
  // Every Career page sizes its controls for a thumb on a phone.
  assert.match(read(`${A}career/CareerPage.tsx`), /className="font-body ws-form-touch /);
  // A library card's tick box sits in the corner of its picture.
  assert.match(read(`${A}library/LibraryParts.tsx`), /const placed = \/\\babsolute\\b\/\.test\(className\);/);
  // The Editorial Calendar's borrowed toolbar answers a 44 px touch.
  assert.match(read(`${A}EditorialCalendar.tsx`), /className="ws-touch-areas"/);
  assert.match(read('src/index.css'), /\.ws-touch-areas button::after/);
  // Only the corner cross of a window keeps its small size.
  assert.match(read('src/index.css'), /\.ws-form-touch\[role='dialog'\] > button\.absolute::after/);
  // Readings: the actions sit under the text on a phone.
  assert.match(read(`${A}ReadingsManagement.tsx`), /max-lg:w-full max-lg:justify-end/);
  // The notice for a page a role cannot open offers its way back at 44 px.
  assert.match(read(`${A}WorkspaceAccessNotice.tsx`), /className="font-body mt-6 h-11 lg:h-10"/);
  // ...and carries no read-only ribbon, having nothing to withhold.
  assert.match(read(`${A}MobileWorkspaceShell.tsx`), /!== 'full' && !!\(activeSubKey \?\? activeSectionKey\) && \(/);
  // Found by the full regression: My Profile's own links, and the
  // applicants' Add to calendar and meeting link, answer a 44 px touch.
  assert.match(read(`${A}profile/MembershipPage.tsx`), /<li className="relative flex[^"]*">/);
  assert.match(read(`${A}profile/MembershipPage.tsx`), /max-lg:after:absolute max-lg:after:inset-0 max-lg:after:content-\[''\]/);
  assert.match(read(`${A}profile/PersonalInformation.tsx`), /underline-offset-2 max-lg:inline-flex max-lg:min-h-11 max-lg:items-center/);
  assert.match(read(`${A}MyProfile.tsx`), /text-accent underline max-lg:inline-flex max-lg:min-h-11 max-lg:items-center/);
  for (const f of ['InterviewCalendarCandidate.tsx', 'CallCandidate.tsx']) {
    assert.match(read(`${A}${f}`), /who: 'candidate' \}\} className="h-11 lg:h-9" \/>/);
  }
  // The shared Add to calendar itself is unchanged: the Calendar uses it too.
  assert.doesNotMatch(read('src/components/shared/AddToCalendar.tsx'), /h-11/);
});

test('nothing added carries an em dash', () => {
  const files = [
    ...readdirSync(join(ROOT, 'src/components/admin/kit')).map((f) => `src/components/admin/kit/${f}`),
    `${A}CandidatesManagement.tsx`, `${A}NewJoiners.tsx`, `${A}PhoneCalls.tsx`, `${A}InterviewCalendar.tsx`,
    `${A}ApplicationSettings.tsx`, `${A}FormSettings.tsx`, 'scripts/workspace-kit.test.mjs',
    `${A}EventAttendance.tsx`, `${A}AssociationOnDisplay.tsx`, `${A}EventForms.tsx`, `${A}EventCreate.tsx`, `${A}events/MyEvents.tsx`,
    `${A}MembersManagement.tsx`, `${A}AlumniManagement.tsx`, `${A}InvitesManagement.tsx`, `${A}UserManagement.tsx`,
    `${A}CertificateRegister.tsx`, `${A}ActivityManagement.tsx`, `${A}RolePermissionsTable.tsx`, `${A}CommitmentBoard.tsx`,
    `${A}TimeMachine.tsx`, `${A}SettingsDeclarations.tsx`,
    `${A}FileManagement.tsx`, `${A}FundsPerformances.tsx`, `${A}ReportUpload.tsx`, `${A}DivisionPagesEditor.tsx`, `${A}ResourceManager.tsx`,
    ...readdirSync(join(ROOT, 'src/components/admin/library')).map((f) => `src/components/admin/library/${f}`),
    `${A}archive/ArchiveDetailsPanel.tsx`, `${A}archive/BulkEditDialog.tsx`,
    `${A}career/CareerTemplate.tsx`, `${A}career/CareerLinkedIn.tsx`, `${A}career/brainteasers/ProblemEditor.tsx`,
    `${A}EditorialCalendar.tsx`, `${A}editorial/EditorialItemSheet.tsx`, `${A}AdsRegister.tsx`, `${A}Treasury.tsx`, `${A}MembershipFee.tsx`,
    `${A}BrandDesignSystem.tsx`, `${A}forms/InternalForms.tsx`, `${A}forms/AnswersView.tsx`, `${A}forms/ExportDialog.tsx`, `${A}forms/ResponseSheet.tsx`,
    `${A}ReadingsManagement.tsx`, `${A}PagesVisibilityManagement.tsx`, `${A}TestimonialsManagement.tsx`, `${A}HistoryManagement.tsx`,
    `${A}JoinFaqsManagement.tsx`, `${A}NewsletterManagement.tsx`, `${A}AutoEmails.tsx`, `${A}MobileWorkspaceShell.tsx`,
  ];
  for (const p of files) assert.ok(!read(p).includes(String.fromCharCode(0x2014)), p);
});
