import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// =====================================================================
// admin-resources — reusable file / link / note store (workspace_resources).
// Powers Reports → Templates & Code Repos now, and is reused by SMM and
// External Relations. Each item carries a category and a division.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ResourceSchema = z.object({
  id: z.string().uuid().optional(),
  category: z.string().min(1).max(60),
  division: z.enum(['equity', 'investment', 'macro', 'portfolio', 'quant', 'media', 'operations', 'board', 'none']),
  type: z.enum(['text', 'file', 'link', 'code', 'other']),
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).nullable().optional(),
  file_url: z.string().max(1000).nullable().optional(),
  link_url: z.string().max(1000).nullable().optional(),
  body: z.string().max(10000).nullable().optional(),
  is_favourite: z.boolean().optional(),
});

const MAX_FAVOURITES = 5;

// Roles that can manage resources across all divisions/categories.
const MANAGE_ALL = ['admin', 'president', 'vice_president', 'head_of_asset_management', 'head_of_media', 'head_of_operations'];
const SCOPED = ['head_of_division', 'portfolio_manager', 'team_leader', 'analyst', 'media_analyst'];

const DIV_LABELS: Record<string, string> = {
  equity: 'Equity Research', investment: 'Investment Research', macro: 'Macro Research',
  portfolio: 'Portfolio Management', quant: 'Quantitative Research', media: 'Media & Communication', operations: 'Operations',
};
const ROLE_BASE: Record<string, string> = {
  president: 'President', vice_president: 'Vice President', head_of_asset_management: 'Head of Asset Management',
  head_of_media: 'Head of Media & Communication', head_of_operations: 'Head of Operations',
  portfolio_manager: 'Portfolio Manager', team_leader: 'Team Leader / Senior Analyst', analyst: 'Analyst',
  media_analyst: 'Media & Communication Analyst', advisor: 'Advisor', silent_advisor: 'Silent Advisor',
  member: 'Member', admin: 'Admin',
};
const ROLE_RANK: Record<string, number> = {
  president: 1, vice_president: 2, admin: 2, head_of_asset_management: 3, head_of_division: 4,
  head_of_media: 5, head_of_operations: 6, portfolio_manager: 7, team_leader: 8, analyst: 9,
  media_analyst: 10, advisor: 11, silent_advisor: 12, member: 95,
};
function roleLabel(role: string, division: string | null): string {
  const div = division && division !== 'none' && division !== 'board' ? division : null;
  if (role === 'head_of_division' && div && DIV_LABELS[div]) return `Head of ${DIV_LABELS[div]}`;
  if ((role === 'analyst' || role === 'team_leader' || role === 'portfolio_manager') && div && DIV_LABELS[div]) {
    const suffix = role === 'analyst' ? 'Analyst' : role === 'team_leader' ? 'Team Leader' : 'Portfolio Manager';
    return `${DIV_LABELS[div]} ${suffix}`;
  }
  return ROLE_BASE[role] || role;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// Allowlist of upload types. HTML/SVG/scripts are rejected because they would
// execute in the browser if the object URL were ever opened.
const ALLOWED_MIME = new Set([
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
  'application/pdf', 'text/plain', 'text/csv', 'application/zip',
  'application/msword', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);
const BLOCKED_EXT = /\.(html?|xhtml|svg|js|mjs|php|sh|exe|bat|htm)$/i;
function fileTypeAllowed(file: File): boolean {
  if (BLOCKED_EXT.test(file.name)) return false;
  // Empty type is allowed only for clearly-safe extensions handled above.
  return ALLOWED_MIME.has((file.type || '').toLowerCase());
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authError || !user) return json({ error: 'Invalid token' }, 401);

    const { data: roleRows } = await supabase.from('user_roles').select('role, division').eq('user_id', user.id);
    const roles = (roleRows || []) as { role: string; division: string | null }[];
    const isAdminEmail = user.email === 'as.minerva@unibocconi.it';
    const canAll = isAdminEmail || roles.some((r) => MANAGE_ALL.includes(r.role));
    const scopedDivisions = roles.filter((r) => SCOPED.includes(r.role))
      .map((r) => r.division || (r.role === 'portfolio_manager' ? 'portfolio' : r.role === 'media_analyst' ? 'media' : null))
      .filter((d): d is string => !!d && d !== 'none' && d !== 'board');
    const isStaff = canAll || scopedDivisions.length > 0 || roles.some((r) => !['member', 'pending', 'candidate'].includes(r.role));
    if (!isStaff) return json({ error: 'Access denied' }, 403);

    const authorName = (await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()).data?.full_name || user.email;
    // The uploader's role at the time of upload, shown next to their name.
    const primary = [...roles].sort((a, b) => (ROLE_RANK[a.role] ?? 99) - (ROLE_RANK[b.role] ?? 99))[0];
    const authorRole = primary ? roleLabel(primary.role, primary.division) : null;

    // Photo/file upload (multipart) to the public workspace-resources bucket.
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file') as File | null;
      if (!file) return json({ error: 'No file provided' }, 400);
      if (file.size > 25 * 1024 * 1024) return json({ error: 'File must be under 25 MB.' }, 400);
      if (!fileTypeAllowed(file)) return json({ error: 'This file type is not allowed. Upload a document, spreadsheet, presentation, PDF, image, CSV or zip.' }, 400);
      const safe = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const path = `${Date.now()}-${safe}`;
      const { data: up, error: upErr } = await supabase.storage.from('workspace-resources')
        .upload(path, await file.arrayBuffer(), { contentType: file.type || 'application/octet-stream', upsert: false });
      if (upErr) return json({ error: 'Upload failed' }, 500);
      const { data: pub } = supabase.storage.from('workspace-resources').getPublicUrl(up.path);
      return json({ success: true, file_url: pub.publicUrl });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    const inScope = (division: string) => canAll || division === 'none' || scopedDivisions.includes(division);

    if (action === 'delete') {
      const id = body.id as string;
      const { data: existing } = await supabase.from('workspace_resources').select('division').eq('id', id).maybeSingle();
      if (existing && !inScope(existing.division)) return json({ error: 'Out of scope' }, 403);
      const { error } = await supabase.from('workspace_resources').delete().eq('id', id);
      if (error) throw error;
      return json({ success: true });
    }

    // Toggle a favourite (star). At most five favourites per category.
    if (action === 'favourite') {
      const id = body.id as string;
      const want = !!body.is_favourite;
      const { data: existing } = await supabase.from('workspace_resources').select('division, category').eq('id', id).maybeSingle();
      if (!existing) return json({ error: 'Not found' }, 404);
      if (!inScope(existing.division)) return json({ error: 'Out of scope' }, 403);
      if (want) {
        const { count } = await supabase.from('workspace_resources')
          .select('id', { count: 'exact', head: true })
          .eq('category', existing.category).eq('is_favourite', true).neq('id', id);
        if ((count ?? 0) >= MAX_FAVOURITES) return json({ error: `You can pin at most ${MAX_FAVOURITES} favourites in this section.` }, 409);
      }
      const { error } = await supabase.from('workspace_resources').update({ is_favourite: want }).eq('id', id);
      if (error) throw error;
      return json({ success: true });
    }

    const parsed = ResourceSchema.safeParse(body.resource);
    if (!parsed.success) return json({ error: 'Validation failed', details: parsed.error.format() }, 400);
    const r = parsed.data;
    if (!inScope(r.division)) return json({ error: 'You can only manage resources in your division' }, 403);

    // Enforce the five-favourite cap when creating/updating a starred item.
    if (r.is_favourite) {
      const { count } = await supabase.from('workspace_resources')
        .select('id', { count: 'exact', head: true })
        .eq('category', r.category).eq('is_favourite', true).neq('id', r.id ?? '00000000-0000-0000-0000-000000000000');
      if ((count ?? 0) >= MAX_FAVOURITES) return json({ error: `You can pin at most ${MAX_FAVOURITES} favourites in this section.` }, 409);
    }

    const payload = {
      category: r.category, division: r.division, type: r.type, title: r.title,
      description: r.description ?? null,
      file_url: r.file_url ?? null, link_url: r.link_url ?? null, body: r.body ?? null,
      is_favourite: r.is_favourite ?? false,
    };

    if (action === 'create') {
      const { data, error } = await supabase.from('workspace_resources')
        .insert({ ...payload, author_id: user.id, author_name: authorName, author_role: authorRole }).select().single();
      if (error) throw error;
      return json({ success: true, resource: data });
    }
    if (action === 'update') {
      if (!r.id) return json({ error: 'Missing id' }, 400);
      const { data, error } = await supabase.from('workspace_resources').update(payload).eq('id', r.id).select().single();
      if (error) throw error;
      return json({ success: true, resource: data });
    }
    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('admin-resources error:', error);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
});
