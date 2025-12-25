import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verify } from 'https://deno.land/x/djwt@v3.0.2/mod.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schemas
const FileMetadataSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title too long')
    .trim(),
  description: z.string()
    .max(2000, 'Description too long')
    .trim()
    .nullable()
    .optional(),
  file_url: z.string()
    .url('Invalid file URL')
    .max(500, 'URL too long'),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD required)')
    .refine(val => {
      const date = new Date(val)
      return !isNaN(date.getTime()) && date.getFullYear() >= 2000 && date.getFullYear() <= 2100
    }, 'Invalid date'),
  division: z.enum(['equity', 'investment', 'macro', 'portfolio', 'quant'], {
    errorMap: () => ({ message: 'Invalid division' })
  }),
  fund: z.enum(['long-short', 'multi-asset'])
    .nullable()
    .optional()
})

const ActionSchema = z.enum(['create', 'update', 'delete'])

const DeleteFileSchema = z.object({
  id: z.string().uuid('Invalid file ID')
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

// Create HMAC key for JWT verification
async function getJwtKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const encoder = new TextEncoder()
  return await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
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
    
    const rateLimit = checkRateLimit(`files:${ip}`, 30, 60 * 1000)
    
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

    // Verify admin token from header
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify JWT signature and claims
    let payload: { sub?: string; exp?: number }
    try {
      const key = await getJwtKey()
      payload = await verify(token, key) as { sub?: string; exp?: number }
      
      if (!payload.sub) {
        throw new Error('Invalid token payload')
      }
      
      // Check expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return new Response(
          JSON.stringify({ error: 'Token expired' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify admin still exists
      const { data: admin } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', payload.sub)
        .maybeSingle()

      if (!admin) {
        return new Response(
          JSON.stringify({ error: 'Invalid admin' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } catch (err) {
      console.error('Token verification failed:', err)
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
    const file = (body as { file?: unknown }).file

    console.log('Admin files action:', action)

    switch (action) {
      case 'create': {
        // Validate file data
        const fileResult = FileMetadataSchema.safeParse(file)
        if (!fileResult.success) {
          return new Response(
            JSON.stringify({ 
              error: 'Invalid file data',
              details: fileResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const validatedFile = fileResult.data
        
        // Validate fund is only set for portfolio division
        if (validatedFile.division !== 'portfolio' && validatedFile.fund) {
          return new Response(
            JSON.stringify({ error: 'Fund can only be set for Portfolio Management division' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data, error } = await supabase
          .from('archive_files')
          .insert({
            title: validatedFile.title,
            description: validatedFile.description || null,
            file_url: validatedFile.file_url,
            date: validatedFile.date,
            division: validatedFile.division,
            fund: validatedFile.fund || null,
          })
          .select()
          .single()

        if (error) {
          console.error('Create file error:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to create file record' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('File created:', data.id)
        return new Response(
          JSON.stringify({ success: true, file: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'update': {
        // Validate file data including id
        const fileWithIdSchema = FileMetadataSchema.extend({
          id: z.string().uuid('Invalid file ID')
        })
        
        const fileResult = fileWithIdSchema.safeParse(file)
        if (!fileResult.success) {
          return new Response(
            JSON.stringify({ 
              error: 'Invalid file data',
              details: fileResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const validatedFile = fileResult.data
        
        // Validate fund is only set for portfolio division
        if (validatedFile.division !== 'portfolio' && validatedFile.fund) {
          return new Response(
            JSON.stringify({ error: 'Fund can only be set for Portfolio Management division' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data, error } = await supabase
          .from('archive_files')
          .update({
            title: validatedFile.title,
            description: validatedFile.description || null,
            file_url: validatedFile.file_url,
            date: validatedFile.date,
            division: validatedFile.division,
            fund: validatedFile.fund || null,
          })
          .eq('id', validatedFile.id)
          .select()
          .single()

        if (error) {
          console.error('Update file error:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to update file record' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('File updated:', data.id)
        return new Response(
          JSON.stringify({ success: true, file: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'delete': {
        // Validate file id
        const deleteResult = DeleteFileSchema.safeParse(file)
        if (!deleteResult.success) {
          return new Response(
            JSON.stringify({ 
              error: 'Invalid file ID',
              details: deleteResult.error.errors.map(e => e.message)
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get file info first to delete from storage
        const { data: fileData } = await supabase
          .from('archive_files')
          .select('file_url')
          .eq('id', deleteResult.data.id)
          .maybeSingle()

        // Delete from database
        const { error } = await supabase
          .from('archive_files')
          .delete()
          .eq('id', deleteResult.data.id)

        if (error) {
          console.error('Delete file error:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to delete file' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Try to delete from storage if it's in our bucket
        if (fileData?.file_url && fileData.file_url.includes('archive-files')) {
          try {
            const urlParts = fileData.file_url.split('/archive-files/')
            if (urlParts.length > 1) {
              const filePath = urlParts[1]
              await supabase.storage.from('archive-files').remove([filePath])
            }
          } catch (storageError) {
            console.warn('Could not delete file from storage:', storageError)
          }
        }

        console.log('File deleted:', deleteResult.data.id)
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
    console.error('Error in admin-files:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})