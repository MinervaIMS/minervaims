import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';

async function load(path) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const { code } = transformSync(source, { loader: 'ts', format: 'esm' });
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}
const attendance = await load('../supabase/functions/_shared/attendance-window.ts');
const certificates = await load('../supabase/functions/membership-certificate/rules.ts');
const registry = await load('../supabase/functions/_shared/activity-registry.ts');

test('September attendance closes on 31 January of the following year', () => {
  assert.equal(attendance.attendanceClosesOn('2026-09-15'), '2027-01-31');
});
test('Spring attendance closes on 31 August', () => {
  assert.equal(attendance.attendanceClosesOn('2026-06-15'), '2026-08-31');
});
test('A late January event still receives fourteen days', () => {
  assert.equal(attendance.attendanceClosesOn('2027-01-28'), '2027-02-11');
});
test('Closing day is inclusive on Rome time', () => {
  assert.equal(attendance.attendanceOpen('2026-09-15', new Date('2027-01-31T22:59:59Z')), true);
  assert.equal(attendance.attendanceOpen('2026-09-15', new Date('2027-01-31T23:00:00Z')), false);
});
test('President, Vice President, and association account can correct closed attendance', () => {
  assert.equal(attendance.canOverrideClosedAttendance(['president'], null), true);
  assert.equal(attendance.canOverrideClosedAttendance(['vice_president'], null), true);
  assert.equal(attendance.canOverrideClosedAttendance([], 'as.minerva@unibocconi.it'), true);
});
test('Operations roles cannot override closed attendance', () => {
  assert.equal(attendance.canOverrideClosedAttendance(['head_of_operations'], null), false);
  assert.equal(attendance.canOverrideClosedAttendance(['operations_analyst'], null), false);
});
test('Active members are eligible, advisors and inactive members are not', () => {
  const member = { id: 'member', first_name: 'Test', surname: 'Member', email: 'test@example.com', role: 'analyst', division: 'equity', membership_status: 'active' };
  assert.equal(certificates.ineligibility(member), null);
  assert.notEqual(certificates.ineligibility({ ...member, role: 'advisor' }), null);
  assert.notEqual(certificates.ineligibility({ ...member, membership_status: 'expelled' }), null);
});
test('Alumni history excludes advisor semesters and sorts Fall after Spring', () => {
  assert.equal(certificates.servedAsMember('analyst'), true);
  assert.equal(certificates.servedAsMember('advisor'), false);
  assert.equal(certificates.servedAsMember('alumni'), false);
  assert.equal(certificates.semesterOrder('2026-fall') > certificates.semesterOrder('2026-spring'), true);
});
test('Off-register certificate refusal is exact', () => {
  assert.equal(certificates.notOnRegister('Test Person'), 'Test Person is not in Members or Alumni, so a certificate cannot be issued. Add them first.');
});
test('All eight direct-write tables are declared for auditing', () => {
  assert.deepEqual(Object.keys(registry.CLIENT_WRITE_TABLES).sort(), ['calendar_entries', 'exam_sessions', 'gpa_calculations', 'members', 'newsletter_subscribers', 'onboarding_progress', 'page_visibility', 'report_deadlines']);
});