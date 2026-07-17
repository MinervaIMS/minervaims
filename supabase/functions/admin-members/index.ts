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
  'team_leader', 'senior_analyst', 'portfolio_manager', 'analyst', 'head_of_media',
  'media_analyst', 'head_of_operations', 'advisor', 'alumni', 'member',
] as const;

// ── Role ⇄ division pairing rules (mirror of src/lib/roles.ts) ─────────
// Board and advisor roles carry NO division; department roles are pinned;
// core-division roles must name one of the five research divisions.
const CORE_DIVISIONS = ['equity', 'investment', 'macro', 'portfolio', 'quant'];
const FIXED_DIVISION: Record<string, string> = {
  portfolio_manager: 'portfolio', head_of_media: 'media', media_analyst: 'media', head_of_operations: 'operations',
};
function divisionOptionsFor(role: string): string[] {
  if (FIXED_DIVISION[role]) return [FIXED_DIVISION[role]];
  if (role === 'team_leader') return CORE_DIVISIONS.filter((d) => d !== 'portfolio');
  if (role === 'head_of_division' || role === 'senior_analyst' || role === 'analyst') return [...CORE_DIVISIONS];
  return []; // president, vice_president, head_of_asset_management, advisor, alumni, member
}
/** Returns the division to store for (role, requested), or an error string. */
function resolveRoleDivision(role: string, requested: string | null | undefined): { division: string; error?: string } {
  const options = divisionOptionsFor(role);
  if (options.length === 0) return { division: 'none' };
  if (options.length === 1) return { division: options[0] };
  if (!requested || !options.includes(requested)) {
    return { division: 'none', error: `The role "${role}" requires one of these divisions: ${options.join(', ')}.` };
  }
  return { division: requested };
}

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
  membership_status: z.enum(['active', 'on_exchange', 'one_semester_pause', 'alumni', 'expelled']).optional(),
  account_status: z.enum(['approved', 'pending', 'to_redeem']).optional(),
  fee_status: z.enum(['paid', 'unpaid', 'exempt']).optional(),
  is_public: z.boolean().optional(),
});

const DeleteSchema = z.object({ id: z.string().uuid('Valid member ID is required') });
const MoveToAlumniSchema = z.object({
  id: z.string().uuid('Valid member ID is required'),
  graduation_year: z.number().int().min(1990).max(2100),
  // Optional so a person can be appointed advisor before their current
  // company is known; required for a plain move to the directory.
  company: z.string().max(200).trim().nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  job_area: z.string().max(200).nullable().optional(),
  /** Keep the person in the workspace as an advisor (hidden by default). */
  keep_role: z.enum(['advisor']).optional(),
});
const ActionSchema = z.enum(['create', 'update', 'delete', 'move-to-alumni', 'upload-photo']);

// ── Role seniority ranking (mirror of src/lib/roles.ts) ────────────────
// The hierarchy is the backbone of every authorisation decision here:
// a caller may only manage people who rank strictly BELOW them, and may
// only assign roles that rank strictly below their own. Nobody can touch
// their own roster record through this endpoint (member-profile is the
// only self-service surface, and it edits phone/photo alone).
const ROLE_RANK: Record<string, number> = {
  admin: 0, president: 1, vice_president: 2, head_of_asset_management: 3,
  head_of_division: 4, head_of_equity: 4, head_of_investment: 4, head_of_macro: 4,
  head_of_portfolio: 4, head_of_quant: 4, head_of_media: 5, head_of_operations: 6,
  portfolio_manager: 7, team_leader: 8, senior_analyst: 9, analyst: 10,
  media_analyst: 11, advisor: 12, silent_advisor: 12,
  alumni: 90, member: 95, candidate: 98, pending: 99,
};
const rankOf = (role: string | null | undefined): number => ROLE_RANK[role ?? ''] ?? 99;

const ADMIN_EMAIL = 'as.minerva@unibocconi.it';

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
      section: 'People', subsection: 'Members',
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

    // ── Authorisation ─────────────────────────────────────────────────
    // ONLY the roles the access matrix grants 'manage' on People > Members
    // may write here: the association account (admin), the President, the
    // Vice President and the Head of Operations (who maintains the register
    // per statute). Everyone else is read-only, exactly as the matrix and
    // the Settings > Role Permissions table state.
    const MANAGER_ROLES = ['admin', 'president', 'vice_president', 'head_of_operations'];
    const isAdminEmail = user.email === ADMIN_EMAIL;

    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role, division')
      .eq('user_id', user.id);

    const roleNames: string[] = (userRoles || []).map((r: any) => r.role);
    const isManager = isAdminEmail || roleNames.some((r) => MANAGER_ROLES.includes(r));
    if (!isManager) {
      return json({ error: 'Access denied - insufficient permissions for member management' }, 403);
    }

    // The caller's seniority: the STRONGEST of their roles decides what they
    // may do (admin email counts as rank 0, above everyone).
    const callerRank = isAdminEmail ? 0 : Math.min(...roleNames.map(rankOf), 99);
    const primaryRole = roleNames[0] || 'member';

    // Hierarchy guards, applied to every mutating action:
    //  - never your own record (no self promotion, demotion or deletion);
    //  - never a peer's or a senior's record;
    //  - never assign a role at or above your own rank;
    //  - never the association account's record.
    const guardTarget = (target: { user_id?: string | null; email?: string | null; role?: string | null } | null | undefined): string | null => {
      if (!target) return null;
      if (target.email && target.email === ADMIN_EMAIL) {
        return 'The association account cannot be managed from here.';
      }
      if ((target.user_id && target.user_id === user.id) || (target.email && target.email === user.email)) {
        return 'You cannot change your own record: roles are assigned by a more senior role. Use My Profile for your phone number and photo.';
      }
      if (target.role != null && rankOf(target.role) <= callerRank) {
        return 'You can only manage members whose role ranks below your own.';
      }
      return null;
    };
    const guardAssignedRole = (role: string | null | undefined): string | null => {
      if (role == null) return null;
      if (role === 'admin') return 'The admin role belongs to the association account only and cannot be granted.';
      if (rankOf(role) <= callerRank) {
        return 'You can only assign roles that rank below your own.';
      }
      return null;
    };

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

    if (action === 'delete') {
      const parsed = DeleteSchema.safeParse(body.member);
      if (!parsed.success) return json({ error: 'Validation failed', details: parsed.error.format() }, 400);

      const { data: existing } = await supabase
        .from('members').select('first_name, surname, division, role, user_id, email').eq('id', parsed.data.id).single();
      const guardError = guardTarget(existing);
      if (guardError) return json({ error: guardError }, 403);

      const { error } = await supabase.from('members').delete().eq('id', parsed.data.id);
      if (error) throw error;
      await logActivity(supabase, user.id, user.email || 'unknown', primaryRole, 'delete',
        parsed.data.id, existing ? `${existing.first_name} ${existing.surname}` : null);
      return json({ success: true });
    }

    // ── Move a member into the alumni directory ─────────────────────────
    // The public alumni row carries no contact data; phone/email are kept in
    // the staff-only alumni_contacts table. The person can optionally stay in
    // the workspace as an advisor (public) or silent advisor instead of being
    // removed: every advisor is, by definition, a registered alumnus.
    if (action === 'move-to-alumni') {
      const parsed = MoveToAlumniSchema.safeParse(body);
      if (!parsed.success) return json({ error: 'Validation failed', details: parsed.error.format() }, 400);
      const keepRole = parsed.data.keep_role ?? null;
      const company = parsed.data.company?.trim() || null;
      // An advisor can be registered before their company is known; a plain
      // move to the directory still requires the current company.
      if (!company && keepRole !== 'advisor') {
        return json({ error: 'Current company is required (it may be left empty only when appointing the person as advisor).' }, 400);
      }
      const { data: member } = await supabase.from('members')
        .select('user_id, first_name, surname, division, role, phone, email, linkedin_url').eq('id', parsed.data.id).single();
      if (!member) return json({ error: 'Member not found' }, 404);
      const guardError = guardTarget(member);
      if (guardError) return json({ error: guardError }, 403);

      const { data: alum, error: alumErr } = await supabase.from('alumni').insert({
        name: member.first_name, surname: member.surname,
        graduation_year: parsed.data.graduation_year, company,
        city: parsed.data.city || null, job_area: parsed.data.job_area || null,
        linkedin_url: member.linkedin_url || null,
      }).select('id').single();
      if (alumErr) throw alumErr;

      // Retain the contact details privately.
      if (member.phone || member.email) {
        await supabase.from('alumni_contacts').insert({ alumni_id: alum.id, phone: member.phone || null, email: member.email || null });
      }

      if (keepRole === 'advisor') {
        // The advisor starts hidden from the public website; the visibility
        // switch on their profile can show them later. Workspace access
        // follows automatically (sync_member_access trigger).
        const { error } = await supabase.from('members')
          .update({ role: 'advisor', membership_status: 'active', division: 'none', is_public: false })
          .eq('id', parsed.data.id);
        if (error) throw error;
      } else {
        // Deleting the roster row leaves the linked account with the minimal
        // 'alumni' access (sync_member_access trigger).
        const { error } = await supabase.from('members').delete().eq('id', parsed.data.id);
        if (error) throw error;
      }

      await logActivity(supabase, user.id, user.email || 'unknown', primaryRole, 'move-to-alumni',
        parsed.data.id, `${member.first_name} ${member.surname}`,
        { kept_as: keepRole ?? 'removed_from_roster', company: company ?? undefined });
      return json({ success: true, alumni_id: alum.id });
    }

    const parsed = MemberSchema.safeParse(body.member);
    if (!parsed.success) return json({ error: 'Validation failed', details: parsed.error.format() }, 400);
    const m = parsed.data;

    // Enforce the role ⇄ division pairing (the same rules as Settings → Users):
    // board and advisor roles carry no division, department roles are pinned,
    // core-division roles must name a research division.
    const resolved = resolveRoleDivision(m.role, m.division);
    if (resolved.error) return json({ error: resolved.error }, 400);
    const division = resolved.division;

    // The assigned role must rank strictly below the caller's own role.
    const assignError = guardAssignedRole(m.role);
    if (assignError) return json({ error: assignError }, 403);

    const isExpelled = m.membership_status === 'expelled';
    const payload = {
      first_name: m.first_name,
      surname: m.surname,
      email: m.email || null,
      phone: m.phone || null,
      photo_url: m.photo_url || null,
      linkedin_url: m.linkedin_url || null,
      division,
      role: m.role,
      membership_status: m.membership_status || 'active',
      account_status: m.account_status || 'to_redeem',
      fee_status: m.fee_status || 'unpaid',
      is_public: isExpelled ? false : (m.is_public ?? true),
      // Expulsion: schedule permanent deletion one month out.
      deletion_scheduled_at: isExpelled ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
    };

    if (action === 'create') {
      // A manager cannot create a roster record carrying their own email or
      // the association's (that would be an indirect self/role grant).
      if (payload.email && (payload.email === user.email || payload.email === ADMIN_EMAIL)) {
        return json({ error: 'You cannot create a roster record with this email address.' }, 403);
      }
      const { data, error } = await supabase.from('members').insert(payload).select().single();
      if (error) throw error;
      await logActivity(supabase, user.id, user.email || 'unknown', primaryRole, 'create',
        data.id, `${m.first_name} ${m.surname}`, { division, role: m.role });
      return json({ success: true, member: data });
    }

    if (action === 'update') {
      if (!m.id) return json({ error: 'Member ID is required for update' }, 400);

      // The CURRENT row decides whether the caller may touch it at all:
      // never their own record, never a peer or senior, never the
      // association account.
      const { data: existing } = await supabase
        .from('members').select('division, role, user_id, email').eq('id', m.id).single();
      if (!existing) return json({ error: 'Member not found' }, 404);
      const guardError = guardTarget(existing);
      if (guardError) return json({ error: guardError }, 403);

      const { data, error } = await supabase.from('members').update(payload).eq('id', m.id).select().single();
      if (error) throw error;
      // Workspace access follows the roster automatically: the
      // sync_member_access database trigger mirrors the role and division
      // onto user_roles for linked accounts, and expulsion removes access
      // immediately (the account itself is deleted after one month by the
      // cleanup_expelled_members() cron).
      await logActivity(supabase, user.id, user.email || 'unknown', primaryRole, isExpelled ? 'expel' : 'update',
        data.id, `${m.first_name} ${m.surname}`, { division, role: m.role });
      return json({ success: true, member: data });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('admin-members error:', error);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
});
