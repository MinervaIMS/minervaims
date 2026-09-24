import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { audited } from '../_shared/activity.ts';
import { allows, rolesOf } from '../_shared/access.ts';
import { readJsonObject, optionalTextOf, UNREADABLE_BODY, type LooseBody } from '../_shared/request-body.ts';
import {
  REMINDER_STAGES, REMINDER_TEMPLATE_KEY, eventDay, isReminderStage, reminderSchedule,
  type ReminderLogRow, type ReminderStage,
} from '../_shared/event-reminders.ts';

// =====================================================================
// admin-event-reminders: the registration reminders of Registration Forms.
// Actions: status · set-paused · send-test
//
//   status      the schedule of every event that can have reminders
//   set-paused  stop, or resume, the reminders of one event
//   send-test   send the three reminders of one event to one address,
//               without touching the real schedule
//
// Reading needs the Registration Forms page; changing anything needs full
// access to it (`events-forms` at 'manage'), the same people who open and
// close the forms. The sending itself is done by the database job.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

const RESOURCE = 'events-forms';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(audited('admin-event-reminders', async (req, audit) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authError || !user) return json({ error: 'Invalid token' }, 401);
    const { data: roleRows } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const roles = rolesOf(roleRows);
    audit.actor(user, roles);
    if (!allows(roles, user.email, RESOURCE, 'view')) return json({ error: 'Access denied' }, 403);
    const canManage = allows(roles, user.email, RESOURCE, 'manage');

    const parsedBody = await readJsonObject(req);
    if (!parsedBody) return json({ error: UNREADABLE_BODY }, 400);
    const body = parsedBody as LooseBody;
    const action = typeof body.action === 'string' ? body.action : '';
    audit.request(action, body);

    if (action === 'status') {
      const { data: events, error } = await supabase.from('events')
        .select('id, date, start_at, registration_enabled, reminders_paused, reminders_paused_at, reminders_paused_by, aod_day_id')
        .is('aod_day_id', null);
      if (error) throw error;
      const { data: logRows } = await supabase.from('event_reminder_log').select('event_id, stage, sent_at, recipients');
      const byEvent = new Map<string, ReminderLogRow[]>();
      for (const r of (logRows || []) as (ReminderLogRow & { event_id: string })[]) {
        const list = byEvent.get(r.event_id) || [];
        list.push(r);
        byEvent.set(r.event_id, list);
      }
      // Who stopped them, by name, so the page can say so.
      const pausedBy = [...new Set((events || []).map((e: { reminders_paused_by: string | null }) => e.reminders_paused_by).filter(Boolean))] as string[];
      const names = new Map<string, string>();
      if (pausedBy.length) {
        const { data: people } = await supabase.from('members').select('user_id, first_name, surname').in('user_id', pausedBy);
        for (const p of (people || []) as { user_id: string; first_name: string | null; surname: string | null }[]) {
          names.set(p.user_id, [p.first_name, p.surname].filter(Boolean).join(' '));
        }
      }
      const reminders = (events || []).map((e: {
        id: string; date: string | null; start_at: string | null; registration_enabled: boolean;
        reminders_paused: boolean; reminders_paused_at: string | null; reminders_paused_by: string | null;
      }) => ({
        event_id: e.id,
        paused: !!e.reminders_paused,
        paused_at: e.reminders_paused_at,
        paused_by: e.reminders_paused_by ? (names.get(e.reminders_paused_by) || null) : null,
        stages: reminderSchedule(eventDay(e.start_at, e.date), byEvent.get(e.id) || [], {
          paused: !!e.reminders_paused, registrationEnabled: !!e.registration_enabled,
        }),
      }));
      return json({ reminders, can_manage: canManage });
    }

    if (!canManage) return json({ error: 'Only people with full access to Registration Forms can change the reminders.' }, 403);

    const eventId = optionalTextOf(body, 'event_id');
    if (!eventId) return json({ error: 'Choose an event.' }, 400);
    const { data: ev } = await supabase.from('events').select('id, aod_day_id').eq('id', eventId).maybeSingle();
    if (!ev) return json({ error: 'This event no longer exists. Reload the page.' }, 404);
    if (ev.aod_day_id) return json({ error: 'Association on Display days have no registration reminders.' }, 400);

    if (action === 'set-paused') {
      if (typeof body.paused !== 'boolean') return json({ error: 'Say whether the reminders should be stopped or resumed.' }, 400);
      const paused = body.paused;
      const { error } = await supabase.from('events').update({
        reminders_paused: paused,
        reminders_paused_at: paused ? new Date().toISOString() : null,
        reminders_paused_by: paused ? user.id : null,
      }).eq('id', eventId);
      if (error) throw error;
      return json({ success: true, paused });
    }

    if (action === 'send-test') {
      const to = (optionalTextOf(body, 'to') || user.email || '').trim();
      if (!EMAIL_RE.test(to) || to.length > 255) return json({ error: 'Enter a valid email address for the test.' }, 400);
      const stages: ReminderStage[] = isReminderStage(body.stage) ? [body.stage] : REMINDER_STAGES.map((s) => s.stage);
      const startedAt = new Date(Date.now() - 1000).toISOString();
      for (const stage of stages) {
        const { error } = await supabase.rpc('send_event_registration_reminder', {
          p_event_id: eventId, p_stage: stage, p_test_to: to,
        });
        if (error) throw error;
      }
      // What happened to each copy, read back from the register of sent
      // emails: a copy can be held back as a duplicate (the same test sent
      // again within five minutes), or not sent at all when the template
      // is switched off in Auto emails.
      const { data: logged } = await supabase.from('email_send_log')
        .select('template_name, status, created_at')
        .in('template_name', stages.map((s) => REMINDER_TEMPLATE_KEY[s]))
        .ilike('recipient_email', to)
        .gte('created_at', startedAt)
        .order('created_at', { ascending: false });
      const results = stages.map((stage) => {
        const row = (logged || []).find((l: { template_name: string }) => l.template_name === REMINDER_TEMPLATE_KEY[stage]);
        return { stage, status: row ? row.status : 'not_sent' };
      });
      return json({ success: true, to, results });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (error) {
    console.error('admin-event-reminders error:', error);
    return json({ error: 'Something went wrong with the reminders. Please try again.' }, 500);
  }
}));
