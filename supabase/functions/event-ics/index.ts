import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  buildIcs, googleUrl, icsFileName, outlookUrl, SAMPLE_EVENT, SITE, type CalendarEvent,
} from '../_shared/calendar.ts';

// =====================================================================
// event-ics: "Add to calendar", for one event.
// GET ?e=<event id>[&to=google|outlook|outlookcom]
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
    const to = url.searchParams.get('to') || 'ics';

    let ev: CalendarEvent | null = null;
    if (id === 'sample') {
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
