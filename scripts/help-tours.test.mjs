// =====================================================================
// THE GUIDED TOURS AND THE HELP THAT DOES NOT GET IN THE WAY (Step 106A).
// ---------------------------------------------------------------------
// A tour points at the real workspace, so its words name places that
// must exist. The help panel sits beside the page, so the page must stay
// in use while it is open. This test fails if:
//   * a tour points at a mark no page carries, or opens a page the
//     workspace does not have, or is offered to somebody who cannot
//     follow it;
//   * a role is shown a part of the workspace it does not work in, a
//     page it cannot open or a change it cannot make, or is not given the
//     read-only wording where it can only read;
//   * the tour is drawn as a window the 90% rule would shrink;
//   * the help panel covers the page with a sheet again, or stops
//     closing with Esc;
//   * How To Use loses its tours, its emails explanation or its folds.
//
//   node --test scripts/help-tours.test.mjs
// =====================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const require = createRequire(import.meta.url);
const { buildSync } = require(join(ROOT, 'node_modules', 'esbuild'));
const CACHE = join(ROOT, 'node_modules', '.cache', 'help-tours-test');
mkdirSync(CACHE, { recursive: true });
const load = async (p, name) => {
  const out = join(CACHE, `${name}.mjs`);
  buildSync({
    entryPoints: [join(ROOT, p)], bundle: true, outfile: out, format: 'esm', platform: 'node', logLevel: 'silent',
    alias: { '@': join(ROOT, 'src') }, packages: 'external', jsx: 'automatic',
    define: { 'import.meta.env': JSON.stringify({ DEV: false }) },
  });
  return import(`${pathToFileURL(out).href}?${Date.now()}`);
};
const walk = (dir) => readdirSync(join(ROOT, dir)).flatMap((f) => {
  const p = `${dir}/${f}`;
  return statSync(join(ROOT, p)).isDirectory() ? walk(p) : (/\.(ts|tsx)$/.test(f) ? [p] : []);
});

// Every role the matrix knows, as a tour reader: the same `canView` and
// `canEdit` the workspace gives a signed-in member (on a computer).
const ROLES = ['president', 'vice_president', 'head_of_asset_management', 'head_of_division', 'portfolio_manager', 'team_leader', 'senior_analyst', 'analyst', 'head_of_media', 'media_analyst', 'operations_analyst', 'head_of_operations', 'advisor', 'alumni'];
const readerFor = (matrix, role) => ({
  canView: (k) => matrix.atLeast(matrix.resolveLevel([role], k), 'view'),
  canEdit: (k) => matrix.atLeast(matrix.resolveLevel([role], k), 'edit'),
  isCandidate: false,
});
const offered = (T, reader) => T.toursFor(reader).map((t) => t.id);
const stepsOf = (T, reader, id) => T.tourFor(id, reader)?.steps.map((s) => s.id);

test('every tour is well formed and says what it is', async () => {
  const { TOURS } = await load('src/lib/workspace-tours.ts', 'tours');
  assert.deepEqual(TOURS.map((t) => t.id), ['basics', 'mine', 'registers', 'people', 'reports', 'recruiting', 'events', 'media', 'operations', 'website', 'emails', 'settings', 'applicant']);
  const dash = String.fromCharCode(0x2014);
  for (const t of TOURS) {
    assert.ok(t.title && t.summary && !t.summary.includes(dash), t.id);
    assert.ok(['start', 'role'].includes(t.kind), `${t.id}: a starter tour or the tour of an area`);
    assert.ok(t.kind === 'start' || (t.pages && t.pages.length > 0), `${t.id}: an area tour names the pages it is about`);
    assert.ok(t.steps.length >= 2 && t.steps.length <= 9, `${t.id}: a tour is short`);
    assert.equal(new Set(t.steps.map((s) => s.id)).size, t.steps.length, `${t.id}: step ids are unique`);
    for (const s of t.steps) {
      for (const text of [s.body, s.readBody].filter((x) => x !== undefined)) {
        assert.ok(s.title.length > 3 && text.length > 40, `${t.id}/${s.id} says something`);
        assert.ok(text.length <= 420, `${t.id}/${s.id}: a step is read in a breath`);
        assert.equal((s.title + text).includes(dash), false, `${t.id}/${s.id}: no long dash`);
      }
      if (s.readBody || s.needs) assert.ok(s.page, `${t.id}/${s.id}: a level is a level on a page`);
      // The page a step opens is the page it is fitted on, so the tour and the
      // navigation can never disagree about whether this reader may open it.
      if (s.page && s.go) assert.equal(s.go.sub ?? s.go.section, s.page, `${t.id}/${s.id} opens the page it is about`);
    }
  }
});

test('a tour points only at marks a page carries, and opens only pages the workspace has', async () => {
  const { TOURS } = await load('src/lib/workspace-tours.ts', 'tours');
  const nav = await load('src/lib/workspace-nav.ts', 'nav');
  const sources = walk('src').filter((p) => !p.endsWith('workspace-tours.ts')).map(read).join('\n');
  // Each page's name in its section's list carries `page-<its key>`, on a computer and on a phone.
  assert.match(read('src/pages/MinervaWorkspace.tsx'), /data-tour=\{`page-\$\{si\.key\}`\}/);
  assert.match(read('src/components/admin/MobileWorkspaceShell.tsx'), /data-tour=\{`page-\$\{si\.key\}`\}/);
  for (const t of TOURS) {
    // An applicant's workspace has its own navigation.
    const sections = t.audience === 'applicants' ? nav.CANDIDATE_NAV : nav.NAV;
    const subKeys = new Set(sections.flatMap((x) => x.subItems.map((si) => si.key)));
    for (const s of t.steps) {
      for (const sel of [s.target, s.mobileTarget].filter((x) => typeof x === 'string')) {
        for (const m of sel.matchAll(/\[data-tour="([a-z-]+)"\]/g)) {
          if (m[1].startsWith('page-')) {
            assert.ok(subKeys.has(m[1].slice(5)), `${t.id}/${s.id} points at ${m[1]}, which is no page of the navigation`);
          } else {
            assert.ok(sources.includes(`data-tour="${m[1]}"`), `${t.id}/${s.id} points at data-tour="${m[1]}", which no page carries`);
          }
        }
        if (sel.includes('.ws-help-fab')) assert.match(read('src/components/admin/help/HelpSystem.tsx'), /className="ws-help-fab/);
      }
      if (s.go) {
        const section = sections.find((x) => x.key === s.go.section);
        assert.ok(section, `${t.id}/${s.id} opens section ${s.go.section}, which is not in the navigation`);
        if (s.go.sub) assert.ok(section.subItems.some((si) => si.key === s.go.sub), `${t.id}/${s.id} opens page ${s.go.sub}, which ${s.go.section} does not have`);
      }
    }
  }
});

test('the tours follow the role: each role is shown the parts of the workspace it works in, and only those', async () => {
  const T = await load('src/lib/workspace-tours.ts', 'tours');
  const matrix = await load('src/lib/access/matrix.ts', 'matrix');
  const nav = await load('src/lib/workspace-nav.ts', 'nav');
  // Every page a tour names is a page of the matrix.
  for (const t of T.TOURS) {
    for (const k of [...(t.pages ?? []), ...t.steps.map((s) => s.page).filter(Boolean)]) {
      const known = t.audience === 'applicants' ? k in matrix.CANDIDATE_RESOURCES : matrix.atLeast(matrix.resolveLevel(['president'], k), 'view');
      assert.ok(known, `${t.id} names ${k}, which is not a page`);
    }
  }
  for (const role of ROLES) {
    const reader = readerFor(matrix, role);
    const perms = { can: (k, lvl = 'view') => matrix.atLeast(matrix.resolveLevel([role], k), lvl) };
    const visible = nav.filterNav(perms);
    for (const t of T.toursFor(reader)) {
      assert.equal(t.audience, 'members', `${role}: a member is never given the applicants' tour`);
      if (t.kind === 'role') assert.ok(t.steps.some((s) => s.page), `${role}/${t.id}: an area tour shows the area`);
      for (const s of t.steps) {
        if (s.page) assert.ok(reader.canView(s.page), `${role}/${t.id}/${s.id}: a page this role cannot open`);
        if (s.needs === 'edit') assert.ok(reader.canEdit(s.page), `${role}/${t.id}/${s.id}: a change this role cannot make`);
        const written = T.tourById(t.id).steps.find((x) => x.id === s.id);
        if (written.readBody && !reader.canEdit(s.page)) assert.equal(s.body, written.readBody, `${role}/${t.id}/${s.id}: read-only wording for a reader`);
        if (written.readBody && reader.canEdit(s.page)) assert.equal(s.body, written.body, `${role}/${t.id}/${s.id}: the editor's wording`);
        // The page it opens is one this role's navigation offers.
        if (s.go?.sub) assert.ok(visible.some((x) => x.key === s.go.section && x.subItems.some((si) => si.key === s.go.sub)), `${role}/${t.id}/${s.id} opens ${s.go.sub}, which ${role}'s navigation does not offer`);
      }
    }
    // An area tour is offered exactly when the role opens one of its pages.
    for (const t of T.TOURS.filter((x) => x.kind === 'role')) {
      const can = t.offerTo === 'editors' ? reader.canEdit : reader.canView;
      if (!t.pages.some((k) => can(k))) assert.equal(T.tourFor(t.id, reader), undefined, `${role} is not offered ${t.id}`);
    }
  }
  // What some roles are given, spelled out.
  const r = (role) => readerFor(matrix, role);
  assert.deepEqual(offered(T, r('president')), T.TOURS.filter((t) => t.audience === 'members').map((t) => t.id), 'the President is shown everything');
  for (const t of T.TOURS.filter((x) => x.audience === 'members')) assert.equal(T.tourFor(t.id, r('president')).steps.length, t.steps.length, `the President sees every step of ${t.id}`);
  assert.deepEqual(offered(T, r('analyst')), ['basics', 'mine', 'registers', 'people', 'reports']);
  assert.deepEqual(stepsOf(T, r('analyst'), 'reports'), ['archive', 'templates'], 'an analyst reads the archive and the templates, and uploads nothing');
  assert.deepEqual(offered(T, r('alumni')), ['basics', 'mine']);
  assert.equal(stepsOf(T, r('alumni'), 'mine').includes('events'), false, 'an alumnus has no My Events');
  assert.deepEqual(offered(T, r('head_of_media')), ['basics', 'mine', 'registers', 'people', 'recruiting', 'events', 'media', 'operations']);
  assert.deepEqual(stepsOf(T, r('head_of_media'), 'operations'), ['external', 'docs']);
  assert.deepEqual(stepsOf(T, r('operations_analyst'), 'operations'), ['fee', 'forms']);
  assert.deepEqual(stepsOf(T, r('head_of_division'), 'recruiting'), ['screening', 'interviews', 'offers', 'form', 'candidate-side']);
  const advisor = r('advisor');
  assert.equal(offered(T, advisor).includes('settings'), false, 'Settings is closed to advisors');
  assert.equal(offered(T, advisor).includes('website'), false, 'nothing on the website is the advisor\'s to change');
  for (const t of T.toursFor(advisor)) assert.equal(t.steps.some((s) => s.needs === 'edit'), false, `advisor/${t.id}: read-only, so no step about changing anything`);
  // An applicant is offered the applicants' tour and no other.
  const applicant = { canView: (k) => k in matrix.CANDIDATE_RESOURCES, canEdit: () => false, isCandidate: true };
  assert.deepEqual(offered(T, applicant), ['applicant']);
  assert.equal(T.tourById('nope'), undefined);
  assert.equal(T.tourFor('settings', r('analyst')), undefined, 'a tour not offered cannot be started either');
});

test('a step knows where to point, and the help suggests the tour of the page it is on', async () => {
  const T = await load('src/lib/workspace-tours.ts', 'tours');
  const { stepTarget, stepTargets } = T;
  assert.equal(stepTarget({ id: 'a', title: '', body: '', target: '.x' }, false), '.x');
  assert.equal(stepTarget({ id: 'a', title: '', body: '', target: '.x' }, true), '.x', 'the same place on a phone unless said otherwise');
  assert.equal(stepTarget({ id: 'a', title: '', body: '', target: '.x', mobileTarget: '.y' }, true), '.y');
  assert.equal(stepTarget({ id: 'a', title: '', body: '', target: '.x', mobileTarget: null }, true), null, 'a card in the middle');
  assert.equal(stepTarget({ id: 'a', title: '', body: '' }, false), null);
  // A page's name may be folded away on a computer: the line naming where you are stands in.
  assert.deepEqual(stepTargets({ id: 'a', title: '', body: '', target: '[data-tour="page-x"]', go: { section: 's', sub: 'x' } }, false), ['[data-tour="page-x"]', '[data-tour="place"]']);
  assert.deepEqual(stepTargets({ id: 'a', title: '', body: '', target: '[data-tour="page-x"]' }, false), ['[data-tour="page-x"]'], 'a stage an applicant has not reached is not stood in for');
  const matrix = await load('src/lib/access/matrix.ts', 'matrix');
  const tours = T.toursFor(readerFor(matrix, 'head_of_operations'));
  assert.equal(T.tourForPage(tours, 'ops-treasury').id, 'operations');
  assert.equal(T.tourForPage(tours, 'applications-screening').id, 'recruiting');
  assert.equal(T.tourForPage(tours, 'dashboard').id, 'basics');
  assert.equal(T.tourForPage(tours, null).id, 'basics');
});

test('the tour is drawn in the page\'s own pixels, and leaves when asked', () => {
  const tour = read('src/components/admin/help/WorkspaceTour.tsx');
  // A plain layer in <body>: a role="dialog" there would be shrunk by the 90% rule.
  assert.match(tour, /<div data-ws-tour data-ro className="fixed inset-0 z-\[120\] font-body">/);
  assert.doesNotMatch(tour, /<div data-ws-tour[^>]*role=/);
  assert.match(tour, /document\.body,\s*\);/, 'outside the workspace frame');
  assert.match(tour, /if \(e\.key === 'Escape'\) \{ e\.preventDefault\(\); e\.stopPropagation\(\); finish\(false\); \}/);
  assert.match(tour, /aria-label="Leave the tour"/);
  assert.match(tour, /prefers-reduced-motion: reduce/);
  // A step whose place is not there is dropped, in the direction of travel,
  // and leaves the count, so the reader is never told of a step they skip.
  assert.match(tour, /const next = j < 0 \? 0 : kept\.findIndex\(\(s\) => s\.id === steps\[j\]\.id\);/);
  assert.match(tour, /if \(tries > \(step\.go \? 16 : 3\)\)/);
  // A place inside a folded panel is not a place: the highlight would land on what is under it.
  assert.match(tour, /if \(cs\.overflowX !== 'visible' && ar\.width <= 4\) return false;/);
  // Opening a page for a step unfolds its section's list as the rail does.
  assert.match(read('src/pages/MinervaWorkspace.tsx'), /setSubmenuOpen\(target\.subItems\.length > 1\);\s+goTo\(target\.key, sub\);/);
  // A card still finding its place cannot be pressed.
  assert.match(tour, /settled \? 'opacity-100' : 'pointer-events-none opacity-0'/);
  assert.match(tour, /const steps = useMemo\(\(\) => tour\.steps\.filter\(\(s\) => !skipped\.has\(s\.id\)\), \[tour, skipped\]\);/);
  // The host is mounted by both shells and loads the tour only when one starts.
  const host = read('src/components/admin/help/TourHost.tsx');
  assert.match(host, /const WorkspaceTour = lazy\(\(\) => import\('\.\/WorkspaceTour'\)\);/);
  // Fitted to the signed-in reader, from the access the pages use.
  assert.match(host, /const access = useAccess\(\);/);
  assert.match(host, /tourFor\(tourId, access\)/);
  assert.match(read('src/pages/MinervaWorkspace.tsx'), /<TourHost \/>/);
  assert.match(read('src/components/admin/MobileWorkspaceShell.tsx'), /<TourHost \/>/);
});

test('the workspace\'s own windows stay usable on a page the reader can only read', () => {
  // ReadOnlyRegion greys out every button in the page AND in every open
  // dialog. The search, the tour and the profile prompt are dialogs that
  // belong to the workspace, open over any page and edit nothing of it.
  const guard = read('src/components/admin/ReadOnlyRegion.tsx');
  assert.match(guard, /'\[data-ro\]',/);
  assert.match(guard, /if \(el\.matches\(KEEPS_WORKING\) \|\| el\.closest\(KEEPS_WORKING\)\) return;/);
  assert.match(read('src/components/admin/help/WorkspaceTour.tsx'), /<div data-ws-tour data-ro /);
  assert.match(read('src/components/admin/WorkspaceSearch.tsx'), /data-ro\s+role="dialog"\s+aria-modal="true"\s+aria-label="Search the workspace"/);
  assert.match(read('src/components/admin/ContactPrompt.tsx'), /<DialogContent className="max-w-md" data-ro>/);
});

test('the help panel sits beside the page: no sheet over it, Esc closes it, the page makes room', () => {
  const panel = read('src/components/admin/help/HelpPanel.tsx');
  assert.doesNotMatch(panel, /z-\[55\]/, 'no invisible sheet between the reader and the page');
  assert.doesNotMatch(panel, /onClick=\{closeHelp\} aria-hidden/, 'a click on the page is the page\'s, not the help\'s');
  assert.match(panel, /root\.setAttribute\('data-help-open', ''\);/);
  assert.match(panel, /if \(e\.key !== 'Escape' \|\| e\.defaultPrevented\) return;/);
  assert.match(panel, /root\.removeAttribute\('data-help-open'\);/);
  const css = read('src/index.css');
  assert.match(css, /@media \(min-width: 1024px\) \{\s*#ws-content \{ transition: margin-right 200ms ease-out; \}\s*html\[data-help-open\] #ws-content \{ margin-right: 380px; \}/);
  assert.match(panel, /lg:max-w-\[380px\]/, 'the room made is the panel\'s width');
  // Readable: topics fold, the long description folds, the tour is offered.
  assert.match(panel, /<details\s+key=\{t\.id\}\s+id=\{`help-\$\{t\.id\}`\}/);
  assert.match(panel, /More about this page/);
  assert.match(panel, /const shown = tourForPage\(tours, g\?\.key\);/);
  assert.match(panel, /Start the tour: \{shown\.title\}/);
});

test('How To Use leads with the tours and the emails, and folds the reference', async () => {
  const page = read('src/components/admin/HowToUse.tsx');
  assert.match(page, /const tours = useMemo\(\(\) => toursFor\(access\), \[access\]\);/);
  // The starter tours, then the tours of the reader's own areas.
  assert.match(page, /title: 'Start here'/);
  assert.match(page, /title: 'For your role'/);
  assert.ok(page.indexOf('id="htu-tours"') < page.indexOf('id="htu-emails"'), 'tours first');
  assert.ok(page.indexOf('id="htu-emails"') < page.indexOf('<Fold title="How the workspace works"'), 'then the emails, then the reference');
  for (const title of ['How the workspace works', 'The workspace at a glance', 'Recent improvements', 'Common tasks', 'When something looks wrong', 'Glossary']) {
    assert.match(page, new RegExp(`<Fold title="${title}"`), title);
  }
  assert.match(page, /<Fold key=\{sec\.section\} title=\{sec\.section\}/);
  // The emails explanation is for everybody, in six points, and names the right page.
  const { HOW_IT_WORKS } = await load('src/lib/workspace-manual.ts', 'manual');
  const emails = HOW_IT_WORKS.find((c) => c.id === 'emails');
  assert.equal(emails.title, 'How emails are sent');
  assert.equal(emails.requires, undefined, 'every member is told how the emails they receive are sent');
  assert.equal(emails.body.length, 6);
  assert.match(emails.body.join(' '), /Website, Automatic Emails/);
  for (const p of ['src/lib/workspace-manual.ts', 'src/lib/workspace-guide.ts']) {
    assert.doesNotMatch(read(p), /Operations, Automatic emails/, `${p}: the page is in Website`);
  }
  // The help for How To Use says what is on it now.
  const guide = read('src/lib/workspace-guide.ts');
  for (const id of ['tours', 'emails', 'folds', 'help-tools']) assert.match(guide, new RegExp(`\\{ id: '${id}', title: '`));
});
