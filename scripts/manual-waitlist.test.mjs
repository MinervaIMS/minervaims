import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const sql = readFileSync('drizzle/migrations/0027_manual_waitlist_admission.sql', 'utf8');
test('manual admission bypasses capacity only for the chosen event', () => {
  assert.match(sql, /set_config\('minerva.waitlist_override', p_event_id::text, true\)/);
  assert.match(sql, /current_setting\('minerva.waitlist_override', true\) = NEW.event_id::text/);
  assert.match(sql, /IF v_taken >= v_cap THEN RAISE EXCEPTION 'EVENT_FULL'/);
});
test('admission preserves not-attended status and sends one ticket only for a new registration', () => {
  assert.match(sql, /p_actor, false\)/);
  assert.match(sql, /IF NOT FOUND THEN[\s\S]*INSERT INTO public.event_registrations[\s\S]*send_event_notice\('waitlist_promoted'[\s\S]*END IF;\s*DELETE FROM public.event_waitlist/);
  assert.match(sql, /event_id = p_event_id[\s\S]*user_id = w.user_id/);
});
test('manual admission is service-only and the edge action requires Attendance manage permission', () => {
  assert.match(sql, /REVOKE ALL ON FUNCTION public.admit_event_waitlist\(uuid, uuid, uuid\) FROM PUBLIC, anon, authenticated/);
  const edge = readFileSync('supabase/functions/admin-event-reg/index.ts', 'utf8');
  const action = edge.slice(edge.indexOf("if (action === 'admit-waitlist')"), edge.indexOf("if (action === 'mark-attended')"));
  assert.match(action, /if \(!canEditAttendance\)/);
  assert.match(action, /closedError\(eventId\)/);
  assert.match(action, /uuid.test\(eventId\).*uuid.test\(waitlistId\)/);
});