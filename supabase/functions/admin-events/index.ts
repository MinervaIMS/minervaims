import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { audited } from '../_shared/activity.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import { allows } from '../_shared/access.ts'
import {
  ALUMNI_CALL_STATUSES, ALUMNI_CALL_MIN, ALUMNI_CALL_MAX, ALUMNI_CALL_ORGANISERS, ALUMNI_FORMER_DIVISIONS,
  alumnusGuestLine,
} from '../_shared/alumni-call.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schemas
const EventSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title too long')
    .trim(),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD required)')
    .refine(val => {
      const date = new Date(val)
      return !isNaN(date.getTime()) && date.getFullYear() >= 2000 && date.getFullYear() <= 2100
    }, 'Invalid date'),
  // Up to 2000 so an online event's meeting link fits (Teams links run
  // long); a place in the world is still held to 200 below.
  place: z.string()
    .min(1, 'Place is required')
    .max(2000, 'Place too long')
    .trim(),
  moderator: z.string()
    .max(200, 'Moderator name too long')
    .trim()
    .nullable()
    .optional(),
  guest: z.array(
    z.string()
      .max(200, 'Guest name too long')
      .trim()
  )
    .max(20, 'Too many guests')
    .nullable()
    .optional(),
  description: z.string()
    .max(5000, 'Description too long')
    .trim()
    .nullable()
    .optional(),
  poster_url: z.string()
    .max(2000, 'Poster URL too long')
    .trim()
    .nullable()
    .optional(),
  // 'association_on_display' events are created and kept in step by the
  // database, one per Association on Display day; they are listed here so
  // the archive can still switch their website visibility.
  event_type: z.enum(['meeting','assembly','aperitivo','division_event','online_call','guest','alumni_call','company_visit','association_wide','association_on_display','other']).optional(),
  division: z.enum(['equity','investment','macro','portfolio','quant','media','operations','board','none']).nullable().optional(),
  start_at: z.string().nullable().optional(),
  end_at: z.string().nullable().optional(),
  online: z.boolean().optional(),
  registration_enabled: z.boolean().optional(),
  registration_audience: z.enum(['members','members_external','guests','public']).optional(),
  show_on_website: z.boolean().optional(),
  in_archive: z.boolean().optional(),
  // The number of places; null for no limit (the default).
  capacity: z.number().int('Places must be a whole number').min(1, 'At least one place').max(10000, 'Too many places').nullable().optional()
})

// =====================================================================
// AN ONLINE EVENT CARRIES ITS MEETING LINK, AND KEEPS IT PRIVATE.
// ---------------------------------------------------------------------
// The organisers type the link where the place goes, as before. It is
// saved in `event_join_links` (migration 20261005100000), which nobody
// reads from the browser, and the event's own `place`, which the public
// website reads, says "Online". The emails that confirm a place carry
// the link, a registered member sees it on their Dashboard and in My
// events, and the organisers get it back with `join-links` to edit it.
//
// A new online event must have a link. On update the link is asked for
// only when where the event happens changes: an older online event saved
// with "Online" and no link keeps working for every other edit, such as
// the archive's website switch, and an edit that leaves the place as
// "Online" keeps the link already saved.
// =====================================================================
const MEETING_LINK_RE = /^https?:\/\/[^\s<>"']{3,2000}$/i
const ONLINE_WORD = /^\s*online\s*$/i
const LINK_NEEDED = 'An online event needs its meeting link, starting with https:// (Teams, Zoom, Google Meet...). Registrants receive it in their confirmation email.'
function placeProblem(online: boolean, place: string): string | null {
  if (online && !MEETING_LINK_RE.test(place.trim())) return LINK_NEEDED
  if (!online && place.length > 200) return 'Place too long'
  return null
}

// Internal meetings and online calls start off the public website; every
// other type starts listed. Applies only when the caller does not say:
// Create Event now always does, and the archive switch changes it later.
// Mirrored by WEBSITE_HIDDEN_TYPES in src/lib/events-api.ts.
const WEBSITE_HIDDEN_TYPES = ['meeting', 'online_call']

// Extra event columns shared by create and update.
function extraEventCols(v: Record<string, unknown>) {
  return {
    event_type: v.event_type ?? 'other',
    division: v.division ?? null,
    start_at: v.start_at ?? null,
    end_at: v.end_at ?? null,
    online: v.online ?? false,
    registration_enabled: v.registration_enabled ?? false,
    registration_audience: v.registration_audience ?? 'members',
    // Was `?? true`: a caller that did not send the flag published the
    // event, and Create Event never sent it.
    show_on_website: v.show_on_website ?? !WEBSITE_HIDDEN_TYPES.includes(String(v.event_type ?? 'other')),
    // Whether the event is recorded in the Events archive. The creator
    // decides; online calls, guest events and alumni calls default to yes.
    in_archive: v.in_archive ?? ['online_call','guest','alumni_call'].includes(String(v.event_type ?? '')),
    // WRITTEN ONLY WHEN SENT. Several pages save an event by listing its
    // fields (the archive's website switch among them) and do not know
    // about places; reading "not sent" as "no limit" would lift the limit,
    // and hand every place on the waiting list out, at the flick of a
    // switch. Absent, the column keeps its value.
    ...(v.capacity !== undefined ? { capacity: v.capacity } : {}),
  }
}

const ActionSchema = z.enum(['create', 'update', 'delete', 'join-links'])

// =====================================================================
// AN ALUMNI CALL IS AN EVENT, WITH ITS PLANNING BESIDE IT (Step 91).
// ---------------------------------------------------------------------
// Created here like any event, with `alumni` beside `event`: the alumni
// taking part (from the directory, or typed by hand), where the call
// stands, who is responsible and the internal notes. The event's public
// guest list is written from the alumni (_shared/alumni-call.ts), and the
// planning goes to `event_alumni_calls` and `event_alumni`, which only
// staff can read.
//
// A call can be saved before its date is known: `date_tbc`. It then
// carries a provisional date nobody sees, stays off the website, takes no
// registrations and needs no meeting link yet; the database holds it to
// that (migration 20261022120000).
//
// Who: everybody who can create events, and also the Heads of Division
// and the Head of Asset Management, who plan the calls but create no other
// kind of event (`events-alumni-calls` in the access matrix).
// =====================================================================
const AlumniGuestSchema = z.object({
  alumni_id: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1, 'Each alumnus needs a name').max(200, 'Name too long'),
  company: z.string().trim().max(200, 'Company too long').nullable().optional(),
  position: z.string().trim().max(200, 'Position too long').nullable().optional(),
  former_role: z.string().trim().max(200, 'Former role too long').nullable().optional(),
  former_division: z.enum(ALUMNI_FORMER_DIVISIONS).nullable().optional(),
  headline: z.string().trim().max(300, 'Introduction too long').nullable().optional(),
})
const AlumniCallSchema = z.object({
  status: z.enum(ALUMNI_CALL_STATUSES).default('planned'),
  responsible_person: z.string().trim().max(200, 'Responsible person too long').nullable().optional(),
  notes: z.string().trim().max(2000, 'Notes too long').nullable().optional(),
  date_tbc: z.boolean().optional(),
  participants: z.array(AlumniGuestSchema)
    .min(ALUMNI_CALL_MIN, `An alumni call needs at least ${ALUMNI_CALL_MIN} alumni.`)
    .max(ALUMNI_CALL_MAX, `An alumni call can have at most ${ALUMNI_CALL_MAX} alumni.`),
})
type AlumniCallInput = z.infer<typeof AlumniCallSchema>

const ALUMNI_TYPE_CHANGE = 'An alumni call stays an alumni call, and no other event can become one: create a new event instead.'
const TBC_OFF_WEBSITE = 'This alumni call has no date yet, so it stays off the website and cannot take registrations. Set its date first.'
const ALUMNI_ONLY = 'Your role can create and change alumni calls only.'

/** Today on Rome's clock: the provisional date of a call still to be confirmed. */
const romeToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' })

const DeleteEventSchema = z.object({
  id: z.string().uuid('Invalid event ID')
})

// Rate limiting
interface RateLimitRecord {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitRecord>()

function checkRateLimit(identifier: string, maxRequests: number, windowMs: number): { 
  allowed: boolean
  remaining: number
  resetAt: number 
} {
  const now = Date.now()
  const record = rateLimitStore.get(identifier)
  
  if (!record || now > record.resetAt) {
    const resetAt = now + windowMs
    rateLimitStore.set(identifier, { count: 1, resetAt })
    return { allowed: true, remaining: maxRequests - 1, resetAt }
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt }
  }
  
  record.count++
  return { 
    allowed: true, 
    remaining: maxRequests - record.count, 
    resetAt: record.resetAt 
  }
}

Deno.serve(audited('admin-events', async (req, audit) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Rate limiting: 30 requests per minute per IP
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('cf-connecting-ip') || 
               'anonymous'
    
    const rateLimit = checkRateLimit(`events:${ip}`, 30, 60 * 1000)
    
    if (!rateLimit.allowed) {
      console.warn('Rate limit exceeded for IP:', ip)
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter)
          } 
        }
      )
    }

    // Verify Supabase Auth token
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify user with Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has event access
    const isAdminEmail = user.email === 'as.minerva@unibocconi.it'
    
    // Roles that can access events
    const eventAccessRoles = [
      'admin', 'president', 'vice_president', 'head_of_asset_management',
      'head_of_operations', 'head_of_media',
      'head_of_equity', 'head_of_investment',
      'head_of_macro', 'head_of_portfolio', 'head_of_quant'
    ]
    
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
    
    const userRoleNames = userRoles?.map(r => r.role) || []
    audit.actor(user, userRoleNames)
    const hasEventAccess = isAdminEmail || 
      userRoleNames.some(r => eventAccessRoles.includes(r))
    // Alumni calls follow the access matrix: whoever has full Create Event,
    // and those who plan the calls (Heads of Division, Head of Asset
    // Management, the Vice President). The Head of Media keeps view only.
    const canAlumniCalls =
      allows(userRoleNames, user.email, 'events-alumni-calls', 'manage') ||
      allows(userRoleNames, user.email, 'events-create', 'manage')

    if (!hasEventAccess && !canAlumniCalls) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get primary role for logging
    const priorityOrder = ['president', 'vice_president', 'admin', 'head_of_asset_management', 
      'head_of_operations', 'head_of_media', 'head_of_equity', 'head_of_investment', 
      'head_of_macro', 'head_of_portfolio', 'head_of_quant'];
    const primaryRole = priorityOrder.find(r => userRoleNames.includes(r)) || userRoleNames[0] || 'member';

    // Parse request body
    let body: unknown
    try {
      body = await req.json()
      // JSON that is not an object (`null`, a list, a number) is as
      // unreadable as no JSON at all: the line below reads a property
      // from it, which threw and became a 500. Same 400 as bad JSON.
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('not a JSON object')
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate action
    const actionResult = ActionSchema.safeParse((body as { action?: string }).action)
    if (!actionResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be create, update, delete or join-links.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const action = actionResult.data
    audit.request(action, body as Record<string, unknown>)
    const event = (body as { event?: unknown }).event

    const bad = (error: string, status = 400) => new Response(
      JSON.stringify({ error }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
    /** The alumni and planning sent beside an alumni call, checked. */
    const readAlumni = async (organiser: string | null | undefined): Promise<{ value: AlumniCallInput } | { error: string }> => {
      const parsed = AlumniCallSchema.safeParse((body as { alumni?: unknown }).alumni)
      if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Check the alumni of this call.' }
      if (!organiser || !(ALUMNI_CALL_ORGANISERS as readonly string[]).includes(organiser)) {
        return { error: 'Choose who organises this call: a division or the Board.' }
      }
      // An alumnus picked from the directory must still be in it; somebody
      // typed by hand is taken as written.
      const ids = parsed.data.participants.map((p) => p.alumni_id).filter((x): x is string => !!x)
      if (ids.length) {
        const { data: found } = await supabase.from('alumni').select('id').in('id', ids)
        const known = new Set(((found || []) as { id: string }[]).map((r) => r.id))
        const gone = parsed.data.participants.find((p) => p.alumni_id && !known.has(p.alumni_id))
        if (gone) return { error: `"${gone.name}" is no longer in the alumni directory. Choose them again, or type them in by hand.` }
      }
      return { value: parsed.data }
    }
    /** Where the call stands and who takes part, beside its event. */
    const writeAlumniPlan = async (eventId: string, a: AlumniCallInput): Promise<string | null> => {
      const plan = { status: a.status, responsible_person: a.responsible_person || null, notes: a.notes || null }
      const { data: existing } = await supabase.from('event_alumni_calls').select('event_id').eq('event_id', eventId).maybeSingle()
      if (existing) {
        const { error } = await supabase.from('event_alumni_calls').update(plan).eq('event_id', eventId)
        if (error) return error.message
      } else {
        const addedBy = (await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()).data?.full_name || user.email || null
        const { error } = await supabase.from('event_alumni_calls').insert({ event_id: eventId, ...plan, added_by_name: addedBy, created_by: user.id })
        if (error) return error.message
      }
      const { error: delErr } = await supabase.from('event_alumni').delete().eq('event_id', eventId)
      if (delErr) return delErr.message
      const { error: insErr } = await supabase.from('event_alumni').insert(a.participants.map((p, i) => ({
        event_id: eventId, alumni_id: p.alumni_id ?? null, name: p.name,
        company: p.company || null, position: p.position || null,
        former_role: p.former_role || null, former_division: p.former_division ?? null,
        headline: p.headline || null, sort_order: i,
      })))
      return insErr ? insErr.message : null
    }

    console.log('Admin events action:', action)

    switch (action) {
      case 'create': {
        // Validate event data
        const eventResult = EventSchema.safeParse(event)
        if (!eventResult.success) {
          return new Response(
            JSON.stringify({ 
              error: 'Invalid event data',
              details: eventResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const validatedEvent = eventResult.data
        const isAlumniCall = validatedEvent.event_type === 'alumni_call'
        if (isAlumniCall ? !canAlumniCalls : !hasEventAccess) {
          return bad(isAlumniCall ? 'Your role cannot create alumni calls.' : ALUMNI_ONLY, 403)
        }
        let alumni: AlumniCallInput | null = null
        if (isAlumniCall) {
          const read = await readAlumni(validatedEvent.division)
          if ('error' in read) return bad(read.error)
          alumni = read.value
        }
        // A call whose date is still to be confirmed may not have its
        // meeting link yet either; every other online event needs one now.
        const tbc = !!alumni?.date_tbc
        const createOnline = validatedEvent.online ?? false
        const hasLink = MEETING_LINK_RE.test(validatedEvent.place.trim())
        const createPlace = tbc && createOnline && !hasLink ? null : placeProblem(createOnline, validatedEvent.place)
        if (createPlace) {
          return new Response(
            JSON.stringify({ error: createPlace }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        // The same for Association on Display: each day opened there has its
        // event created with it, and a second one made by hand would be a
        // duplicate with no stand behind it.
        if (validatedEvent.event_type === 'association_on_display') {
          return new Response(
            JSON.stringify({ error: 'Association on Display days are opened from Events > Association on Display, which creates their event.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        const createLink = createOnline && hasLink ? validatedEvent.place.trim() : null
        const { data, error } = await supabase
          .from('events')
          .insert({
            title: validatedEvent.title,
            // A call still to be confirmed gets today as a provisional date
            // that nobody sees (date_tbc keeps it out of every listing).
            date: tbc ? romeToday() : validatedEvent.date,
            // The link is kept apart; the public place says "Online".
            place: createLink || (tbc && createOnline) ? 'Online' : validatedEvent.place,
            moderator: validatedEvent.moderator || null,
            // An alumni call's guest list is written from its alumni.
            guest: alumni ? alumni.participants.map(alumnusGuestLine) : (validatedEvent.guest || null),
            description: validatedEvent.description || null,
            poster_url: validatedEvent.poster_url || null,
            ...extraEventCols(validatedEvent),
            ...(tbc ? { date_tbc: true, start_at: null, end_at: null, show_on_website: false, registration_enabled: false } : {}),
            created_by: user.id,
          })
          .select()
          .single()

        if (error) {
          console.error('Create event error:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to create event' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (createLink) {
          const { error: linkError } = await supabase.from('event_join_links')
            .upsert({ event_id: data.id, url: createLink, updated_at: new Date().toISOString() })
          if (linkError) {
            // An online event without its link would confirm places with
            // no way in: it is not left half made.
            console.error('Save meeting link error:', linkError)
            await supabase.from('events').delete().eq('id', data.id)
            return new Response(
              JSON.stringify({ error: 'The meeting link could not be saved, so the event was not created. Please try again.' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        }

        if (alumni) {
          const planError = await writeAlumniPlan(data.id, alumni)
          if (planError) {
            // A call without its alumni is not left half made.
            console.error('Save alumni call plan error:', planError)
            await supabase.from('events').delete().eq('id', data.id)
            return bad('The alumni of this call could not be saved, so the call was not created. Please try again.', 500)
          }
        }

        // Log activity
        audit.subject(validatedEvent.title, data.id);

        console.log('Event created:', data.id)
        return new Response(
          JSON.stringify({ success: true, event: { ...data, join_url: createLink } }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'update': {
        // Validate event data including id
        const eventWithIdSchema = EventSchema.extend({
          id: z.string().uuid('Invalid event ID')
        })
        
        const eventResult = eventWithIdSchema.safeParse(event)
        if (!eventResult.success) {
          return new Response(
            JSON.stringify({ 
              error: 'Invalid event data',
              details: eventResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const validatedEvent = eventResult.data

        // =================================================================
        // AN ASSOCIATION ON DISPLAY DAY'S EVENT IS KEPT IN STEP BY THE DAY.
        // -----------------------------------------------------------------
        // Its date, times, title and registrations follow the day in Events >
        // Association on Display (see the 20260923140100 migration). Only
        // website visibility is decided here, so the archive switch works
        // on it like on any other event and nothing else can drift.
        // =================================================================
        const { data: linked } = await supabase
          .from('events').select('id, aod_day_id, online, place, event_type, date_tbc, date').eq('id', validatedEvent.id).maybeSingle()
        const wasAlumni = linked?.event_type === 'alumni_call'
        const isAlumni = (validatedEvent.event_type ?? 'other') === 'alumni_call'
        if (linked && wasAlumni !== isAlumni) return bad(ALUMNI_TYPE_CHANGE)
        if (isAlumni ? !canAlumniCalls : !hasEventAccess) {
          return bad(isAlumni ? 'Your role cannot change alumni calls.' : ALUMNI_ONLY, 403)
        }
        // The alumni and planning come with the call's own editor; the
        // archive's website switch sends the event alone and leaves them.
        let alumni: AlumniCallInput | null = null
        if (isAlumni && (body as { alumni?: unknown }).alumni !== undefined) {
          const read = await readAlumni(validatedEvent.division)
          if ('error' in read) return bad(read.error)
          alumni = read.value
        }
        const tbc = isAlumni && (alumni ? !!alumni.date_tbc : !!linked?.date_tbc)
        if (tbc && !alumni && (validatedEvent.show_on_website || validatedEvent.registration_enabled)) return bad(TBC_OFF_WEBSITE)
        const { data: savedLink } = await supabase
          .from('event_join_links').select('url').eq('event_id', validatedEvent.id).maybeSingle()
        const nowOnline = validatedEvent.online ?? false
        const wasOnline = linked?.online ?? false
        const incoming = validatedEvent.place.trim()
        // What the event's place and link become. `undefined` leaves the link as it is.
        let storePlace = validatedEvent.place
        let storeLink: string | null | undefined = undefined
        if (!linked?.aod_day_id) {
          if (nowOnline) {
            if (MEETING_LINK_RE.test(incoming)) {
              storeLink = incoming
              storePlace = 'Online'
            } else if (savedLink?.url && (ONLINE_WORD.test(incoming) || incoming === (linked?.place ?? '').trim())) {
              storePlace = 'Online' // the link already saved stays
            } else if (wasOnline && incoming === (linked?.place ?? '').trim()) {
              // An older online event with no link, its place untouched.
            } else if (tbc) {
              storePlace = 'Online' // an alumni call with no date yet: the link comes with the date
            } else {
              return new Response(
                JSON.stringify({ error: LINK_NEEDED }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }
          } else {
            const offline = placeProblem(false, validatedEvent.place)
            if (offline) {
              return new Response(
                JSON.stringify({ error: offline }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }
            // No longer online: its link goes.
            if (savedLink) storeLink = null
          }
        }
        // Fixing the date of a call that had none: an online call now needs
        // its link, like any online event.
        if (linked?.date_tbc && !tbc && nowOnline && !storeLink && !savedLink?.url) return bad(LINK_NEEDED)
        if (linked?.aod_day_id) {
          const { data, error } = await supabase
            .from('events')
            .update({ show_on_website: validatedEvent.show_on_website ?? false })
            .eq('id', validatedEvent.id)
            .select()
            .single()
          if (error) {
            console.error('Update AoD event error:', error)
            return new Response(
              JSON.stringify({ error: 'Failed to update event' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          return new Response(
            JSON.stringify({ success: true, event: data }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (storeLink) {
          const { error: linkError } = await supabase.from('event_join_links')
            .upsert({ event_id: validatedEvent.id, url: storeLink, updated_at: new Date().toISOString() })
          if (linkError) {
            console.error('Save meeting link error:', linkError)
            return new Response(
              JSON.stringify({ error: 'The meeting link could not be saved. Nothing was changed; please try again.' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        }
        const { data, error } = await supabase
          .from('events')
          .update({
            title: validatedEvent.title,
            date: validatedEvent.date,
            place: storePlace,
            moderator: validatedEvent.moderator || null,
            guest: alumni ? alumni.participants.map(alumnusGuestLine) : (validatedEvent.guest || null),
            description: validatedEvent.description || null,
            poster_url: validatedEvent.poster_url || null,
            ...extraEventCols(validatedEvent),
            ...(isAlumni
              ? tbc
                ? { date_tbc: true, date: linked?.date_tbc && linked.date ? linked.date : romeToday(), start_at: null, end_at: null, show_on_website: false, registration_enabled: false }
                : { date_tbc: false }
              : {}),
          })
          .eq('id', validatedEvent.id)
          .select()
          .single()

        if (error) {
          console.error('Update event error:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to update event' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (storeLink === null) await supabase.from('event_join_links').delete().eq('event_id', validatedEvent.id)

        if (alumni) {
          const planError = await writeAlumniPlan(validatedEvent.id, alumni)
          if (planError) {
            console.error('Save alumni call plan error:', planError)
            return bad('The call was saved, but its alumni and planning could not be. Please save it again.', 500)
          }
        }

        // Log activity
        audit.subject(validatedEvent.title, data.id);

        console.log('Event updated:', data.id)
        const joinUrl = storeLink === null ? null : (storeLink ?? savedLink?.url ?? null)
        return new Response(
          JSON.stringify({ success: true, event: { ...data, join_url: joinUrl } }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // The meeting links, for the organisers' edit forms: every event's,
      // or those of the events asked for.
      case 'join-links': {
        const ids = (body as { ids?: unknown }).ids
        let q = supabase.from('event_join_links').select('event_id, url')
        // Somebody who plans alumni calls only reads the links of alumni calls.
        if (!hasEventAccess) {
          const { data: calls } = await supabase.from('events').select('id').eq('event_type', 'alumni_call')
          q = q.in('event_id', ((calls || []) as { id: string }[]).map((c) => c.id))
        }
        if (Array.isArray(ids)) {
          const valid = ids.filter((x): x is string => typeof x === 'string' && /^[0-9a-f-]{36}$/i.test(x)).slice(0, 500)
          if (!valid.length) {
            return new Response(JSON.stringify({ links: {} }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }
          q = q.in('event_id', valid)
        }
        const { data: rows, error } = await q
        if (error) {
          console.error('Read meeting links error:', error)
          return new Response(
            JSON.stringify({ error: 'Could not read the meeting links' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        const links: Record<string, string> = {}
        for (const r of (rows || []) as { event_id: string; url: string }[]) links[r.event_id] = r.url
        return new Response(
          JSON.stringify({ links }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'delete': {
        // Validate event id
        const deleteResult = DeleteEventSchema.safeParse(event)
        if (!deleteResult.success) {
          return new Response(
            JSON.stringify({ 
              error: 'Invalid event ID',
              details: deleteResult.error.errors.map(e => e.message)
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get event name before deleting for logging
        const { data: existingEvent } = await supabase
          .from('events')
          .select('title, aod_day_id, event_type')
          .eq('id', deleteResult.data.id)
          .maybeSingle();
        if (existingEvent?.event_type === 'alumni_call' ? !canAlumniCalls : !hasEventAccess) {
          return bad(existingEvent?.event_type === 'alumni_call' ? 'Your role cannot delete alumni calls.' : ALUMNI_ONLY, 403)
        }

        // Deleting it here would take the day's attendance with it and leave
        // the day without an event; the day itself is deleted where it was
        // opened, and its event goes with it.
        if (existingEvent?.aod_day_id) {
          return new Response(
            JSON.stringify({ error: 'This is an Association on Display day. Delete the day from Events > Association on Display; its event and attendance go with it.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error } = await supabase
          .from('events')
          .delete()
          .eq('id', deleteResult.data.id)

        if (error) {
          console.error('Delete event error:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to delete event' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Log activity
        audit.subject(existingEvent?.title || null, deleteResult.data.id);

        console.log('Event deleted:', deleteResult.data.id)
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Error in admin-events:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}))
