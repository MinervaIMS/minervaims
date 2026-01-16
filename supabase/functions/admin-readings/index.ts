import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schemas
const ReadingSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string()
    .min(1, 'Title is required')
    .max(500, 'Title too long')
    .trim(),
  author: z.string()
    .min(1, 'Author is required')
    .max(300, 'Author name too long')
    .trim(),
  description: z.string()
    .min(1, 'Description is required')
    .max(2000, 'Description too long')
    .trim(),
  reading_type: z.enum(['academic_papers', 'technical_textbooks', 'free_time_readings']),
  contributor_name: z.string().max(100).trim(),
  contributor_surname: z.string().max(100).trim(),
  contributor_role: z.string().max(100).trim(),
  publication_year: z.number().int().min(1900).max(new Date().getFullYear()).nullable().optional(),
})

const ActionSchema = z.enum(['create', 'update', 'delete', 'reorder'])

const DeleteReadingSchema = z.object({
  id: z.string().uuid('Invalid reading ID')
})

const ReorderSchema = z.array(z.object({
  id: z.string().uuid(),
  display_order: z.number().int().min(0)
}))

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

// Roles that can access readings management
const readingsAccessRoles = [
  'admin', 'president', 'vice_president', 'head_of_asset_management',
  'head_of_equity', 'head_of_investment', 'head_of_macro', 'head_of_portfolio', 'head_of_quant',
  'portfolio_manager'
]

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
    
    const rateLimit = checkRateLimit(`readings:${ip}`, 30, 60 * 1000)
    
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

    // Check if user has readings access
    const isAdminEmail = user.email === 'as.minerva@unibocconi.it'
    
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
    
    const hasReadingsAccess = isAdminEmail || 
      (userRoles && userRoles.some(r => readingsAccessRoles.includes(r.role)))

    if (!hasReadingsAccess) {
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
        JSON.stringify({ error: 'Invalid action. Must be create, update, delete, or reorder.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const action = actionResult.data
    console.log('Admin readings action:', action)

    switch (action) {
      case 'create': {
        const reading = (body as { reading?: unknown }).reading
        const readingResult = ReadingSchema.safeParse(reading)
        if (!readingResult.success) {
          return new Response(
            JSON.stringify({ 
              error: 'Invalid reading data',
              details: readingResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get max display_order
        const { data: maxOrderData } = await supabase
          .from('readings')
          .select('display_order')
          .order('display_order', { ascending: false })
          .limit(1)

        const nextOrder = (maxOrderData && maxOrderData.length > 0) 
          ? (maxOrderData[0].display_order + 1) 
          : 0

        const validatedReading = readingResult.data
        const { data, error } = await supabase
          .from('readings')
          .insert({
            title: validatedReading.title,
            author: validatedReading.author,
            description: validatedReading.description,
            reading_type: validatedReading.reading_type,
            contributor_name: validatedReading.contributor_name,
            contributor_surname: validatedReading.contributor_surname,
            contributor_role: validatedReading.contributor_role,
            publication_year: validatedReading.publication_year || null,
            display_order: nextOrder,
          })
          .select()
          .single()

        if (error) {
          console.error('Create reading error:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to create reading' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Log activity
        await logActivity(
          supabase,
          { id: user.id, email: user.email || 'unknown' },
          primaryRole,
          'create',
          'reading',
          data.id,
          data.title,
          { author: data.author, reading_type: data.reading_type }
        )

        console.log('Reading created:', data.id)
        return new Response(
          JSON.stringify({ success: true, reading: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'update': {
        const reading = (body as { reading?: unknown }).reading
        const readingWithIdSchema = ReadingSchema.extend({
          id: z.string().uuid('Invalid reading ID')
        })
        
        const readingResult = readingWithIdSchema.safeParse(reading)
        if (!readingResult.success) {
          return new Response(
            JSON.stringify({ 
              error: 'Invalid reading data',
              details: readingResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const validatedReading = readingResult.data
        const { data, error } = await supabase
          .from('readings')
          .update({
            title: validatedReading.title,
            author: validatedReading.author,
            description: validatedReading.description,
            reading_type: validatedReading.reading_type,
            contributor_name: validatedReading.contributor_name,
            contributor_surname: validatedReading.contributor_surname,
            contributor_role: validatedReading.contributor_role,
            publication_year: validatedReading.publication_year || null,
          })
          .eq('id', validatedReading.id)
          .select()
          .single()

        if (error) {
          console.error('Update reading error:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to update reading' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Log activity
        await logActivity(
          supabase,
          { id: user.id, email: user.email || 'unknown' },
          primaryRole,
          'update',
          'reading',
          data.id,
          data.title,
          { author: data.author, reading_type: data.reading_type }
        )

        console.log('Reading updated:', data.id)
        return new Response(
          JSON.stringify({ success: true, reading: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'delete': {
        const reading = (body as { reading?: unknown }).reading
        const deleteResult = DeleteReadingSchema.safeParse(reading)
        if (!deleteResult.success) {
          return new Response(
            JSON.stringify({ 
              error: 'Invalid reading ID',
              details: deleteResult.error.errors.map(e => e.message)
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get reading info before deleting for logging
        const { data: readingToDelete } = await supabase
          .from('readings')
          .select('title')
          .eq('id', deleteResult.data.id)
          .single()

        const { error } = await supabase
          .from('readings')
          .delete()
          .eq('id', deleteResult.data.id)

        if (error) {
          console.error('Delete reading error:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to delete reading' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Log activity
        await logActivity(
          supabase,
          { id: user.id, email: user.email || 'unknown' },
          primaryRole,
          'delete',
          'reading',
          deleteResult.data.id,
          readingToDelete?.title || 'Unknown reading'
        )

        console.log('Reading deleted:', deleteResult.data.id)
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'reorder': {
        const readings = (body as { readings?: unknown }).readings
        const reorderResult = ReorderSchema.safeParse(readings)
        if (!reorderResult.success) {
          return new Response(
            JSON.stringify({ 
              error: 'Invalid reorder data',
              details: reorderResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Update all readings in a transaction-like manner
        for (const item of reorderResult.data) {
          const { error } = await supabase
            .from('readings')
            .update({ display_order: item.display_order })
            .eq('id', item.id)

          if (error) {
            console.error('Reorder error for item:', item.id, error)
          }
        }

        // Log activity
        await logActivity(
          supabase,
          { id: user.id, email: user.email || 'unknown' },
          primaryRole,
          'reorder',
          'reading',
          null,
          `${reorderResult.data.length} readings`,
          { count: reorderResult.data.length }
        )

        console.log('Readings reordered')
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
    console.error('Error in admin-readings:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})