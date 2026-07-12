/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
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
    .max(500, 'URL too long')
    .optional(),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD required)')
    .refine(val => {
      const date = new Date(val)
      return !isNaN(date.getTime()) && date.getFullYear() >= 2000 && date.getFullYear() <= 2100
    }, 'Invalid date'),
  division: z.enum(['equity', 'investment', 'macro', 'portfolio', 'quant'], {
    errorMap: () => ({ message: 'Invalid division' })
  }),
  fund: z.enum(['long-short', 'multi-asset', 'dps', 'pir'])
    .nullable()
    .optional(),
  status: z.enum(['draft', 'published', 'blocked']).optional(),
  page_count: z.number().int().positive().max(5000).nullable().optional(),
  project: z.string().max(200).nullable().optional()
})

const ActionSchema = z.enum(['create', 'update', 'delete', 'upload', 'set-status', 'favourite'])

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
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has file access
    const isAdminEmail = user.email === 'as.minerva@unibocconi.it'
    
    // Full access roles - can manage files for all divisions
    // Role x division model (Phase 0). Full access roles see/manage all
    // divisions; division-scoped roles manage only their own division.
    const fullAccessRoles = [
      'admin', 'president', 'vice_president', 'head_of_asset_management',
      'head_of_operations', 'head_of_media'
    ]
    const scopedRoles = ['head_of_division', 'portfolio_manager', 'team_leader', 'analyst']
    const blockRoles = ['admin', 'president', 'vice_president', 'head_of_asset_management']

    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role, division')
      .eq('user_id', user.id)

    const roleRows = (userRoles || []) as { role: string; division: string | null }[]
    const userRoleNames = roleRows.map(r => r.role)
    const hasFullAccess = isAdminEmail || userRoleNames.some(r => fullAccessRoles.includes(r))
    const canBlock = isAdminEmail || userRoleNames.some(r => blockRoles.includes(r))
    const isHead = roleRows.some(r => r.role === 'head_of_division')

    // Divisions the user is scoped to (head_of_division / portfolio_manager /
    // team_leader / analyst carry their division on the role row).
    const scopedDivisions = roleRows
      .filter(r => scopedRoles.includes(r.role))
      .map(r => r.division || (r.role === 'portfolio_manager' ? 'portfolio' : null))
      .filter((d): d is string => !!d && d !== 'none' && d !== 'board')

    const allowedDivisions: string[] | null = hasFullAccess ? null : (scopedDivisions.length ? scopedDivisions : null)
    const hasFileAccess = hasFullAccess || scopedDivisions.length > 0

    if (!hasFileAccess) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check content type to handle file uploads vs JSON
    const contentType = req.headers.get('content-type') || ''
    
    // Handle multipart form data (file uploads)
    if (contentType.includes('multipart/form-data')) {
      try {
        const formData = await req.formData()
        const file = formData.get('file') as File | null
        const division = formData.get('division') as string | null
        
        if (!file) {
          return new Response(
            JSON.stringify({ error: 'No file provided' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // Validate file type
        if (file.type !== 'application/pdf') {
          return new Response(
            JSON.stringify({ error: 'Only PDF files are allowed' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          return new Response(
            JSON.stringify({ error: 'File size must be less than 10MB' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // Check division restriction
        if (allowedDivisions && division && !allowedDivisions.includes(division)) {
          return new Response(
            JSON.stringify({ error: 'You can only upload files for your division' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // Generate safe filename
        const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const fileName = `${Date.now()}-${originalName}`
        
        // Upload to storage using service role
        const arrayBuffer = await file.arrayBuffer()
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('archive-files')
          .upload(fileName, arrayBuffer, {
            contentType: 'application/pdf',
            cacheControl: '3600',
            upsert: false,
          })
        
        if (uploadError) {
          console.error('Storage upload error:', uploadError)
          return new Response(
            JSON.stringify({ error: 'Failed to upload file to storage' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('archive-files')
          .getPublicUrl(uploadData.path)
        
        console.log('File uploaded successfully:', uploadData.path)
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            file_url: urlData.publicUrl,
            path: uploadData.path 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (formError) {
        console.error('Form data processing error:', formError)
        return new Response(
          JSON.stringify({ error: 'Failed to process file upload' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Parse JSON request body for metadata operations
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
        JSON.stringify({ error: 'Invalid action. Must be create, update, delete, or upload.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const action = actionResult.data
    const file = (body as { file?: unknown }).file

    console.log('Admin files action:', action)

    switch (action) {
      case 'create': {
        // Validate file data - file_url is required for create
        const createSchema = FileMetadataSchema.extend({
          file_url: z.string().url('Invalid file URL').max(500, 'URL too long')
        })
        const fileResult = createSchema.safeParse(file)
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
        
        // Check division restriction for non-full-access users
        if (allowedDivisions && !allowedDivisions.includes(validatedFile.division)) {
          return new Response(
            JSON.stringify({ error: 'You can only upload files for your division' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
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
            // Heads can publish directly; others default to draft for review.
            status: validatedFile.status || (isHead || hasFullAccess ? 'published' : 'draft'),
            project: validatedFile.project || null,
            page_count: validatedFile.page_count ?? null,
            created_by: user.id,
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

        // Log activity
        const primaryRole = userRoleNames[0] || 'member';
        await logActivity(
          supabase,
          user.id,
          user.email || 'unknown',
          primaryRole,
          'create',
          'file',
          data.id,
          validatedFile.title,
          { division: validatedFile.division, fund: validatedFile.fund }
        );

        console.log('File created:', data.id)
        return new Response(
          JSON.stringify({ success: true, file: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'update': {
        // Validate file data including id and file_url
        const updateSchema = FileMetadataSchema.extend({
          id: z.string().uuid('Invalid file ID'),
          file_url: z.string().url('Invalid file URL').max(500, 'URL too long')
        })
        
        const fileResult = updateSchema.safeParse(file)
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
        
        // Check division restriction for non-full-access users
        if (allowedDivisions && !allowedDivisions.includes(validatedFile.division)) {
          return new Response(
            JSON.stringify({ error: 'You can only update files for your division' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
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
            ...(validatedFile.status ? { status: validatedFile.status } : {}),
            project: validatedFile.project ?? null,
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

        // Log activity
        const primaryRole = userRoleNames[0] || 'member';
        await logActivity(
          supabase,
          user.id,
          user.email || 'unknown',
          primaryRole,
          'update',
          'file',
          data.id,
          validatedFile.title,
          { division: validatedFile.division, fund: validatedFile.fund }
        );

        console.log('File updated:', data.id)
        return new Response(
          JSON.stringify({ success: true, file: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'favourite': {
        // Star / unstar a report to pin it on top. At most five favourites.
        const favSchema = z.object({ id: z.string().uuid(), is_favourite: z.boolean() })
        const parsed = favSchema.safeParse(file)
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: 'Invalid request' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        if (parsed.data.is_favourite) {
          const { count } = await supabase.from('archive_files')
            .select('id', { count: 'exact', head: true }).eq('is_favourite', true).neq('id', parsed.data.id)
          if ((count ?? 0) >= 5) {
            return new Response(JSON.stringify({ error: 'You can pin at most 5 favourites.' }),
              { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }
        }
        const { error } = await supabase.from('archive_files')
          .update({ is_favourite: parsed.data.is_favourite }).eq('id', parsed.data.id)
        if (error) {
          return new Response(JSON.stringify({ error: 'Failed to update favourite' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        return new Response(JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'set-status': {
        // Publish / block / revert to draft. Blocking is reserved for
        // President, Vice President and Head of Asset Management (report 7.1).
        const statusSchema = z.object({
          id: z.string().uuid('Invalid file ID'),
          status: z.enum(['draft', 'published', 'blocked']),
        })
        const parsed = statusSchema.safeParse(file)
        if (!parsed.success) {
          return new Response(
            JSON.stringify({ error: 'Invalid status request' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        if (parsed.data.status === 'blocked' && !canBlock) {
          return new Response(
            JSON.stringify({ error: 'Only the President, Vice President or Head of Asset Management can block a report.' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        const { data: existing } = await supabase
          .from('archive_files').select('division, status').eq('id', parsed.data.id).maybeSingle()
        if (allowedDivisions && existing && !allowedDivisions.includes(existing.division)) {
          return new Response(
            JSON.stringify({ error: 'You can only change reports in your division' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        // A blocked report can only be unblocked by someone who can block.
        if (existing?.status === 'blocked' && !canBlock) {
          return new Response(
            JSON.stringify({ error: 'This report is blocked and can only be changed by senior roles.' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        const { error } = await supabase.from('archive_files')
          .update({ status: parsed.data.status }).eq('id', parsed.data.id)
        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to update status' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        return new Response(
          JSON.stringify({ success: true }),
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

        // Get file info first to check division and delete from storage
        const { data: fileData } = await supabase
          .from('archive_files')
          .select('file_url, division, title')
          .eq('id', deleteResult.data.id)
          .maybeSingle()
        
        // Check division restriction for non-full-access users
        if (allowedDivisions && fileData && !allowedDivisions.includes(fileData.division)) {
          return new Response(
            JSON.stringify({ error: 'You can only delete files from your division' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

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

        // Log activity
        const primaryRole = userRoleNames[0] || 'member';
        await logActivity(
          supabase,
          user.id,
          user.email || 'unknown',
          primaryRole,
          'delete',
          'file',
          deleteResult.data.id,
          fileData?.title || 'Unknown file',
          { division: fileData?.division }
        );

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