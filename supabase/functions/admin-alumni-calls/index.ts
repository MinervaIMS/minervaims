import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// =====================================================================
// admin-alumni-calls — the alumni-call tracker. A call groups 2-5 alumni
// (each verified against the alumni directory), organised by a division on
// a date. The organiser is recorded automatically from who creates it.
// Actions: list · create · update · delete
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

const ParticipantSchema = z.object({
  alumni_id: z.string().uuid().nullable().optional(),
  alumnus_name: z.string().min(1).max(200),
  former_role: z.string().max(200).nullable().optional(),
});

const CallSchema = z.object({
  id: z.string().uuid().optional(),
  division: z.enum(['equity', 'investment', 'macro', 'portfolio', 'quant', 'media', 'operations', 'board', 'none']).nullable().optional(),
  planned_date: z.string().nullable().optional(),
  status: z.enum(['planned', 'invited', 'accepted', 'completed', 'declined']).optional(),
  notes: z.string().max(2000).nullable().optional(),
  poster_url: z.string().max(2000).nullable().optional(),
  participants: z.array(ParticipantSchema).min(2, 'A call needs at least 2 alumni').max(5, 'A call can have at most 5 alumni'),
});

// =====================================================================
// A PUBLISHED ALUMNI CALL IS AN EVENT.
// ---------------------------------------------------------------------
// `alumni_call` has always been a valid `events.event_type`, and the
// public Events page, its archive filters, its poster lightbox and the
// Alumni page's carousel all read `events`. Rather than teach every one
// of those about a second table with its own row-level security, a call
// that is ready to be announced - it has a poster and a date - is
// MIRRORED into `events`, and the mirror is owned entirely by this
// function, so the two cannot be edited into disagreement.
//
// The link is `alumni_calls.event_id`. Removing the poster, or the date,
// unpublishes the call: the mirrored event is deleted and the link
// cleared. Deleting the call deletes it too.
// =====================================================================

const DIVISION_LABELS: Record<string, string> = {
  equity: 'Equity Research', investment: 'Investment Research', macro: 'Macro Research',
  portfolio: 'Portfolio Management', quant: 'Quantitative Research',
  media: 'Media and Communication', operations: 'Operations', board: 'Board', none: '',
};

interface MirrorCall {
  division?: string | null;
  planned_date?: string | null;
  notes?: string | null;
  poster_url?: string | null;
  participants: { alumnus_name: string; former_role?: string | null }[];
}

/** The event row a published call becomes. */
function eventPayload(c: MirrorCall) {
  const divisionLabel = c.division ? (DIVISION_LABELS[c.division] ?? '') : '';
  return {
    // The title the posters themselves use, qualified by the division that
    // organised it so five calls in one semester are told apart in a list.
    title: divisionLabel ? `Alumni Call: ${divisionLabel}` : 'Alumni Call',
    date: c.planned_date,
    place: 'Online',
    event_type: 'alumni_call',
    division: c.division && c.division !== 'none' ? c.division : null,
    online: true,
    // Each guest as "Name - former role", which is exactly how the public
    // event row already prints a guest list.
    guest: c.participants.map((p) => (p.former_role ? `${p.alumnus_name} - ${p.former_role}` : p.alumnus_name)),
    description: c.notes ?? null,
    poster_url: c.poster_url ?? null,
    show_on_website: true,
    registration_enabled: false,
    in_archive: false,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authError || !user) return json({ error: 'Invalid token' }, 401);
    const { data: roleRows } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const roles = (roleRows || []).map((r: { role: string }) => r.role);
    const isStaff = user.email === 'as.minerva@unibocconi.it' || roles.some((r) => !['member', 'pending', 'candidate'].includes(r));
    if (!isStaff) return json({ error: 'Access denied' }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === 'list') {
      const { data: calls, error } = await supabase.from('alumni_calls')
        .select('*').order('planned_date', { ascending: false, nullsFirst: false });
      if (error) throw error;
      const { data: parts } = await supabase.from('alumni_call_participants').select('*');
      const byCall: Record<string, unknown[]> = {};
      for (const p of (parts || []) as { call_id: string }[]) (byCall[p.call_id] ??= []).push(p);
      const withParts = (calls || []).map((c: { id: string }) => ({ ...c, participants: byCall[c.id] || [] }));
      return json({ calls: withParts });
    }
    if (action === 'delete') {
      // The mirrored public event goes with it. Read the link first: the
      // row is about to stop existing, and an orphaned event would keep
      // announcing a call that the association has removed.
      const { data: existing } = await supabase.from('alumni_calls').select('event_id').eq('id', body.id).maybeSingle();
      const { error } = await supabase.from('alumni_calls').delete().eq('id', body.id);
      if (error) throw error;
      if (existing?.event_id) await supabase.from('events').delete().eq('id', existing.event_id);
      return json({ success: true });
    }

    const parsed = CallSchema.safeParse(body.call);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Validation failed';
      return json({ error: msg, details: parsed.error.format() }, 400);
    }
    const c = parsed.data;

    // Verify every named alumnus exists in the directory.
    for (const p of c.participants) {
      let ok = false;
      if (p.alumni_id) {
        const { data } = await supabase.from('alumni').select('id').eq('id', p.alumni_id).maybeSingle();
        ok = !!data;
      }
      if (!ok) {
        return json({ error: `"${p.alumnus_name}" is not in the alumni list. Please add them in the Alumni section first.` }, 400);
      }
    }

    const organiser = (await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()).data?.full_name || user.email;
    const payload = {
      division: c.division ?? null, planned_date: c.planned_date || null,
      status: c.status ?? 'planned', notes: c.notes ?? null,
      poster_url: c.poster_url || null,
    };

    const writeParticipants = async (callId: string) => {
      await supabase.from('alumni_call_participants').delete().eq('call_id', callId);
      await supabase.from('alumni_call_participants').insert(
        c.participants.map((p) => ({ call_id: callId, alumni_id: p.alumni_id ?? null, alumnus_name: p.alumnus_name, former_role: p.former_role ?? null })),
      );
    };

    /**
     * Bring the public event into line with the call.
     *
     * Publishable means a poster AND a date: without a date the event has
     * nowhere to sit on a timeline, and without a poster the call is still
     * a plan. Anything else unpublishes.
     */
    const syncEvent = async (callId: string, currentEventId: string | null) => {
      const publishable = !!c.poster_url && !!c.planned_date;
      if (!publishable) {
        if (currentEventId) {
          await supabase.from('events').delete().eq('id', currentEventId);
          await supabase.from('alumni_calls').update({ event_id: null }).eq('id', callId);
        }
        return;
      }
      const ev = eventPayload(c);
      if (currentEventId) {
        const { error } = await supabase.from('events').update(ev).eq('id', currentEventId);
        // A mirrored event deleted by hand from Event archive leaves a stale
        // link. Falling through to an insert re-creates it rather than
        // failing the save of the call itself.
        if (!error) return;
      }
      const { data: created, error: insErr } = await supabase.from('events').insert(ev).select('id').single();
      if (insErr) throw insErr;
      await supabase.from('alumni_calls').update({ event_id: created.id }).eq('id', callId);
    };

    if (action === 'create') {
      const { data, error } = await supabase.from('alumni_calls')
        .insert({ ...payload, organiser_name: organiser, created_by: user.id }).select().single();
      if (error) throw error;
      await writeParticipants(data.id);
      await syncEvent(data.id, null);
      return json({ success: true, call: data });
    }
    if (action === 'update') {
      if (!c.id) return json({ error: 'Missing id' }, 400);
      const { data, error } = await supabase.from('alumni_calls').update(payload).eq('id', c.id).select().single();
      if (error) throw error;
      await writeParticipants(c.id);
      await syncEvent(c.id, data.event_id ?? null);
      return json({ success: true, call: data });
    }
    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('admin-alumni-calls error:', error);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
});
