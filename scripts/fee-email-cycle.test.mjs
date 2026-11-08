import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('drizzle/migrations/0014_membership_fee_email_cycle.sql');
const receiptSql=read('drizzle/migrations/0015_fee_receipt_per_payment_identity.sql');
test('reminders recur after four Italian working days, starting at opening',()=>{
 assert.match(sql,/fee_working_day_after\(\(p.created_at AT TIME ZONE 'Europe\/Rome'\)::date,4\)/);
 assert.match(sql,/next_reminder_on = public.fee_working_day_after\(today,4\)/);
 assert.match(sql,/extract\(isodow FROM d\) < 6 AND public.italian_holiday_on\(d\) IS NULL/);
 assert.match(sql,/f.paid = false AND f.next_reminder_on <= today/);
 assert.match(sql,/p.closed=false/);
});
test('receipts only enqueue at payment transition and carry durable marker',()=>{
 assert.match(receiptSql,/NEW.paid AND NOT OLD.paid/);
 assert.match(receiptSql,/NEW.receipt_queued_at IS NULL/);
 assert.match(receiptSql,/NEW.receipt_queued_at := now\(\)/);
 assert.match(receiptSql,/NEW.receipt_due_at := NULL; NEW.receipt_queued_at := NULL/);
 assert.match(receiptSql,/NEW.id::text \|\| ':' \|\| NEW.receipt_due_at::text/);
});
test('email deadline is first until Rome day expires',()=>{
 assert.match(sql,/CASE WHEN p.first_deadline < \(now\(\) AT TIME ZONE 'Europe\/Rome'\)::date THEN coalesce\(p.second_deadline,p.first_deadline\) ELSE p.first_deadline END/);
 assert.match(read('supabase/functions/admin-fees/index.ts'),/new Date\(firstDeadline\)/);
});
test('paid action requires explicit confirmation',()=>{
 assert.match(read('supabase/functions/admin-fees/index.ts'),/paid && body.confirm_receipt !== true/);
 assert.match(read('src/lib/ops-api.ts'),/confirm_receipt: paid/);
});
