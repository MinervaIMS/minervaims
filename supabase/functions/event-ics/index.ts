import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  buildIcs, googleUrl, icsFileName, interviewAsEvent, outlookUrl, SAMPLE_EVENT, SITE, type CalendarEvent,
} from '../_shared/calendar.ts';
import { intakeLabel } from '../_shared/recruiting.ts';

// =====================================================================
// event-ics: "Add to calendar", for one event.
// GET ?e=<event id>[&to=google|outlook|outlookcom]
//     ?i=<interview booking id>&who=candidate|examiner[&to=…]
//
// An interview booking is read with its slot: the candidate's entry is
// titled with the division, the examiner's with the candidate's name, and
// both carry the Teams or Zoom link. The booking id is known only to the
// two of them (it is in their emails and their workspace), and the entry
// holds nothing beyond what those already show them.
//
// Public, because the links sit in emails and on the registration page
// and are opened without signing in. It reads the event as it is NOW, so
// an old link still adds the current time and place. It reveals nothing
// the registration page does not already show: title, time, place and
// description. See supabase/functions/_shared/calendar.ts.
// =====================================================================

const cors = { 'Access-Control-Allow-Origin': '*' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const notFound = () => new Response(null, { status: 302, headers: { ...cors, Location: `${SITE}/events` } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('e') || '';
    const interviewId = url.searchParams.get('i') || '';
    const who = url.searchParams.get('who') === 'examiner' ? 'examiner' : 'candidate';
    const to = url.searchParams.get('to') || 'ics';

    let ev: CalendarEvent | null = null;
    if (interviewId === 'sample') {
      const d = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
      ev = interviewAsEvent({ bookingId: 'sample', divisionLabel: 'Equity Research', candidateName: 'Sample Candidate', examinerName: 'Sample Examiner', slotDate: d, startTime: '18:30', endTime: '19:00', meetingLink: 'https://teams.microsoft.com/' }, who);
    } else if (UUID.test(interviewId)) {
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const { data: b } = await supabase.from('interview_bookings')
        .select('id, candidate_name, division, slot_id').eq('id', interviewId).maybeSingle();
      if (b) {
        const { data: slot } = await supabase.from('interview_slots')
          .select('slot_date, start_time, end_time, meeting_link, examiner_name, division').eq('id', b.slot_id).maybeSingle();
        if (slot) {
          ev = interviewAsEvent({
            bookingId: b.id, divisionLabel: intakeLabel(slot.division) || String(slot.division || ''),
            candidateName: b.candidate_name || 'Candidate', examinerName: slot.examiner_name ?? null,
            slotDate: String(slot.slot_date), startTime: String(slot.start_time), endTime: String(slot.end_time),
            meetingLink: slot.meeting_link ?? null,
          }, who);
        }
      }
    } else if (id === 'sample') {
      ev = SAMPLE_EVENT();
    } else if (UUID.test(id)) {
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const { data } = await supabase.from('events')
        .select('id, title, start_at, end_at, date, place, online, description, updated_at')
        .eq('id', id).maybeSingle();
      ev = (data as CalendarEvent | null) ?? null;
    }
    if (!ev) return notFound();
    ev.title = (ev.title || '').trim() || 'Minerva IMS event';

    if (to === 'google' || to === 'outlook' || to === 'outlookcom') {
      const target = to === 'google' ? googleUrl(ev) : outlookUrl(ev, to === 'outlook' ? 'office' : 'live');
      if (!target) return notFound();
      return new Response(null, { status: 302, headers: { ...cors, Location: target, 'Cache-Control': 'no-store' } });
    }

    const ics = buildIcs(ev);
    if (!ics) return notFound();
    return new Response(ics, {
      headers: {
        ...cors,
        'Content-Type': 'text/calendar; charset=utf-8',
        // Inline, so an iPhone opens it straight into "Add to calendar";
        // other devices save it and open it in their calendar app.
        'Content-Disposition': `inline; filename="${icsFileName(ev)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('event-ics error:', e);
    return new Response('The calendar entry could not be prepared.', { status: 500, headers: cors });
  }
});
