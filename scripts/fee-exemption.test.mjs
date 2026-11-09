// =====================================================================
// THE FEE REGISTER AND THE PRESIDENT'S EXEMPTION (Step 105).
// ---------------------------------------------------------------------
// Membership Fees is a full register (search, filters, every column), and
// the President (with the association's account) can exempt somebody from
// the open collection: no fee, no reminder, no deadline, and no place in
// the semester's register when the collection closes. Lovable's fee email
// functions are left untouched; a guard trigger keeps an exempt row out of
// the reminders. This test fails if any of that comes undone.
//
//   node --test scripts/fee-exemption.test.mjs
// =====================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const MIGRATION = 'supabase/migrations/20261109090400_fee_exemption.sql';

test('the exemption is stored per collection and keeps reminders away, without touching the fee email functions', () => {
  const sql = read(MIGRATION);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS exempt boolean NOT NULL DEFAULT false/);
  assert.match(sql, /CHECK \(NOT \(exempt AND paid\)\)/);
  assert.match(sql, /NEW\.next_reminder_on := NULL;/);
  assert.match(sql, /NEW\.reminder_sent_at := OLD\.reminder_sent_at;/);
  assert.match(sql, /CREATE TRIGGER membership_fee_a_exempt_guard\s*BEFORE INSERT OR UPDATE ON public\.membership_fees/);
  assert.ok('membership_fee_a_exempt_guard' < 'membership_fee_email_transition', 'the guard fires first');
  assert.doesNotMatch(sql, /FUNCTION public\.(process_fee_reminders|membership_fee_email_transition)\(/, "Lovable's functions are not redefined");
  assert.doesNotMatch(sql, /\b(DELETE FROM|TRUNCATE|UPDATE public\.)/);
});

test('only the President and the association account exempt, never on a paid fee, and the register leaves them out', () => {
  const fn = read('supabase/functions/admin-fees/index.ts');
  assert.match(fn, /const canExemptFrom = \(roles: string\[\], email: string \| undefined \| null\) => email === OWNER_EMAIL \|\| roles\.includes\('president'\);/);
  const block = fn.slice(fn.indexOf("if (action === 'set-exempt')"), fn.indexOf("if (action === 'close')"));
  assert.match(block, /if \(!canExemptFrom\(roles, user\.email\)\) return json\(\{ error: 'Only the President can exempt somebody from the fee\.' \}, 403\);/);
  assert.match(block, /if \(period\.closed\) return json/);
  assert.match(block, /if \(exempt && row\.paid\) return json/);
  assert.match(fn, /if \(row\?\.exempt\) return json\(\{ error: 'The President exempted this person/);
  assert.match(fn, /!FEE_EXEMPT_ROLES\.includes\(mm\.role\) && !exemptedIds\.has\(mm\.id\) &&/);
  assert.match(fn, /can_exempt: canExemptFrom\(roles, user\.email\)/);
  assert.match(read('supabase/functions/_shared/activity-registry.ts'), /'admin-fees:set-exempt': 'status_change',/);
  const matrix = read('src/lib/access/matrix.ts');
  assert.match(matrix, /rule: 'fee_exemption',\s*resource: 'ops-fee',\s*roles: \['president'\],/);
});

test('the page is a kit register with search, filters and the exemption in More, for the President only', () => {
  const page = read('src/components/admin/MembershipFee.tsx');
  for (const piece of ['<RegisterPage>', '<RegisterFrame>', 'REGISTER_HEAD', '<RecordList', '<RecordCard', '<FilterSheet', '<FilterSummary', 'useConfirm()']) {
    assert.ok(page.includes(piece), piece);
  }
  assert.match(page, /placeholder="Search by name, email or phone"/);
  assert.match(page, /\{ key: 'fee', label: 'Fee', options: stateOptions/);
  assert.match(page, /\{canExempt && <MoreMenu /);
  assert.match(page, /label: st === 'paid' \? 'Exempt from this collection \(record it as not paid first\)' : 'Exempt from this collection'/);
  assert.match(page, /\{paidCount\}\/\{owingCount\} paid/);
  assert.doesNotMatch(page, /window\.confirm\(|\bconfirm\(\s*'/, 'never the browser confirm');
});

test('an exempted member sees no fee deadline on the Calendar', () => {
  const cal = read('src/components/admin/WorkspaceCalendar.tsx');
  assert.match(cal, /if \(!mine\?\.exempt\) \{\s*out\.push\(\{ key: 'fee-1'/);
  assert.match(cal, /sb\.from\('membership_fees'\)\.select\('\*'\)\.eq\('period_id', fee\.id\)\.eq\('member_id', me\.id\)/);
});

test('the help says who exempts and what it means', () => {
  const guide = read('src/lib/workspace-guide.ts');
  assert.match(guide, /id: 'register', title: 'The register'/);
  assert.match(guide, /they are NOT written into the semester\\'s member register/);
  assert.match(read('src/lib/workspace-manual.ts'), /The President, with the admin account, can exempt somebody from the open collection/);
});
