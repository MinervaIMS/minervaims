// =====================================================================
// workspace-kit.test.mjs: the Step 98 kit and the Recruiting pages built
// with it (Batch 2).
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
  assert.deepEqual(kit.sort(), ['BottomSheet.tsx', 'Filters.tsx', 'MoreMenu.tsx', 'RecommendationGroup.tsx', 'RecordCard.tsx', 'Register.tsx', 'touch-calendar.ts']);
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

test('nothing added carries an em dash', () => {
  const files = [
    ...readdirSync(join(ROOT, 'src/components/admin/kit')).map((f) => `src/components/admin/kit/${f}`),
    `${A}CandidatesManagement.tsx`, `${A}NewJoiners.tsx`, `${A}PhoneCalls.tsx`, `${A}InterviewCalendar.tsx`,
    `${A}ApplicationSettings.tsx`, `${A}FormSettings.tsx`, 'scripts/workspace-kit.test.mjs',
  ];
  for (const p of files) assert.ok(!read(p).includes(String.fromCharCode(0x2014)), p);
});
