/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

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
  place: z.string()
    .min(1, 'Place is required')
    .max(200, 'Place too long')
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
  event_type: z.enum(['meeting','assembly','aperitivo','division_event','online_call','guest','alumni_call','association_wide','other']).optional(),
  division: z.enum(['equity','investment','macro','portfolio','quant','media','operations','board','none']).nullable().optional(),
  start_at: z.string().nullable().optional(),
  end_at: z.string().nullable().optional(),
  online: z.boolean().optional(),
  registration_enabled: z.boolean().optional(),
  registration_audience: z.enum(['members','members_external','guests','public']).optional(),
  show_on_website: z.boolean().optional(),
  in_archive: z.boolean().optional()
})

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
    show_on_website: v.show_on_website ?? true,
    // Whether the event is recorded in the Events archive. The creator
    // decides; online calls, guest events and alumni calls default to yes.
    in_archive: v.in_archive ?? ['online_call','guest','alumni_call'].includes(String(v.event_type ?? '')),
  }
}

const ActionSchema = z.enum(['create', 'update', 'delete'])

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

// Activity logging helper
async function logActivity(
  supabase: any,
  userId: string,
  userEmail: string,
  userRole: string,
  action: string,
  entityType: string,
  entityId: string | null,
  entityName: string | null,
  details?: Record<string, unknown>
) {
  try {
    await supabase.from('activity_logs').insert({
      user_id: userId,
      user_email: userEmail,
      user_role: userRole,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      details: details || null,
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

Deno.serve(async (req) => {
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
    const hasEventAccess = isAdminEmail || 
      userRoleNames.some(r => eventAccessRoles.includes(r))

    if (!hasEventAccess) {
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
        JSON.stringify({ error: 'Invalid action. Must be create, update, or delete.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const action = actionResult.data
    const event = (body as { event?: unknown }).event

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
        // Alumni calls are created ONLY through Events > Alumni Calls, which
        // owns their planning workflow; this endpoint refuses to create one.
        if (validatedEvent.event_type === 'alumni_call') {
          return new Response(
            JSON.stringify({ error: 'Alumni calls are created from Events > Alumni Calls, not from Create Event.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        const { data, error } = await supabase
          .from('events')
          .insert({
            title: validatedEvent.title,
            date: validatedEvent.date,
            place: validatedEvent.place,
            moderator: validatedEvent.moderator || null,
            guest: validatedEvent.guest || null,
            description: validatedEvent.description || null,
            poster_url: validatedEvent.poster_url || null,
            ...extraEventCols(validatedEvent),
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

        // Log activity
        await logActivity(supabase, user.id, user.email!, primaryRole, 'create', 'event', data.id, validatedEvent.title);

        console.log('Event created:', data.id)
        return new Response(
          JSON.stringify({ success: true, event: data }),
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
        const { data, error } = await supabase
          .from('events')
          .update({
            title: validatedEvent.title,
            date: validatedEvent.date,
            place: validatedEvent.place,
            moderator: validatedEvent.moderator || null,
            guest: validatedEvent.guest || null,
            description: validatedEvent.description || null,
            poster_url: validatedEvent.poster_url || null,
            ...extraEventCols(validatedEvent),
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

        // Log activity
        await logActivity(supabase, user.id, user.email!, primaryRole, 'update', 'event', data.id, validatedEvent.title);

        console.log('Event updated:', data.id)
        return new Response(
          JSON.stringify({ success: true, event: data }),
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
          .select('title')
          .eq('id', deleteResult.data.id)
          .maybeSingle();

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
        await logActivity(supabase, user.id, user.email!, primaryRole, 'delete', 'event', deleteResult.data.id, existingEvent?.title || null);

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
})
