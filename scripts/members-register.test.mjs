// =====================================================================
// THE MEMBERS REGISTER DOWNLOAD CARRIES THE ATTENDANCE (Step 105C).
// ---------------------------------------------------------------------
// People > Members, Download CSV (members-register.csv): for the roles
// that see the Events column, this semester's attendance, each figure in
// its own column as a plain number (never "3/10", which a spreadsheet
// turns into a date), with the events attended and missed listed by date.
// The download waits for the attendance instead of leaving it out, and
// says so if it cannot be had. This test fails if any of that comes undone.
//
//   node --test scripts/members-register.test.mjs
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
const CACHE = join(ROOT, 'node_modules', '.cache', 'members-register-test');
mkdirSync(CACHE, { recursive: true });
const load = async (p, name) => {
  const out = join(CACHE, `${name}.mjs`);
  buildSync({ entryPoints: [join(ROOT, p)], bundle: true, outfile: out, format: 'esm', platform: 'node', logLevel: 'silent' });
  return import(`${pathToFileURL(out).href}?${Date.now()}`);
};

const ATT = {
  total: 4, label: 'Fall 2026',
  counts: { m1: 3, m2: 0 },
  events: [
    { id: 'e1', title: 'Welcome aperitivo', date: '2026-09-18' },
    { id: 'e2', title: 'Inside Private Banking', date: '2026-10-14' },
    { id: 'e3', title: 'Macro alumni call', date: '2026-10-21' },
    { id: 'e4', title: 'Association on Display', date: '2026-11-05' },
  ],
  attended: { m1: ['e1', 'e2', 'e4'] },
  registered: { m1: ['e1', 'e2', 'e3', 'e4'], m2: ['e2'] },
};

test('one member: the numbers, the rate and the two lists, by date', async () => {
  const { attendanceCells } = await load('src/lib/members-register-attendance.ts', 'cells');
  assert.deepEqual(attendanceCells(ATT, 'm1'), {
    events_attended: 3,
    events_held: 4,
    attendance_rate: '75%',
    registered_not_present: 1,
    events_attended_list: '18 Sept 2026 Welcome aperitivo; 14 Oct 2026 Inside Private Banking; 5 Nov 2026 Association on Display',
    events_missed_list: '21 Oct 2026 Macro alumni call',
  });
  const nobody = attendanceCells(ATT, 'm2');
  assert.equal(nobody.events_attended, 0);
  assert.equal(nobody.attendance_rate, '0%');
  assert.equal(nobody.registered_not_present, 1);
  assert.equal(nobody.events_attended_list, '');
  const unknown = attendanceCells(ATT, 'm9');
  assert.equal(unknown.events_attended, 0, 'a member with no record counts 0, not blank');
  assert.equal(unknown.events_held, 4);
  assert.equal(attendanceCells({ ...ATT, total: 0, events: [], counts: {} }, 'm1').attendance_rate, '', 'no events held: no rate');
  for (const v of Object.values(attendanceCells(ATT, 'm1'))) {
    assert.doesNotMatch(String(v), /^\d+\/\d+$/, 'no "3/4" a spreadsheet would read as a date');
  }
});

test('the headers name the semester they count', async () => {
  const { attendanceHeaders } = await load('src/lib/members-register-attendance.ts', 'headers');
  assert.deepEqual(attendanceHeaders('Fall 2026').map((h) => h.header), [
    'Events attended (Fall 2026)', 'Events held (Fall 2026)', 'Attendance rate (Fall 2026)',
    'Registered, not present (Fall 2026)', 'Events attended, list (Fall 2026)', 'Registered, not present, list (Fall 2026)',
  ]);
});

test('the download waits for the attendance, and says when it could not have it', () => {
  const page = read('src/components/admin/MembersManagement.tsx');
  assert.match(page, /const exportCsv = async \(\) => \{\s*let att: RegisterAttendance \| null = seesAttendance \? attendance : null;\s*if \(seesAttendance && !att\) \{\s*try \{ att = await loadAttendance\(\); \} catch \{ att = null; \}/);
  assert.match(page, /\.\.\.\(att \? attendanceCells\(att, m\.id\) : \{\}\),/);
  assert.match(page, /\.\.\.\(att \? attendanceHeaders\(att\.label\) : \[\]\),/);
  assert.match(page, /'members-register\.csv'\);\s*if \(seesAttendance && !att\) \{\s*toast\(\{ title: 'Downloaded without the attendance'/);
  assert.doesNotMatch(page, /events_attended: attendedOf\(m\.id\)/, 'no "3/10" text in the file');
  // Still only for the roles that see the Events column.
  assert.match(page, /const seesAttendance = access\.canManage\('people-members'\);/);
  // The same count the page and every other reader use (AGENTS.md).
  assert.match(page, /memberEventAttendance\(session, sem\.start, sem\.end\)/);
});
