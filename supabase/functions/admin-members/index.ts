import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// =====================================================================
// admin-members — CRUD for the canonical roster (public.members).
// Writes go ONLY to public.members; the members -> team_members
// projection trigger keeps the public website in sync automatically.
// Follows the same auth / validation / rate-limit pattern as admin-team.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DIVISIONS = ['equity', 'investment', 'macro', 'portfolio', 'quant', 'media', 'operations', 'board', 'none'] as const;

// Roles that can be assigned through this endpoint. admin / candidate /
// pending are deliberately excluded (managed elsewhere).
const ASSIGNABLE_ROLES = [
  'president', 'vice_president', 'head_of_asset_management', 'head_of_division',
  'team_leader', 'portfolio_manager', 'analyst', 'head_of_media', 'media_analyst',
  'head_of_operations', 'advisor', 'silent_advisor', 'alumni', 'member',
] as const;

const MemberSchema = z.object({
  id: z.string().uuid().optional(),
  first_name: z.string().min(1, 'First name is required').max(100).trim(),
  surname: z.string().min(1, 'Surname is required').max(100).trim(),
  email: z.string().email('Invalid email').max(255).nullable().optional().or(z.literal('')),
  phone: z.string().max(40).nullable().optional().or(z.literal('')),
  photo_url: z.string().max(500).nullable().optional()
    .refine((v) => !v || v.startsWith('http://') || v.startsWith('https://'), 'Photo URL must be a valid URL'),
  linkedin_url: z.string().max(500).nullable().optional()
    .refine((v) => !v || v.startsWith('http://') || v.startsWith('https://'), 'LinkedIn URL must be a valid URL'),
  division: z.enum(DIVISIONS),
  role: z.enum(ASSIGNABLE_ROLES),
  membership_status: z.enum(['active', 'temporary_leave', 'alumni', 'expelled', 'silent_advisor']).optional(),
  account_status: z.enum(['approved', 'pending', 'to_redeem']).optional(),
  is_public: z.boolean().optional(),
});

const DeleteSchema = z.object({ id: z.string().uuid('Valid member ID is required') });
const ActionSchema = z.enum(['create', 'update', 'delete', 'upload-photo']);

// Roles a division head may assign within their own division.
const DIVISION_HEAD_ALLOWED_ROLES = ['analyst', 'team_leader', 'portfolio_manager'];

const rateLimits = new Map<string, { count: number; resetTime: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(ip);
  if (!limit || now > limit.resetTime) {
    rateLimits.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }
  if (limit.count >= 30) return false;
  limit.count++;
  return true;
}

async function logActivity(
  supabase: any, userId: string, userEmail: string, userRole: string,
  action: string, entityId: string | null, entityName: string | null,
  details?: Record<string, unknown>,
) {
  try {
    await supabase.from('activity_logs').insert({
      user_id: userId, user_email: userEmail, user_role: userRole,
      action, entity_type: 'member', entity_id: entityId, entity_name: entityName,
      details: details || null,
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientIp)) return json({ error: 'Rate limit exceeded' }, 429);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const token = authHeader.split(' ')[1];

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Invalid token' }, 401);

    // ── Authorisation: full access, head of operations, or a division head ──
    const fullAccessRoles = ['admin', 'president', 'vice_president', 'head_of_asset_management'];
    const isAdminEmail = user.email === 'as.minerva@unibocconi.it';

    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role, division')
      .eq('user_id', user.id);

    const roleNames: string[] = (userRoles || []).map((r: any) => r.role);
    const hasFullAccess = isAdminEmail || roleNames.some((r) => fullAccessRoles.includes(r));
    const isOperations = roleNames.includes('head_of_operations');
    const divisionHeadDivisions: string[] = (userRoles || [])
      .filter((r: any) => r.role === 'head_of_division' && r.division)
      .map((r: any) => r.division);
    const isDivisionHead = divisionHeadDivisions.length > 0;

    // Operations maintains the full members register (statute); full access
    // sees everything; division heads are scoped to their own division.
    const canManageAll = hasFullAccess || isOperations;
    if (!canManageAll && !isDivisionHead) {
      return json({ error: 'Access denied - insufficient permissions for member management' }, 403);
    }

    const primaryRole = roleNames[0] || 'member';

    // ── Photo upload (multipart) — reuses the existing team-photos bucket ──
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) return json({ error: 'No file provided' }, 400);
      if (!file.type.startsWith('image/')) return json({ error: 'Only image files are allowed' }, 400);
      if (file.size > 5 * 1024 * 1024) return json({ error: 'Image size must be less than 5MB' }, 400);

      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
      const arrayBuffer = await file.arrayBuffer();
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('team-photos')
        .upload(fileName, arrayBuffer, { contentType: file.type, cacheControl: '3600', upsert: false });
      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        return json({ error: 'Failed to upload photo to storage' }, 500);
      }
      const { data: urlData } = supabase.storage.from('team-photos').getPublicUrl(uploadData.path);
      return json({ success: true, photo_url: urlData.publicUrl, path: uploadData.path });
    }

    const body = await req.json();
    const actionResult = ActionSchema.safeParse(body.action);
    if (!actionResult.success) return json({ error: 'Invalid action' }, 400);
    const action = actionResult.data;

    // Helper: enforce division-head scoping on a target member payload/row.
    const denyIfOutOfScope = (division?: string | null, role?: string | null): string | null => {
      if (canManageAll) return null;
      if (!division || !divisionHeadDivisions.includes(division)) {
        return 'You can only manage members in your division';
      }
      if (role && !DIVISION_HEAD_ALLOWED_ROLES.includes(role)) {
        return 'You can only assign analyst, team leader or portfolio manager roles';
      }
      return null;
    };

    if (action === 'delete') {
      const parsed = DeleteSchema.safeParse(body.member);
      if (!parsed.success) return json({ error: 'Validation failed', details: parsed.error.format() }, 400);

      const { data: existing } = await supabase
        .from('members').select('first_name, surname, division, role').eq('id', parsed.data.id).single();
      const scopeError = denyIfOutOfScope(existing?.division, existing?.role);
      if (scopeError) return json({ error: scopeError }, 403);

      const { error } = await supabase.from('members').delete().eq('id', parsed.data.id);
      if (error) throw error;
      await logActivity(supabase, user.id, user.email || 'unknown', primaryRole, 'delete',
        parsed.data.id, existing ? `${existing.first_name} ${existing.surname}` : null);
      return json({ success: true });
    }

    const parsed = MemberSchema.safeParse(body.member);
    if (!parsed.success) return json({ error: 'Validation failed', details: parsed.error.format() }, 400);
    const m = parsed.data;

    const scopeError = denyIfOutOfScope(m.division, m.role);
    if (scopeError) return json({ error: scopeError }, 403);

    const payload = {
      first_name: m.first_name,
      surname: m.surname,
      email: m.email || null,
      phone: m.phone || null,
      photo_url: m.photo_url || null,
      linkedin_url: m.linkedin_url || null,
      division: m.division,
      role: m.role,
      membership_status: m.membership_status || 'active',
      account_status: m.account_status || 'to_redeem',
      is_public: m.is_public ?? true,
    };

    if (action === 'create') {
      const { data, error } = await supabase.from('members').insert(payload).select().single();
      if (error) throw error;
      await logActivity(supabase, user.id, user.email || 'unknown', primaryRole, 'create',
        data.id, `${m.first_name} ${m.surname}`, { division: m.division, role: m.role });
      return json({ success: true, member: data });
    }

    if (action === 'update') {
      if (!m.id) return json({ error: 'Member ID is required for update' }, 400);

      // Division heads may only edit members already inside their division.
      if (!canManageAll) {
        const { data: existing } = await supabase
          .from('members').select('division, role').eq('id', m.id).single();
        const existingScopeError = denyIfOutOfScope(existing?.division, existing?.role);
        if (existingScopeError) return json({ error: existingScopeError }, 403);
      }

      const { data, error } = await supabase.from('members').update(payload).eq('id', m.id).select().single();
      if (error) throw error;
      await logActivity(supabase, user.id, user.email || 'unknown', primaryRole, 'update',
        data.id, `${m.first_name} ${m.surname}`, { division: m.division, role: m.role });
      return json({ success: true, member: data });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: message }, 500);
  }
});
