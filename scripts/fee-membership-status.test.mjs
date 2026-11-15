import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const source = read('supabase/functions/_shared/fee-membership.ts');
const { FEE_MEMBERSHIP_STATUSES, isFeeMemberStatus } = await import(`data:text/javascript,${encodeURIComponent(source.replace(': string | null | undefined', '').replace(': boolean', ''))}`);
const migration = read('drizzle/migrations/0024_fee_exchange_and_leave_membership.sql');

test('members on exchange owe semester fees', () => {
  assert.equal(isFeeMemberStatus('on_exchange'), true);
});

test('members on one-semester leave owe semester fees', () => {
  assert.equal(isFeeMemberStatus('one_semester_pause'), true);
});

test('fee status rule excludes departed members and matches its database twin', () => {
  assert.equal(isFeeMemberStatus('active'), true);
  for (const status of ['alumni', 'expelled', null, undefined]) assert.equal(isFeeMemberStatus(status), false);
  const sqlStatuses = migration.match(/p_status IN \(([^)]+)\)/)[1].match(/'[^']+'/g).map((v) => v.slice(1, -1));
  assert.deepEqual(sqlStatuses, FEE_MEMBERSHIP_STATUSES);
  const api = read('supabase/functions/admin-fees/index.ts');
  assert.match(api, /\.in\('membership_status', FEE_MEMBERSHIP_STATUSES\)/);
  assert.match(api, /!isFeeMemberStatus\(member.membership_status\)/);
  assert.match(api, /isFeeMemberStatus\(mm.membership_status\)/);
});

test('receipts and reminders use the same status rule without changing receipt identity', () => {
  assert.equal((migration.match(/public\.fee_member_status\(m.membership_status\)/g) ?? []).length, 2);
  assert.match(migration, /'fee:' \|\| NEW.id::text \|\| ':' \|\| NEW.receipt_due_at::text/);
  assert.match(migration, /f.paid = false AND NOT f.exempt/);
  assert.match(migration, /NEW.receipt_queued_at IS NULL/);
});

test('eligible member changes create unpaid rows only in open collections and never overwrite payments', () => {
  const trigger = migration.slice(migration.indexOf('CREATE OR REPLACE FUNCTION public.members_join_open_fee_collections'));
  assert.match(trigger, /SELECT p.id,NEW.id,false .* WHERE NOT p.closed/);
  assert.match(trigger, /ON CONFLICT \(period_id,member_id\) DO NOTHING/);
  assert.match(trigger, /NOT public.fee_exempt_role\(NEW.role::text\)/);
  assert.doesNotMatch(trigger, /DO UPDATE|DELETE FROM/);
});