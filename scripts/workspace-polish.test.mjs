// =====================================================================
// THE WORKSPACE, STEP 107: the tour offered first in the help panel and
// drawn so it is easy to follow, People > Members ordered by the events
// attended, the phone's floating dock and its globe.
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
const load = async (rel, name) => {
  const { build } = require('esbuild');
  const outDir = join(ROOT, 'node_modules', '.cache', 'workspace-polish-test');
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, `${name}.mjs`);
  await build({ entryPoints: [join(ROOT, rel)], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'silent' });
  return import(`${pathToFileURL(out).href}?${Date.now()}`);
};

test('the help panel offers the tour first', () => {
  const panel = read('src/components/admin/help/HelpPanel.tsx');
  const tour = panel.indexOf('Start the tour: {shown.title}');
  const purpose = panel.indexOf('What you are looking at');
  assert.ok(tour > 0 && purpose > 0 && tour < purpose, 'before anything there is to read');
  assert.doesNotMatch(panel, /Rather be shown\?/, 'once, at the top');
});

test('the tour is drawn so the eye finds what it describes', () => {
  const tour = read('src/components/admin/help/WorkspaceTour.tsx');
  assert.match(tour, /<path fillRule="evenodd" style=\{\{ fill: 'hsl\(var\(--overlay\) \/ 0\.62\)' \}\} d=\{`M0 0H\$\{vw\}V\$\{vh\}H0Z \$\{roundedRect\(hole, 6\)\}`\} \/>/, 'the dim, with the window cut out');
  assert.doesNotMatch(tour, /200vmax/, 'no shadow thousands of pixels wide');
  assert.match(tour, /boxShadow: '0 0 0 2px hsl\(var\(--accent\)\), 0 0 0 4px hsl\(var\(--background\)\)'/);
  assert.match(tour, /className="ws-tour-pulse pointer-events-none absolute rounded-md"/);
  assert.match(read('src/index.css'), /@media \(prefers-reduced-motion: reduce\) \{\s*\.ws-tour-pulse \{ animation: none; \}/);
  // Phone: a sheet at the foot, the part described kept above it, swipe to move.
  assert.match(tour, /el\.style\.scrollMarginBottom = `\$\{sheetHeightRef\.current \+ SHEET_GAP\}px`;/);
  assert.match(tour, /const underSheet = hole \? hole\.top \+ hole\.height > vh - cardHeight - SHEET_GAP \* 2 : false;/);
  assert.match(tour, /if \(Math\.abs\(dx\) > 56 && Math\.abs\(dx\) > Math\.abs\(dy\) \* 1\.5\) move\(dx < 0 \? 1 : -1\);/);
  // Computer: the card points at it.
  assert.match(tour, /pointer = \{ side: 'left', at:/);
  assert.match(tour, /aria-label="Leave the tour"/);
});

test('People > Members: by role, by surname, or by the events attended', async () => {
  const O = await load('src/lib/members-order.ts', 'order');
  const rank = (r) => ({ president: 0, head: 1, analyst: 2 }[r] ?? 9);
  const rows = [
    { id: 'a', role: 'analyst', first_name: 'Zoe', surname: 'Adams' },
    { id: 'b', role: 'president', first_name: 'Bea', surname: 'Young' },
    { id: 'c', role: 'analyst', first_name: 'Carl', surname: 'Brown' },
    { id: 'd', role: 'head', first_name: 'Dan', surname: 'Clark' },
  ];
  const counts = { a: 3, b: 1, c: 3, d: 0 };
  const ids = (o, c = counts) => O.orderMembers(rows, o, rank, c).map((r) => r.id);
  assert.deepEqual(ids('role'), ['b', 'd', 'a', 'c']);
  assert.deepEqual(ids('surname'), ['a', 'c', 'd', 'b']);
  assert.deepEqual(ids('attended-most'), ['a', 'c', 'b', 'd'], 'equal counts keep the order by role, then surname');
  assert.deepEqual(ids('attended-least'), ['d', 'b', 'a', 'c']);
  assert.deepEqual(ids('attended-most', null), ['b', 'd', 'a', 'c'], 'without the attendance, by role');
  assert.deepEqual(rows.map((r) => r.id), ['a', 'b', 'c', 'd'], 'the list itself is not changed');
  assert.deepEqual(O.MEMBER_ORDERS.filter((o) => o.attendance).map((o) => o.value), ['attended-most', 'attended-least']);
  const page = read('src/components/admin/MembersManagement.tsx');
  assert.match(page, /const orders = MEMBER_ORDERS\.filter\(\(o\) => !o\.attendance \|\| seesAttendance\);/, 'the attendance orders only for the roles that see the attendance');
  assert.match(page, /return orderMembers\(filtered, seesAttendance \? order : \(order === 'surname' \? 'surname' : 'role'\), memberRank, attendance\?\.counts \?\? null\);/);
  assert.match(page, /aria-sort=\{order === 'attended-most' \? 'descending' : order === 'attended-least' \? 'ascending' : 'none'\}/);
  assert.match(read('src/lib/members-order.ts'), /try \{ localStorage\.setItem\(KEY, order\); \} catch/);
});

test('the phone: a floating dock that takes less room, and the globe alone', () => {
  const shell = read('src/components/admin/MobileWorkspaceShell.tsx');
  // Step 112: narrower than the browser's own bar, centred, clear of the browser's toolbar
  // (scripts/step112.test.mjs holds the rest).
  assert.match(shell, /className="ws-dock absolute left-1\/2 z-10 flex -translate-x-1\/2 items-stretch"\s+style=\{\{ height: '3\.5rem', width: 'min\(18\.5rem, calc\(100% - 3rem\)\)', bottom: 'calc\(env\(safe-area-inset-bottom\) \+ 0\.5rem \+ var\(--ws-toolbar, 0px\)\)' \}\}/);
  assert.match(shell, /\['--ws-dock-space' as string\]: bar\.length \? 'calc\(4rem \+ env\(safe-area-inset-bottom\) \+ var\(--ws-toolbar, 0px\)\)' : '0px'/);
  assert.match(shell, /\['--ws-bar-h' as string\]: bar\.length \? '4rem' : '0rem'/, 'the help button stays above it');
  const css = read('src/index.css');
  assert.match(css, /\.ws-dock \{\s*background-color: hsl\(0 0% 100% \/ 0\.62\);\s*border: none;/, 'glass, with no grey border (Step 112)');
  assert.match(css, /html\[data-ws-dock\] #mobile-ws-content\.ws-fab-clear \{ padding-bottom: calc\(5\.5rem \+ var\(--ws-dock-space, 0px\)\) !important; \}/, 'the end of a page scrolls clear of it');
  assert.match(read('src/components/admin/forms/InternalForms.tsx'), /style=\{\{ bottom: 'var\(--ws-dock-space, 0px\)' \}\} role="region" aria-label="Unsaved changes"/, 'a bar fixed to the foot of a page stays above it');
  // Back to website: the globe, no frame, no word, still named for a screen reader.
  const leave = shell.slice(shell.indexOf('data-tour="leave"'), shell.indexOf('</button>', shell.indexOf('data-tour="leave"')));
  assert.match(leave, /aria-label="Back to website"/);
  assert.doesNotMatch(leave, /border|<span>Website<\/span>/);
  assert.match(leave, /<Globe className="h-5 w-5 shrink-0" aria-hidden="true" \/>/);
});
