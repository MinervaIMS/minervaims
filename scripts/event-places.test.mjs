// =====================================================================
// THE NUMBER OF PLACES, FOR ORGANISERS ONLY (Step 105).
// ---------------------------------------------------------------------
// An event with a limited number of places shows the number, the places
// left and how many wait only to its organisers: the roles the access
// matrix lets open Events > Create Event or Events > Attendance, and the
// association's account. Everybody else, on the website and in the
// workspace, is told whether places are limited and whether they are all
// taken. This test fails if the database's list of organisers and the
// matrix disagree, if a page writes the numbers for everybody again, or
// if the guests run into one another on the registration page.
//
//   node --test scripts/event-places.test.mjs
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
const CACHE = join(ROOT, 'node_modules', '.cache', 'event-places-test');
mkdirSync(CACHE, { recursive: true });
const load = async (p, name) => {
  const out = join(CACHE, `${name}.mjs`);
  buildSync({
    entryPoints: [join(ROOT, p)], bundle: true, outfile: out, format: 'esm', platform: 'node',
    alias: { '@': join(ROOT, 'src') }, packages: 'external', jsx: 'automatic',
    // The calendar model imports the client, which reads these on load; nothing is sent.
    define: { 'import.meta.env': JSON.stringify({ DEV: false, VITE_SUPABASE_URL: 'http://localhost:54321', VITE_SUPABASE_PUBLISHABLE_KEY: 'test', VITE_SUPABASE_PROJECT_ID: 'test' }) }, logLevel: 'silent',
  });
  return import(`${pathToFileURL(out).href}?${Date.now()}`);
};

const MIGRATION = 'supabase/migrations/20261109090100_event_places_organisers.sql';
// The stored names an organiser role may carry: the legacy heads of a
// division and the silent advisor are the same roles under older names.
const LEGACY = { head_of_division: ['head_of_equity', 'head_of_investment', 'head_of_macro', 'head_of_portfolio', 'head_of_quant'], advisor: ['silent_advisor'] };

test('the database lists exactly the roles the matrix lets organise events', async () => {
  const { DEFAULT_MATRIX, resolveLevel } = await load('src/lib/access/matrix.ts', 'matrix');
  const organisers = Object.keys(DEFAULT_MATRIX)
    .filter((r) => resolveLevel([r], 'events-create') !== 'none' || resolveLevel([r], 'events-attendance') !== 'none');
  const expected = new Set(organisers.flatMap((r) => [r, ...(LEGACY[r] ?? [])]));
  const sql = read(MIGRATION);
  const fn = sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.sees_event_places'), sql.indexOf('REVOKE EXECUTE ON FUNCTION public.sees_event_places'));
  const listed = new Set([...fn.slice(fn.indexOf('IN (')).matchAll(/'([a-z_]+)'/g)].map((m) => m[1]));
  assert.deepEqual([...listed].sort(), [...expected].sort());
  assert.match(fn, /'as\.minerva@unibocconi\.it'/, 'the association account sees the numbers');
  for (const r of ['analyst', 'senior_analyst', 'team_leader', 'alumni', 'candidate', 'pending']) assert.ok(!listed.has(r), `${r} is not an organiser`);
  // The functions' own copy of the matrix answers the same, for my-events.
  const access = await load('supabase/functions/_shared/access.ts', 'access-fn');
  for (const r of Object.keys(access.MATRIX)) {
    const fnSays = access.allowsAny([r], null, ['events-create', 'events-attendance'], 'view');
    assert.equal(fnSays, organisers.includes(access.normalizeRole(r)) || organisers.includes(r), r);
  }
});

test('event_places gives everybody the state and only an organiser the numbers', () => {
  const sql = read(MIGRATION);
  assert.match(sql, /DROP FUNCTION IF EXISTS public\.event_places\(uuid\);/);
  assert.match(sql, /RETURNS TABLE \(capacity integer, taken integer, waiting integer, is_full boolean\)/);
  for (const col of ['capacity', 'taken', 'waiting']) {
    assert.match(sql, new RegExp(`CASE WHEN who\\.organiser THEN e\\.${col} END`), `${col} only for an organiser`);
  }
  assert.match(sql, /e\.taken >= e\.capacity\s*\n\s*FROM e, who;/, 'the state for everybody');
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.event_places\(uuid\) TO anon, authenticated, service_role;/);
  assert.match(sql, /REVOKE EXECUTE ON FUNCTION public\.sees_event_places\(uuid\) FROM anon;/);
  // Nothing is written by the migration.
  assert.doesNotMatch(sql, /\b(INSERT INTO|UPDATE public\.|DELETE FROM|TRUNCATE)\b/);
});

test('My Events receives the numbers only for an organiser', () => {
  const src = read('supabase/functions/admin-event-reg/index.ts');
  const block = src.slice(src.indexOf("if (action === 'my-events')"), src.indexOf("const { data: hoo }"));
  assert.match(block, /const organiser = allowsAny\(roles, user\.email, \['events-create', 'events-attendance'\], 'view'\);/);
  assert.match(block, /capacity: organiser \? e\.capacity : null,/);
  assert.match(block, /taken: organiser \? regs\.length : null,/);
  assert.match(block, /waiting: organiser \? waits\.length : null,/);
  assert.match(block, /full: e\.capacity !== null && regs\.length >= e\.capacity,/);
});

test('no page writes the number of places for everybody', async () => {
  const { placesLine, regState } = await load('src/components/admin/calendar/calendar-model.tsx', 'calendar-model');
  const member = (full) => ({ full, capacity: null, taken: null, waiting: null });
  assert.equal(placesLine(member(false)), 'Limited places');
  assert.equal(placesLine(member(true)), 'Full');
  assert.equal(placesLine(null), '');
  assert.equal(placesLine({ full: false, capacity: 40, taken: 28, waiting: 0 }), '12 places left');
  assert.equal(placesLine({ full: true, capacity: 40, taken: 40, waiting: 3 }), 'Full \u00b7 3 waiting');
  const ev = { id: 'e', registration_enabled: true, aod_day_id: null, date: '2999-01-01', start_at: null, end_at: null, event_type: 'meeting', interest_closes_at: null };
  assert.equal(regState(ev, new Set(), new Set(), member(true)), 'full');
  assert.equal(regState(ev, new Set(), new Set(), member(false)), 'open');

  const register = read('src/pages/EventRegister.tsx');
  assert.doesNotMatch(register, /places left|places\.capacity|event\.capacity\}/);
  assert.match(register, /const full = !!places\?\.full;/);
  assert.doesNotMatch(read('src/components/events/CompanyVisitInterest.tsx'), /There are \$\{event\.capacity\} places/);
  const mine = read('src/components/admin/events/MyEvents.tsx');
  assert.match(mine, /if \(e\.capacity !== null && e\.taken !== null\) \{/, 'the numbers only where the server sent them');
  assert.doesNotMatch(mine, /\$\{e\.capacity\} places, by selection/);
  const sheet = read('src/components/admin/calendar/ItemDetailSheet.tsx');
  assert.match(sheet, /places && places\.capacity !== null && places\.taken !== null \?/);
  const api = read('src/lib/events-api.ts');
  assert.match(api, /export interface EventPlaces \{ full: boolean; capacity: number \| null; taken: number \| null; waiting: number \| null \}/);
});

test('the registration page gives the moderator and each guest a line of their own', () => {
  const src = read('src/pages/EventRegister.tsx');
  assert.doesNotMatch(src, /event\.guest\.join\(', '\)/);
  assert.match(src, /<span className="font-medium text-foreground">Moderator:<\/span> \{event\.moderator\}/);
  assert.match(src, /<ul className="mt-1 list-disc space-y-1 pl-4">\s*\{guests\.map\(\(g, i\) => <li key=\{i\}>\{g\}<\/li>\)\}/);
  assert.match(read('src/components/alumni/AlumniCallsCarousel.tsx'), /\.join\(' \\u00b7 '\)/);
});
