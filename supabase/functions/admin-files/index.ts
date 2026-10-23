/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { audited } from '../_shared/activity.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import { readFileField } from '../_shared/form-file.ts';
import {
  REPORT_TYPES, AUTHORS_MAX, AUTHOR_NAME_MAX, AUTHOR_ROLE_MAX, TAGS_MAX, TAG_LENGTH_MAX,
  normaliseAuthors, normaliseTags, reportPdfMetadata, sameMetadata, type ReportAuthor,
} from '../_shared/report-meta.ts';
import { stampPdfMetadata } from '../_shared/pdf-metadata.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// =====================================================================
// HOW LONG A REPORT'S DESCRIPTION MAY BE.
// ---------------------------------------------------------------------
// It was 2000 characters, and that number rejected ordinary work. An
// equity research abstract - the team, the company, the industry
// backdrop, the methodology, the recommendation and the target price,
// and the credits at the end - runs to well over two thousand
// characters as a matter of course; the one that reported this was
// 2308, and it was refused in full with nothing saved.
//
// There was never a storage reason for the number. `description` is a
// Postgres TEXT column with no length constraint of its own, and the
// event description next door has been allowed 5000 all along. 8000 is
// roughly twelve hundred words: longer than any abstract anyone has
// written for this archive, and still a bound rather than an invitation.
//
// The client states the same number under the field, so it is visible
// while the description is being written rather than discovered when it
// is submitted. If this changes, change REPORT_DESCRIPTION_MAX in
// src/lib/archive-limits.ts with it.
// =====================================================================
const REPORT_DESCRIPTION_MAX = 8000

// One author: a name and a role as printed on the cover, and, when picked
// from the list, the Members or Alumni entry the report page links to.
// Never an email or a phone number: nothing else is stored.
const AuthorSchema = z.object({
  name: z.string().trim().min(1).max(AUTHOR_NAME_MAX),
  role: z.string().trim().max(AUTHOR_ROLE_MAX).nullable().optional(),
  member_id: z.string().uuid().nullable().optional(),
  alumni_id: z.string().uuid().nullable().optional(),
})

// Input validation schemas
const FileMetadataSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title too long')
    .trim(),
  description: z.string()
    .trim()
    // Says WHAT IS WRONG WITH THIS ONE, not that a rule exists: a
    // refusal a writer can act on names the overshoot. The client turns
    // this into the sentence in the toast.
    .refine(
      (v) => v.length <= REPORT_DESCRIPTION_MAX,
      (v) => ({
        message: `too long by ${v.length - REPORT_DESCRIPTION_MAX} characters `
          + `(${v.length} of a maximum ${REPORT_DESCRIPTION_MAX}). Please shorten it and save again.`,
      }),
    )
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
  project: z.string().max(200).nullable().optional(),
  // Step 93. Left out of a request, each keeps its stored value; the
  // address (`slug`) is never accepted from a client at all (the database
  // makes it, see archive_files_address_guard).
  report_type: z.enum(REPORT_TYPES as [string, ...string[]]).nullable().optional(),
  tags: z.array(z.string().max(TAG_LENGTH_MAX * 2)).max(TAGS_MAX * 2).optional(),
  authors: z.array(AuthorSchema).max(AUTHORS_MAX).optional(),
})

const ActionSchema = z.enum([
  'create', 'update', 'delete', 'upload', 'set-status', 'favourite',
  // Deleting a report is reversible for a month. See RECOVERY_DAYS below.
  'restore', 'purge', 'purge-expired',
  // Step 93: several reports at once; the PDFs' own metadata; the
  // division pages' "How we work" and "Flagship work".
  'bulk-update', 'pdf-metadata-check', 'pdf-metadata-apply', 'division-page-save',
])

const DeleteFileSchema = z.object({
  id: z.string().uuid('Invalid file ID')
})

// =====================================================================
// THE RECOVERY WINDOW.
// ---------------------------------------------------------------------
// `delete` used to remove the row and the stored PDF in the same call.
// One mis-click and a report, its title, its division, its date and its
// file were gone with nothing to appeal to.
//
// A deletion now stamps `deleted_at` and leaves everything else exactly
// as it was - the row, the file in storage, and every reference to
// either. For thirty days the report can be restored by clearing that
// stamp, and it comes back complete because nothing was taken away.
// After thirty days it is purged for real, file included.
//
// The number lives here and is sent to the client with every list, so
// the interface counts down from the same figure the server enforces
// rather than from a second copy of it.
// =====================================================================
const RECOVERY_DAYS = 30
const RECOVERY_MS = RECOVERY_DAYS * 24 * 60 * 60 * 1000

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

/**
 * Remove a report for good: the stored PDF first, then the row.
 *
 * That order matters. If the row went first and the storage call then
 * failed, the object would be left behind with nothing pointing at it and
 * nothing to find it by. A failed storage removal is logged and the row is
 * still taken, because a report nobody can reach is the outcome asked for.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function purgeReport(supabase: any, id: string, fileUrl: string | null, originalPath: string | null = null) {
  if (fileUrl && fileUrl.includes('archive-files')) {
    try {
      const parts = fileUrl.split('/archive-files/')
      if (parts.length > 1) await supabase.storage.from('archive-files').remove([parts[1]])
    } catch (storageError) {
      console.warn('Could not delete file from storage:', storageError)
    }
  }
  // The untouched original kept when the PDF's metadata was written goes
  // with it: a purged report leaves nothing behind.
  if (originalPath) {
    try {
      await supabase.storage.from(ORIGINALS_BUCKET).remove([originalPath])
    } catch (storageError) {
      console.warn('Could not delete the kept original:', storageError)
    }
  }
  await supabase.from('archive_files').delete().eq('id', id)
}

// =====================================================================
// THE PDF SAYS WHAT THE PAGE SAYS (Step 93).
// ---------------------------------------------------------------------
// Every report's PDF carries the report page's title, authors, summary
// and tags as its own Title, Author, Subject and Keywords, with the
// Society as Creator (report-meta.ts builds them, pdf-metadata.ts writes
// them as an incremental update: the original bytes are kept as they are
// and the details are appended after them).
//
// NOTHING IS OVERWRITTEN WITHOUT A COPY. Before a stored PDF is replaced
// by its stamped version for the first time, the file exactly as it was
// uploaded is copied to the private bucket `archive-originals`, under the
// same path, and the row records it (`pdf_original_path`). Every later
// stamp starts again from that copy, so a file never carries more than
// one update, and the original can always be put back.
//
// The stored file keeps its path, so every link to it, shared or
// printed, keeps working and now opens the file with its details.
// =====================================================================
const ORIGINALS_BUCKET = 'archive-originals'
// How many PDFs one `pdf-metadata-apply` call writes. Each is read,
// copied and written once; four keeps a call well inside the function's
// time and memory even with the archive's largest files (about 10 MB).
const STAMP_BATCH = 4

const REPORT_FIELDS = 'id, title, date, division, fund, status, description, report_type, tags, authors, file_url, slug, pdf_metadata, pdf_metadata_at, pdf_original_path, deleted_at'

/** The object path inside `archive-files`, or null for a file stored anywhere else. */
function storagePath(fileUrl: string | null | undefined): string | null {
  const parts = String(fileUrl || '').split('/archive-files/')
  if (parts.length < 2 || !parts[1]) return null
  try {
    return decodeURIComponent(parts[1].split('?')[0])
  } catch {
    return null
  }
}

async function download(supabase: any, bucket: string, path: string): Promise<Uint8Array> {
  const { data, error } = await supabase.storage.from(bucket).download(path)
  if (error || !data) throw new Error(`The file could not be read from ${bucket} (${error?.message || 'missing'}).`)
  return new Uint8Array(await data.arrayBuffer())
}

type StampOutcome = { ok: true; changed: boolean } | { ok: false; reason: string }

/** Whether a report's PDF already says what its page says, and if not whether it can. */
function stampNeed(row: any): { needed: boolean; reason?: string } {
  if (sameMetadata(row.pdf_metadata, reportPdfMetadata(row))) return { needed: false }
  if (!storagePath(row.file_url)) return { needed: false, reason: 'The PDF is not stored in the archive, so its details cannot be written.' }
  return { needed: true }
}

/** Write the report page's details into the report's PDF (see above). Never throws. */
async function stampReport(supabase: any, row: any): Promise<StampOutcome> {
  try {
    const meta = reportPdfMetadata(row)
    if (sameMetadata(row.pdf_metadata, meta)) return { ok: true, changed: false }
    const path = storagePath(row.file_url)
    if (!path) return { ok: false, reason: 'The PDF is not stored in the archive, so its details cannot be written.' }

    let original: Uint8Array
    if (row.pdf_original_path === path) {
      original = await download(supabase, ORIGINALS_BUCKET, path)
    } else {
      // First time for this file: keep the original before anything else.
      original = await download(supabase, 'archive-files', path)
      const { error: copyError } = await supabase.storage.from(ORIGINALS_BUCKET)
        .upload(path, original, { contentType: 'application/pdf', upsert: true })
      if (copyError) return { ok: false, reason: `The original could not be kept (${copyError.message}), so the PDF was left as it is.` }
      const { error: markError } = await supabase.from('archive_files').update({ pdf_original_path: path }).eq('id', row.id)
      if (markError) return { ok: false, reason: 'The copy of the original could not be recorded, so the PDF was left as it is.' }
    }

    const stamped = await stampPdfMetadata(original, meta)
    const { error: writeError } = await supabase.storage.from('archive-files')
      .upload(path, stamped, { contentType: 'application/pdf', cacheControl: '3600', upsert: true })
    if (writeError) return { ok: false, reason: `The PDF could not be written (${writeError.message}).` }
    await supabase.from('archive_files')
      .update({ pdf_metadata: meta, pdf_metadata_at: new Date().toISOString() })
      .eq('id', row.id)
    return { ok: true, changed: true }
  } catch (e) {
    return { ok: false, reason: String((e as Error)?.message || e).slice(0, 300) }
  }
}

Deno.serve(audited('admin-files', async (req, audit) => {
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
    audit.actor(user, roleRows.map((r) => r.role))
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
        // `readFileField` instead of a cast: a field that is not actually a file
        // now reads as no file at all, which is the refusal below rather than a
        // crash further down. See _shared/form-file.ts. A real upload is
        // unaffected.
        const file = readFileField(formData, 'file')
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
        JSON.stringify({ error: 'Invalid action. Must be create, update, delete, or upload.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const action = actionResult.data
    audit.request(action, body as Record<string, unknown>)
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
            // The database fills the type from the division when none is given.
            report_type: validatedFile.report_type ?? null,
            tags: normaliseTags(validatedFile.tags),
            authors: normaliseAuthors(validatedFile.authors as ReportAuthor[] | undefined),
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
        audit.subject(validatedFile.title, data.id);
        const pdfMetadata = await stampReport(supabase, data)
        audit.note({ division: validatedFile.division, fund: validatedFile.fund, pdf_metadata: pdfMetadata.ok ? 'written' : 'not written' });

        console.log('File created:', data.id)
        return new Response(
          JSON.stringify({ success: true, file: data, pdf_metadata: pdfMetadata }),
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
            ...(validatedFile.report_type !== undefined ? { report_type: validatedFile.report_type } : {}),
            ...(validatedFile.tags !== undefined ? { tags: normaliseTags(validatedFile.tags) } : {}),
            ...(validatedFile.authors !== undefined
              ? { authors: normaliseAuthors(validatedFile.authors as ReportAuthor[]) } : {}),
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
        audit.subject(validatedFile.title, data.id);
        const pdfMetadata = await stampReport(supabase, data)
        audit.note({ division: validatedFile.division, fund: validatedFile.fund, pdf_metadata: pdfMetadata.ok ? (pdfMetadata.changed ? 'written' : 'unchanged') : 'not written' });

        console.log('File updated:', data.id)
        return new Response(
          JSON.stringify({ success: true, file: data, pdf_metadata: pdfMetadata }),
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

        // Get file info first to check division
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

        // SOFT DELETE. The row stays, the PDF stays in storage, and the
        // report simply stops being live: the public policy excludes
        // `deleted_at is not null`, and the workspace archive moves it to
        // Recently deleted. Nothing is destroyed until the window expires,
        // which is what makes `restore` able to give the report back whole.
        const deletedAt = new Date().toISOString()
        const { error } = await supabase
          .from('archive_files')
          .update({ deleted_at: deletedAt })
          .eq('id', deleteResult.data.id)
          .is('deleted_at', null)

        if (error) {
          console.error('Delete file error:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to delete file' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Log activity
        const primaryRole = userRoleNames[0] || 'member';
        audit.subject(fileData?.title || 'Unknown file', deleteResult.data.id);
        audit.note({ division: fileData?.division, recoverable_until: new Date(Date.now() + RECOVERY_MS).toISOString() });

        console.log('File moved to the recovery window:', deleteResult.data.id)
        return new Response(
          JSON.stringify({ success: true, deleted_at: deletedAt, recovery_days: RECOVERY_DAYS }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'restore': {
        // Put a deleted report back. Everything it had is still there, so
        // there is nothing to rebuild: the stamp is cleared and the report
        // returns to the status it held when it was deleted - a draft comes
        // back a draft, a published report comes back published.
        const parsed = DeleteFileSchema.safeParse(file)
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: 'Invalid file ID' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const { data: existing } = await supabase
          .from('archive_files')
          .select('division, title, deleted_at')
          .eq('id', parsed.data.id)
          .maybeSingle()

        if (!existing || !existing.deleted_at) {
          return new Response(JSON.stringify({ error: 'That report is not in the recovery window.' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        if (allowedDivisions && !allowedDivisions.includes(existing.division)) {
          return new Response(JSON.stringify({ error: 'You can only restore reports from your division' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        // Expired is expired, whatever the interface still shows. A stale tab
        // must not be able to resurrect a report the window has closed on.
        if (Date.now() - new Date(existing.deleted_at).getTime() > RECOVERY_MS) {
          return new Response(JSON.stringify({ error: `The ${RECOVERY_DAYS}-day recovery period for that report has ended.` }),
            { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const { error } = await supabase.from('archive_files')
          .update({ deleted_at: null }).eq('id', parsed.data.id)
        if (error) {
          return new Response(JSON.stringify({ error: 'Failed to restore the report' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        audit.subject(existing.title || 'Unknown file', parsed.data.id);
        audit.note({ division: existing.division, operation: 'restore' });

        return new Response(JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'purge': {
        // Delete a report permanently, before its window is up, because
        // somebody has decided it should not exist. Reserved for the roles
        // that may block a report: an irreversible action is a senior one.
        const parsed = DeleteFileSchema.safeParse(file)
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: 'Invalid file ID' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        if (!canBlock) {
          return new Response(JSON.stringify({ error: 'Deleting a report permanently is reserved for senior roles.' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const { data: existing } = await supabase
          .from('archive_files')
          .select('file_url, division, title, deleted_at, pdf_original_path')
          .eq('id', parsed.data.id)
          .maybeSingle()

        if (!existing) {
          return new Response(JSON.stringify({ error: 'Report not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        // A live report is deleted first, and only then permanently. This is
        // the second step of a deletion, never a shortcut past the first.
        if (!existing.deleted_at) {
          return new Response(JSON.stringify({ error: 'Delete the report first; it can then be removed permanently.' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        if (allowedDivisions && !allowedDivisions.includes(existing.division)) {
          return new Response(JSON.stringify({ error: 'You can only remove reports from your division' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        await purgeReport(supabase, parsed.data.id, existing.file_url, existing.pdf_original_path)
        audit.subject(existing.title || 'Unknown file', parsed.data.id);
        audit.note({ division: existing.division, operation: 'permanent' });

        return new Response(JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'purge-expired': {
        // Close the window on anything past thirty days.
        //
        // THIS IS WHY THE PERIOD IS REAL RATHER THAN DECORATIVE. Without a
        // sweep, a "30-day recovery" is only a filter in the interface and
        // the rows and files accumulate for ever. The workspace archive
        // calls this once when it opens, which is often enough for a set
        // this size and needs no scheduler; a nightly pg_cron job could
        // replace the call without changing anything else here.
        const cutoff = new Date(Date.now() - RECOVERY_MS).toISOString()
        const { data: expired } = await supabase
          .from('archive_files')
          .select('id, file_url, pdf_original_path')
          .not('deleted_at', 'is', null)
          .lt('deleted_at', cutoff)
          .limit(50)

        let purged = 0
        for (const row of expired || []) {
          await purgeReport(supabase, row.id, row.file_url, row.pdf_original_path)
          purged += 1
        }
        return new Response(JSON.stringify({ success: true, purged, recovery_days: RECOVERY_DAYS }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'bulk-update': {
        // The same change to several reports: a type, tags added or taken
        // away, a project. Every report must be one this person may edit;
        // otherwise nothing is changed. Their PDFs' details follow with
        // `pdf-metadata-apply`, which the archive offers right after.
        const bulkSchema = z.object({
          ids: z.array(z.string().uuid()).min(1).max(200),
          report_type: z.enum(REPORT_TYPES as [string, ...string[]]).optional(),
          add_tags: z.array(z.string().max(TAG_LENGTH_MAX * 2)).max(TAGS_MAX).optional(),
          remove_tags: z.array(z.string().max(TAG_LENGTH_MAX * 2)).max(TAGS_MAX * 4).optional(),
          project: z.string().trim().max(200).nullable().optional(),
        })
        const parsed = bulkSchema.safeParse(file)
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: 'Invalid bulk change', details: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        const change = parsed.data
        const ids = [...new Set(change.ids)]
        const addTags = normaliseTags(change.add_tags)
        const removeKeys = new Set(normaliseTags(change.remove_tags).map((t) => t.toLowerCase()))
        if (change.report_type === undefined && !addTags.length && !removeKeys.size && change.project === undefined) {
          return new Response(JSON.stringify({ error: 'Choose at least one change to make.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        const { data: rows, error: readError } = await supabase
          .from('archive_files').select('id, division, tags, deleted_at').in('id', ids)
        if (readError) throw readError
        const found = (rows || []) as { id: string; division: string; tags: string[] | null; deleted_at: string | null }[]
        if (found.length !== ids.length || found.some((r) => r.deleted_at)) {
          return new Response(JSON.stringify({ error: 'Some of these reports no longer exist or are deleted. Reload the archive and try again.' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        const outside = allowedDivisions ? found.filter((r) => !allowedDivisions.includes(r.division)).length : 0
        if (outside) {
          return new Response(JSON.stringify({ error: `${outside} of these reports belong to another division, which you cannot edit. Nothing was changed.` }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        // Tags beyond the limit are refused, not silently dropped.
        const nextTags = new Map<string, string[]>()
        for (const r of found) {
          const kept = (r.tags || []).filter((t) => !removeKeys.has(t.toLowerCase()))
          const merged = [...kept, ...addTags.filter((t) => !kept.some((k) => k.toLowerCase() === t.toLowerCase()))]
          if (merged.length > TAGS_MAX) {
            return new Response(JSON.stringify({ error: `A report can have at most ${TAGS_MAX} tags, and some of these would have more. Nothing was changed.` }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }
          nextTags.set(r.id, normaliseTags(merged))
        }
        let updated = 0
        for (let i = 0; i < found.length; i += 20) {
          const results = await Promise.all(found.slice(i, i + 20).map((r) => supabase.from('archive_files').update({
            ...(change.report_type !== undefined ? { report_type: change.report_type } : {}),
            ...(addTags.length || removeKeys.size ? { tags: nextTags.get(r.id) } : {}),
            ...(change.project !== undefined ? { project: change.project || null } : {}),
          }).eq('id', r.id)))
          for (const res of results) {
            if (res.error) throw res.error
            updated += 1
          }
        }
        audit.subject(`${updated} reports`, null)
        audit.note({ ids, report_type: change.report_type, add_tags: addTags, remove_tags: [...removeKeys], project: change.project })
        return new Response(JSON.stringify({ success: true, updated }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'pdf-metadata-check': {
        // Read only: which reports' PDFs do not yet say what their page
        // says, and which cannot be written (a file stored elsewhere).
        let query = supabase.from('archive_files').select(REPORT_FIELDS).is('deleted_at', null).order('date', { ascending: false })
        if (allowedDivisions) query = query.in('division', allowedDivisions)
        const { data: rows, error } = await query
        if (error) throw error
        const toUpdate: { id: string; title: string; status: string; first_time: boolean }[] = []
        const cannot: { id: string; title: string; reason: string }[] = []
        let upToDate = 0
        for (const r of (rows || []) as any[]) {
          const need = stampNeed(r)
          if (need.needed) toUpdate.push({ id: r.id, title: r.title, status: r.status, first_time: !r.pdf_metadata_at })
          else if (need.reason) cannot.push({ id: r.id, title: r.title, reason: need.reason })
          else upToDate += 1
        }
        return new Response(JSON.stringify({ total: (rows || []).length, up_to_date: upToDate, to_update: toUpdate, cannot, batch: STAMP_BATCH }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'pdf-metadata-apply': {
        // Write the details into the next few PDFs that need them. The
        // archive asks first, showing how many files will be updated and
        // that each original is kept, and sends `confirm: true` only then;
        // it calls again until `remaining` is 0.
        const applySchema = z.object({
          confirm: z.literal(true),
          ids: z.array(z.string().uuid()).max(200).optional(),
          // Files that already failed in this run, so the next call moves on.
          skip_ids: z.array(z.string().uuid()).max(500).optional(),
        })
        const parsed = applySchema.safeParse(file)
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: 'Confirm the update of the PDFs first.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        let query = supabase.from('archive_files').select(REPORT_FIELDS).is('deleted_at', null).order('date', { ascending: false })
        if (allowedDivisions) query = query.in('division', allowedDivisions)
        if (parsed.data.ids?.length) query = query.in('id', parsed.data.ids)
        const { data: rows, error } = await query
        if (error) throw error
        const skip = new Set(parsed.data.skip_ids || [])
        const pending = ((rows || []) as any[]).filter((r) => !skip.has(r.id) && stampNeed(r).needed)
        const done: string[] = []
        const failed: { id: string; title: string; reason: string }[] = []
        for (const r of pending.slice(0, STAMP_BATCH)) {
          const outcome = await stampReport(supabase, r)
          if (outcome.ok) done.push(r.id)
          else failed.push({ id: r.id, title: r.title, reason: outcome.reason })
        }
        // A file that failed is sent back as `skip_ids` by the archive, so
        // the run moves on and ends with the failures listed.
        const remaining = Math.max(0, pending.length - done.length - failed.length)
        audit.subject(`${done.length} report PDFs`, null)
        audit.note({ written: done, failed: failed.map((f) => f.id), remaining })
        return new Response(JSON.stringify({ success: true, done: done.length, failed, remaining }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'division-page-save': {
        // A division page's "How we work" (standards, review, tools) and
        // "Flagship work" (up to three of its published reports). Written
        // by the division's own Head, or by the Board.
        const pageSchema = z.object({
          division: z.enum(['equity', 'investment', 'macro', 'portfolio', 'quant']),
          standards: z.string().trim().max(1500),
          review: z.string().trim().max(1500),
          tools: z.string().trim().max(1500),
          flagship_ids: z.array(z.string().uuid()).max(3),
        })
        const parsed = pageSchema.safeParse(file)
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: 'Invalid division page', details: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        const page = parsed.data
        const isBoard = isAdminEmail || userRoleNames.some((r) => ['admin', 'president', 'vice_president', 'head_of_asset_management'].includes(r))
        const isOwnHead = roleRows.some((r) => r.role === 'head_of_division' && r.division === page.division)
        if (!isBoard && !isOwnHead) {
          return new Response(JSON.stringify({ error: "Only the division's Head, the President, the Vice President or the Head of Asset Management can edit this page." }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        const flagship = [...new Set(page.flagship_ids)]
        if (flagship.length) {
          const { data: picked, error: pickError } = await supabase.from('archive_files')
            .select('id').in('id', flagship).eq('division', page.division).eq('status', 'published').is('deleted_at', null)
          if (pickError) throw pickError
          if ((picked || []).length !== flagship.length) {
            return new Response(JSON.stringify({ error: "Flagship work must be published reports of this division." }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }
        }
        const { data, error } = await supabase.from('division_pages').upsert({
          division: page.division, standards: page.standards, review: page.review, tools: page.tools,
          flagship_ids: flagship, updated_by: user.id, updated_at: new Date().toISOString(),
        }, { onConflict: 'division' }).select().single()
        if (error) throw error
        audit.subject(`Division page: ${page.division}`, null)
        audit.note({ division: page.division, flagship_ids: flagship })
        return new Response(JSON.stringify({ success: true, page: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
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
}))
