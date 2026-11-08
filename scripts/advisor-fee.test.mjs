// =====================================================================
// ADVISORS OUTSIDE THE MEMBERSHIP FEE, AND THE TREASURY HEADER (Step 104),
// TESTED.
// ---------------------------------------------------------------------
// An advisor is an alumnus appointed to advise the association, not a
// dues-paying member of it: in no collection, no total, no reminder and no
// semester register. The rule is kept by the workspace, by three edge
// functions and, since Step 104, by the database itself. What must stay
// true:
//
//   * every copy of the list of exempt roles is the same list;
//   * the reminder after the first deadline never chooses an advisor;
//   * the database keeps the rule on every write (triggers), and the
//     migration that installs it changes no row that already exists;
//   * a payment already made, and a closed collection, are never touched;
//   * the pages say the same: Time Machine does not mark an advisor "not in
//     the register", and Membership Fees does not promise the deadline to
//     everyone.
//
//   node --test scripts/advisor-fee.test.mjs
// =====================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const sql = (p) => read(p).replace(/^\s*--.*$/gm, '');

const MIGRATION = 'supabase/migrations/20261103090000_advisors_outside_fee.sql';
const EXEMPT = ['advisor', 'silent_advisor'];
const list = (s) => [...s.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();

// The last migration that defines a function is the one the database runs.
function latestDefinition(name) {
  const files = readdirSync(join(ROOT, 'supabase/migrations')).filter((f) => f.endsWith('.sql')).sort();
  let found = null;
  for (const f of files) {
    const s = sql(`supabase/migrations/${f}`);
    const defs = [...s.matchAll(new RegExp(`CREATE (?:OR REPLACE )?FUNCTION public\\.${name}\\(`, 'g'))];
    if (defs.length) {
      const at = defs[defs.length - 1].index;
      const start = s.indexOf('$$', at);
      const end = s.indexOf('$$', start + 2);
      found = { file: f, body: s.slice(start + 2, end) };
    }
  }
  return found;
}

test('every copy of the exempt roles is the same two roles', () => {
  assert.deepEqual(list(/FEE_EXEMPT_ROLES: AppRole\[\] = \[([^\]]*)\]/.exec(code('src/lib/membership-fee.ts'))[1]), EXEMPT.slice().sort());
  for (const f of ['supabase/functions/admin-fees/index.ts', 'supabase/functions/admin-members/index.ts', 'supabase/functions/admin-users/index.ts']) {
    assert.deepEqual(list(/FEE_EXEMPT_ROLES = \[([^\]]*)\]/.exec(code(f))[1]), EXEMPT.slice().sort(), f);
  }
  const db = latestDefinition('fee_exempt_role');
  assert.equal(db.file, '20261103090000_advisors_outside_fee.sql');
  assert.deepEqual(list(db.body), EXEMPT.slice().sort());
});

test('the reminder after the first deadline never chooses an advisor, nor anybody outside the paying membership', () => {
  const r = { body: read('drizzle/migrations/0014_membership_fee_email_cycle.sql') };
  // The current fee-email migration lives under Drizzle.
  assert.match(r.body, /AND NOT public\.fee_exempt_role\(m\.role::text\)/);
  // The same people admin-fees leaves out of a collection.
  const others = list(/m\.role::text NOT IN \(([^)]*)\)/.exec(r.body)[1]);
  const nonPaying = /const NON_PAYING_ROLES = \[([^\]]*)\]/.exec(code('supabase/functions/admin-fees/index.ts'))[1];
  assert.deepEqual([...others, ...EXEMPT].sort(), [...list(nonPaying), ...EXEMPT].sort());
  // Everything else as before: the template, the once-per-collection marker, unpaid rows only.
  assert.match(r.body, /enqueue_app_email\('ws_membership_reminder'/);
  assert.match(r.body, /f\.paid = false/);
  assert.match(r.body, /f\.next_reminder_on <= today/);
  assert.match(r.body, /SET reminder_sent_at = now\(\)/);
});

test('the database keeps the rule on every write', () => {
  const m = sql(MIGRATION);
  for (const [trigger, timing, table] of [
    ['members_fee_status_follows_role', 'BEFORE INSERT OR UPDATE OF role, fee_status', 'members'],
    ['members_leave_open_fee_when_exempt', 'AFTER UPDATE OF role', 'members'],
    ['membership_fees_skip_exempt', 'BEFORE INSERT', 'membership_fees'],
  ]) {
    assert.ok(m.includes(`DROP TRIGGER IF EXISTS ${trigger} ON public.${table};`), `${trigger} is dropped first (safe to run twice)`);
    assert.ok(m.includes(`CREATE TRIGGER ${trigger}\n  ${timing} ON public.${table}`), `${trigger}: ${timing} ON ${table}`);
  }
  const follows = latestDefinition('members_fee_status_follows_role').body;
  assert.match(follows, /IF public\.fee_exempt_role\(NEW\.role::text\) THEN\s+NEW\.fee_status := 'exempt';/);
  const skip = latestDefinition('membership_fees_skip_exempt').body;
  assert.match(skip, /IF NOT coalesce\(NEW\.paid, false\) AND EXISTS/, 'only an UNPAID row is refused');
});

test('a payment already made and a closed collection are never touched', () => {
  const leave = latestDefinition('members_leave_open_fee_when_exempt').body;
  assert.match(leave, /AND fp\.closed = false/);
  assert.match(leave, /AND mf\.paid = false;/);
  assert.match(leave, /IF public\.fee_exempt_role\(NEW\.role::text\) AND NOT public\.fee_exempt_role\(OLD\.role::text\) THEN/, 'only at the crossing into an advisory role');
});

test('the migration changes no row that exists today', () => {
  // Outside the function bodies there is nothing but definitions and grants.
  const outside = sql(MIGRATION).replace(/\$\$[\s\S]*?\$\$/g, '');
  // No statement starts with a write; the words appear only as trigger events.
  assert.doesNotMatch(outside, /^\s*(UPDATE|DELETE|INSERT|TRUNCATE|ALTER TABLE)\b/im);
  for (const stmt of outside.split(';').map((x) => x.trim()).filter(Boolean)) {
    assert.match(stmt, /^(CREATE OR REPLACE FUNCTION|DROP TRIGGER IF EXISTS|CREATE TRIGGER|REVOKE|GRANT)\b/, `unexpected statement: ${stmt.slice(0, 60)}`);
  }
  assert.doesNotMatch(outside, /\bDROP (TABLE|COLUMN|FUNCTION)\b/i);
});

test('the pages say the same', () => {
  const tm = code('src/components/admin/TimeMachine.tsx');
  assert.match(tm, /const registerMark = \(s: TimeMachineSemester, r: RosterRow\) => \(s\.register && !r\.in_register && !\/\\badvisor\\b\/i\.test\(r\.role \?\? ''\)/);
  const fee = read('src/components/admin/MembershipFee.tsx');
  assert.ok(fee.includes('The first deadline is shown on the Calendar to everyone who owes the fee'));
  assert.ok(!fee.includes('shown to everyone on the Calendar'));
});

test('the Treasury header gives its buttons to the page header as they are', () => {
  const t = code('src/components/admin/Treasury.tsx');
  assert.match(t, /actions=\{\(canExport \|\| canRecord\) \? <>/);
  assert.doesNotMatch(t, /actions=\{\(canExport \|\| canRecord\) \? <div/);
});

test('no em dash in the Step 104 additions', () => {
  for (const f of [MIGRATION, 'scripts/advisor-fee.test.mjs']) assert.ok(!read(f).includes('\u2014'), f);
});
