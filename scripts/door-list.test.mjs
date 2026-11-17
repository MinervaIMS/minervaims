// =====================================================================
// THE DOOR LIST TO PRINT (Step 106D).
// ---------------------------------------------------------------------
// Events > Attendance, "PDF" beside "CSV": everybody registered for the
// event, alphabetical by surname, with a box to tick, on the Society's
// letterhead, printed before the doors open in case the connection, the
// server or the phones fail. This test fails if:
//   * the order stops being by surname (with "De Luca", "Van der Berg"
//     kept whole, a member's surname taken from the register, and names
//     that start with no Latin letter filed last);
//   * the function stops checking who may open Attendance, or starts
//     writing anything, or the sheet starts printing addresses or tickets;
//   * the button leaves the page, stops working for read-only roles, or
//     the download stops being recorded in Activity tracking.
//
//   node --test scripts/door-list.test.mjs
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
const CACHE = join(ROOT, 'node_modules', '.cache', 'door-list-test');
mkdirSync(CACHE, { recursive: true });
const load = async (p, name) => {
  const out = join(CACHE, `${name}.mjs`);
  buildSync({ entryPoints: [join(ROOT, p)], bundle: true, outfile: out, format: 'esm', platform: 'node', logLevel: 'silent' });
  return import(`${pathToFileURL(out).href}?${Date.now()}`);
};
const SHEET = 'supabase/functions/event-door-list/sheet.ts';

test('a surname is split from the name as a register reads it', async () => {
  const { splitName } = await load(SHEET, 'sheet-split');
  const cases = [
    ['Mario Rossi', 'Mario', 'Rossi'],
    ['Anna Maria Rossi', 'Anna Maria', 'Rossi'],
    ['Maria De Luca', 'Maria', 'De Luca'],
    ['Gian Luca Di Stefano', 'Gian Luca', 'Di Stefano'],
    ['Hans Van der Berg', 'Hans', 'Van der Berg'],
    ['Rosa La Rosa', 'Rosa', 'La Rosa'],
    ["Luca D'Amico", 'Luca', "D'Amico"],
    ['  Giulia   Bianchi ', 'Giulia', 'Bianchi'],
    ['Cher', '', 'Cher'],
    ['De Luca', 'De', 'Luca'],
  ];
  for (const [full, given, surname] of cases) assert.deepEqual(splitName(full), { given, surname }, full);
});

test('the list is alphabetical by surname, members by their register name, unprintable names last', async () => {
  const { doorRows } = await load(SHEET, 'sheet-rows');
  const regs = [
    { id: 'a', name: 'Zoe Abate', attended: false, checked_in_at: null },
    { id: 'b', name: 'M. Rossi', email: 'mario@studbocconi.it', attended: true, checked_in_at: '2026-11-21T17:42:00Z' },
    { id: 'c', name: 'Élodie Barzaghi', attended: false, checked_in_at: null, programme: 'MSc in Finance' },
    { id: 'd', name: '李 小龍', email: 'li@example.com', attended: false, checked_in_at: null },
    { id: 'e', name: 'Maria De Luca', attended: false, checked_in_at: null, is_bocconi: true },
    { id: 'f', name: 'anna bianchi', attended: false, checked_in_at: null },
  ];
  const memberOf = new Map([['b', 'm1']]);
  const members = new Map([['m1', { id: 'm1', first_name: 'Mario', surname: 'Rossi', division: 'equity' }]]);
  const rows = doorRows(regs, memberOf, members, (k) => (k === 'equity' ? 'Equity Research' : 'No division stated'));
  assert.deepEqual(rows.map((r) => r.surname), ['Abate', 'Barzaghi', 'bianchi', 'De Luca', 'Rossi', '小龍'], 'by surname, accents and case ignored, "#" last');
  assert.deepEqual(rows.map((r) => r.n), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(rows.map((r) => r.letter), ['A', 'B', 'B', 'D', 'R', '#']);
  const rossi = rows.find((r) => r.surname === 'Rossi');
  assert.equal(rossi.given, 'Mario', 'a member is printed with the register\'s name, not what they typed');
  assert.equal(rossi.kind, 'Member, Equity Research');
  assert.equal(rossi.attended, true);
  assert.equal(rossi.checkedInAt, '2026-11-21T17:42:00Z');
  assert.equal(rows.find((r) => r.surname === 'Barzaghi').kind, 'Guest, MSc in Finance');
  assert.equal(rows.find((r) => r.surname === 'De Luca').kind, 'Guest, Bocconi');
  assert.equal(rows.find((r) => r.surname === '小龍').fallback, 'li@example.com', 'the address stands in only for a name the sheet cannot print');
});

test('the file is named after the day and the event, safely', async () => {
  const { doorListFileName } = await load(SHEET, 'sheet-name');
  assert.equal(doorListFileName('Winter Aperitivo', '21 November 2026'), 'MIMS Door list 21 November 2026 Winter Aperitivo.pdf');
  assert.equal(doorListFileName('Q&A: "Markets" / Careers?', '1 December 2026'), 'MIMS Door list 1 December 2026 Q&A Markets Careers.pdf');
});

test('the function checks who may open Attendance, writes nothing and prints no address or ticket', () => {
  const fn = read('supabase/functions/event-door-list/index.ts');
  assert.match(fn, /allows\(roles, user\.email, 'events-attendance', 'view'\)/, 'the roles that can open Attendance, as the CSV');
  for (const verb of ['.insert(', '.update(', '.upsert(', '.delete(']) assert.ok(!fn.includes(verb), `never ${verb}`);
  assert.ok(!/checkin_token|cancel_token/.test(fn), 'tickets never read');
  assert.match(fn, /audited\('event-door-list'/, 'the download is recorded');
  const pdf = read('supabase/functions/event-door-list/pdf.ts');
  assert.match(pdf, /from '\.\.\/_shared\/letterhead\.ts'/, 'the letterhead, from _shared');
  assert.match(pdf, /const A4: \[number, number\] = \[595\.28, 841\.89\]/);
  assert.match(pdf, /'Door list'/);
  assert.match(pdf, /Walk-ins/);
  assert.match(pdf, /destroy once attendance is entered/);
  assert.match(pdf, /r\.fallback/, 'an address only where a name cannot be printed');
  assert.ok(!/—/.test(pdf + fn + read(SHEET)), 'no em dash');
  assert.match(read('supabase/config.toml'), /\[functions\.event-door-list\]\s*\n\s*verify_jwt = false/);
});

test('the function can be deployed: it imports only its own folder, _shared and packages', () => {
  for (const f of ['index.ts', 'pdf.ts', 'sheet.ts']) {
    const src = read(`supabase/functions/event-door-list/${f}`);
    for (const m of src.matchAll(/(?:^|\n)\s*import[^'"]*['"]([^'"]+)['"]/g)) {
      const from = m[1];
      const ok = from.startsWith('./') || from.startsWith('../_shared/') || from.startsWith('npm:') || from.startsWith('https://esm.sh/');
      assert.ok(ok, `${f} imports ${from}: a function is deployed with its own folder and _shared only`);
    }
  }
});

test('the shared letterhead is the certificate\'s, value for value', async () => {
  const mine = await load('supabase/functions/_shared/letterhead.ts', 'letterhead');
  const cert = await load('supabase/functions/membership-certificate/assets.ts', 'certificate-assets');
  for (const k of ['GARAMOND_REGULAR', 'GARAMOND_MEDIUM', 'CARLITO_REGULAR', 'CARLITO_BOLD', 'SEAL_PNG']) {
    assert.ok(mine[k] && mine[k].length > 1000, `${k} is there`);
    assert.equal(mine[k], cert[k], `${k} is the same as the certificate's`);
  }
});

test('the PDF button sits beside the CSV, for every role that can open the page, and is recorded', () => {
  const page = read('src/components/admin/EventAttendance.tsx');
  const csv = page.indexOf('onClick={exportCsv}');
  const pdf = page.indexOf('onClick={printDoorList}');
  assert.ok(csv > 0 && pdf > csv && pdf - csv < 900, 'next to the CSV');
  assert.match(page.slice(csv, pdf + 400), /data-ro[\s\S]*aria-label="Download the door list to print \(PDF\)"/, 'usable on a read-only page, like the CSV');
  assert.match(page, /disabled=\{!eventId \|\| printingList\}/, 'one request at a time');
  assert.match(read('src/lib/events-api.ts'), /export async function downloadDoorListPdf\(session: Session \| null, eventId: string\)/);
  const reg = read('supabase/functions/_shared/activity-registry.ts');
  assert.match(reg, /'event-door-list': \{ section: 'Events', subsection: 'Attendance' \}/);
  assert.match(reg, /'event-door-list:pdf': 'download'/);
  assert.match(reg, /'src\/lib\/events-api\.ts': 'server: event-door-list:pdf'/);
  assert.match(read('src/lib/workspace-guide.ts'), /id: 'door-list'/, 'the help panel explains it');
});
