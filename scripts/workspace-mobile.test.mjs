// =====================================================================
// workspace-mobile.test.mjs: the workspace on a phone (Step 98, Batch 1).
// ---------------------------------------------------------------------
//   node --test scripts/workspace-mobile.test.mjs
//
// Pure checks on the sources, no database and no network:
//   * the bottom bar is built from the reader's own navigation: a member
//     never gets a button their role does not open, and an applicant only
//     the stage pages their application has opened;
//   * the Dashboard and the Calendar are the pages the Step 98 spacing and
//     touch rules leave alone;
//   * the phone rule opens all of My Profile and nothing more than the
//     pages it lists; applicants are no longer sent to a computer;
//   * installing from the workspace installs the workspace, and the site's
//     own manifest is unchanged;
//   * dates are written "15 Oct 2026" and a plain date never moves a day;
//   * the help says what a phone now does, and nothing added carries an
//     em dash.
// =====================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const require = createRequire(import.meta.url);
const { buildSync } = require(join(ROOT, 'node_modules', 'esbuild'));
// Bundled, so the `@/` imports resolve; the icons and React are left to
// node_modules, which is why the bundle is written inside it.
const CACHE = join(ROOT, 'node_modules', '.cache', 'workspace-mobile-test');
mkdirSync(CACHE, { recursive: true });
const load = async (p) => {
  const out = join(CACHE, basename(p).replace(/\.tsx?$/, '.mjs'));
  buildSync({
    entryPoints: [join(ROOT, p)], bundle: true, outfile: out, format: 'esm', platform: 'node',
    alias: { '@': join(ROOT, 'src') }, external: ['lucide-react', 'react'], define: { 'import.meta.env.DEV': 'false' }, logLevel: 'silent',
  });
  return import(`${pathToFileURL(out).href}?${Date.now()}`);
};

const bar = await load('src/lib/mobile-bar.ts');
const nav = await load('src/lib/workspace-nav.ts');
const mobile = await load('src/lib/mobile-policy.ts');
const dates = await load('src/lib/workspace-dates.ts');

const pages = (items) => items.filter((i) => i.kind === 'page').map((i) => i.id);
const navKeys = (sections) => new Set(sections.flatMap((s) => [s.key, ...s.subItems.map((si) => si.key)]));

test('a member\'s bar: Menu, Dashboard, My Events, My Profile, Search, and only what the role opens', () => {
  const everything = nav.filterNav({ can: () => true });
  const full = bar.memberBar(everything);
  assert.deepEqual(full.map((i) => i.label), ['Menu', 'Dashboard', 'My Events', 'My Profile', 'Search']);
  // A role without My Events is not offered it.
  const noEvents = nav.filterNav({ can: (r) => r !== 'events-mine' });
  assert.deepEqual(bar.memberBar(noEvents).map((i) => i.label), ['Menu', 'Dashboard', 'My Profile', 'Search']);
  for (const sections of [everything, noEvents]) {
    const keys = navKeys(sections);
    for (const id of pages(bar.memberBar(sections))) assert.ok(keys.has(id), `${id} is in the reader's navigation`);
  }
});

test('an applicant\'s bar shows only the stage pages their application has opened', () => {
  const cases = [
    [{ invited: false, called: false, offered: false }, ['applications-status', 'my-role', 'applications-faqs']],
    [{ invited: true, called: false, offered: false }, ['applications-status', 'applications-interview', 'my-role', 'applications-faqs']],
    [{ invited: true, called: true, offered: false }, ['applications-status', 'applications-call', 'my-role', 'applications-faqs']],
    [{ invited: true, called: true, offered: true }, ['applications-status', 'applications-offer', 'my-role', 'applications-faqs']],
    [{ invited: false, called: false, offered: true }, ['applications-status', 'applications-offer', 'my-role', 'applications-faqs']],
  ];
  for (const [journey, expected] of cases) {
    const sections = nav.candidateNav(journey);
    const items = bar.applicantBar(sections);
    assert.deepEqual(pages(items), expected, JSON.stringify(journey));
    const keys = navKeys(sections);
    for (const id of pages(items)) assert.ok(keys.has(id), `${id} is open to this applicant`);
    assert.ok(!items.some((i) => i.kind === 'menu' || i.kind === 'search'), 'the applicant bar is pages only');
  }
});

test('the bar marks the page being read', () => {
  const [, dashboard, myEvents, myProfile] = bar.memberBar(nav.filterNav({ can: () => true }));
  assert.ok(bar.isBarItemActive(dashboard, 'dashboard', null));
  assert.ok(bar.isBarItemActive(myEvents, 'events', 'events-mine'));
  assert.ok(!bar.isBarItemActive(myEvents, 'events', 'events-attendance'));
  assert.ok(bar.isBarItemActive(myProfile, 'my-role', 'my-membership'), 'My Profile covers its three pages');
});

test('the Dashboard and the Calendar are left as they are', () => {
  assert.ok(bar.isProtectedPage('dashboard'));
  assert.ok(bar.isProtectedPage('calendar'));
  for (const k of ['my-role', 'events', 'people', 'applications', null]) assert.ok(!bar.isProtectedPage(k), String(k));
  // The spacing and touch classes are only ever given behind that test.
  const shell = read('src/components/admin/MobileWorkspaceShell.tsx');
  assert.match(shell, /protectedPage \? '' : 'ws-touch ws-fab-clear'/);
  const workspace = read('src/pages/MinervaWorkspace.tsx');
  assert.match(workspace, /isProtectedPage\(activeSectionKey\) \? '' : 'ws-fab-clear'/);
  const css = read('src/index.css');
  assert.match(css, /\.ws-touch button\[role='checkbox'\]::after/);
  assert.match(css, /\.ws-touch button\[role='radio'\]::after/);
});

test('on a phone the applicant\'s actions and the page chips are 44 px tall, on a computer as before', () => {
  assert.match(read('src/components/admin/MobileWorkspaceShell.tsx'), /whitespace-nowrap px-3 h-11 border/);
  for (const [p, n] of [
    ['src/components/admin/ApplicationStatus.tsx', 5],
    ['src/components/admin/InterviewCalendarCandidate.tsx', 2],
    ['src/components/admin/CallCandidate.tsx', 2],
    ['src/components/admin/CandidateOffer.tsx', 6],
    ['src/components/admin/CandidateFaqs.tsx', 2],
  ]) {
    const found = read(p).match(/h-11 lg:h-(9|10)\b/g) ?? [];
    assert.equal(found.length, n, p);
  }
});

test('on a phone: all of My Profile works in full, other member pages wait their turn', () => {
  for (const k of ['my-role', 'my-membership', 'my-commitment', 'events-attendance', 'career-gpa', 'career-brainteasers']) {
    assert.equal(mobile.mobilePolicyFor(k), 'full', k);
  }
  for (const k of ['people-members', 'settings-users', 'calendar', 'dashboard', null]) {
    assert.equal(mobile.mobilePolicyFor(k), 'view', String(k));
  }
});

test('applicants are no longer sent to a computer, and their pages carry no read-only ribbon', () => {
  const workspace = read('src/pages/MinervaWorkspace.tsx');
  assert.doesNotMatch(workspace, /available on desktop/);
  assert.doesNotMatch(workspace, /!isDesktop && isCandidate/);
  assert.match(workspace, /applicant=\{isCandidate\}/);
  const shell = read('src/components/admin/MobileWorkspaceShell.tsx');
  assert.match(shell, /!applicant && !ribbonDismissed && mobilePolicyFor\(activeSubKey\) !== 'full'/);
});

test('installing from the workspace installs the workspace; the site\'s manifest is unchanged', () => {
  const m = JSON.parse(read('public/workspace-manifest.json'));
  assert.equal(m.id, '/workspace');
  assert.equal(m.start_url, '/workspace');
  assert.equal(m.scope, '/');
  assert.equal(m.display, 'standalone');
  for (const icon of m.icons) assert.ok(existsSync(join(ROOT, 'public', icon.src)), icon.src);
  assert.ok(m.icons.some((i) => i.purpose === 'maskable' && i.sizes === '512x512'));
  assert.ok(m.icons.some((i) => i.purpose === 'maskable' && i.sizes === '192x192'));
  assert.deepEqual(m.shortcuts.map((s) => s.url), ['/workspace/calendar', '/workspace/events/attendance', '/workspace/my-profile']);
  const site = JSON.parse(read('public/manifest.json'));
  assert.equal(site.start_url, '/');
  assert.match(read('index.html'), /<link rel="manifest" href="\/manifest.json" \/>/);
  const hook = read('src/hooks/use-workspace-manifest.ts');
  assert.match(hook, /'\/workspace-manifest.json'/);
  assert.doesNotMatch(hook, /serviceWorker/);
});

test('dates read "15 Oct 2026", and a plain date never moves a day', () => {
  assert.equal(dates.dayMonthYear('2026-10-15'), '15 Oct 2026');
  assert.equal(dates.dayMonthYear('2026-01-01'), '1 Jan 2026');
  assert.equal(dates.dayMonthYear('2026-10-15T23:30:00Z'), '16 Oct 2026', 'a moment is written in Rome\'s time');
  assert.equal(dates.dayMonthYear(null), '');
  assert.equal(dates.dayMonthYear('not a date'), '');
  for (const p of ['src/components/admin/AdsRegister.tsx', 'src/components/admin/Treasury.tsx']) {
    assert.doesNotMatch(read(p), /toLocaleDateString\(\)/, p);
  }
});

test('the help and Settings, Mobile view say what a phone now does', () => {
  const guide = read('src/lib/workspace-guide.ts');
  assert.doesNotMatch(guide, /On a phone these details are read only/);
  assert.doesNotMatch(guide, /listed without pictures/);
  assert.doesNotMatch(guide, /are still opened on a computer/);
  assert.match(guide, /id: 'on-a-phone', title: 'On a phone', body: 'Your whole application works on a phone/);
  const view = read('src/components/admin/MobileViewTable.tsx');
  assert.doesNotMatch(view, /Nothing can be edited/);
  assert.doesNotMatch(view, /asked to use a computer/);
  assert.doesNotMatch(read('src/components/admin/profile/PersonalInformation.tsx'), /listed without pictures/);
});

test('nothing added carries an em dash', () => {
  for (const p of [
    'src/lib/mobile-bar.ts', 'src/lib/workspace-dates.ts', 'src/hooks/use-workspace-manifest.ts',
    'src/components/admin/MobileWorkspaceShell.tsx', 'src/components/admin/MobileViewTable.tsx',
    'src/components/admin/ApplicationStatus.tsx', 'src/components/admin/profile/PersonalInformation.tsx',
    'public/workspace-manifest.json', 'scripts/workspace-mobile.test.mjs',
  ]) {
    assert.ok(!read(p).includes(String.fromCharCode(0x2014)), p);
  }
});
