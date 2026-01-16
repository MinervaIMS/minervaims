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
    .optional()
})

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
  user: { id: string; email: string },
  userRole: string,
  action: string,
  entityType: string,
  entityId: string | null,
  entityName: string,
  details?: Record<string, unknown>
) {
  try {
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      user_email: user.email || 'unknown',
      user_role: userRole,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      details: details || null,
    })
    console.log(`Activity logged: ${action} ${entityType} "${entityName}" by ${user.email}`)
  } catch (error) {
    console.error('Failed to log activity:', error)
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
      'head_of_operations', 'head_of_media'
    ]
    
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
    
    const hasEventAccess = isAdminEmail || 
      (userRoles && userRoles.some(r => eventAccessRoles.includes(r.role)))

    if (!hasEventAccess) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get primary role for logging
    const primaryRole = userRoles?.[0]?.role || (isAdminEmail ? 'president' : 'unknown')

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
        const { data, error } = await supabase
          .from('events')
          .insert({
            title: validatedEvent.title,
            date: validatedEvent.date,
            place: validatedEvent.place,
            moderator: validatedEvent.moderator || null,
            guest: validatedEvent.guest || null,
            description: validatedEvent.description || null,
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
        await logActivity(
          supabase,
          { id: user.id, email: user.email || 'unknown' },
          primaryRole,
          'create',
          'event',
          data.id,
          data.title,
          { date: data.date, place: data.place }
        )

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
        await logActivity(
          supabase,
          { id: user.id, email: user.email || 'unknown' },
          primaryRole,
          'update',
          'event',
          data.id,
          data.title,
          { date: data.date, place: data.place }
        )

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

        // Get event title before deleting for logging
        const { data: eventToDelete } = await supabase
          .from('events')
          .select('title')
          .eq('id', deleteResult.data.id)
          .single()

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
        await logActivity(
          supabase,
          { id: user.id, email: user.email || 'unknown' },
          primaryRole,
          'delete',
          'event',
          deleteResult.data.id,
          eventToDelete?.title || 'Unknown event'
        )

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