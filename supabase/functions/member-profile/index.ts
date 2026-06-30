import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// =====================================================================
// member-profile — self-service for the logged-in user's My Profile page.
//   * resolves (and, on first login, claims) the user's member row,
//     realising the "account to be redeemed" flow (report 8.1):
//     a to_redeem placeholder is linked to the login by email, then name.
//   * lets the user edit ONLY their phone and photo (report 3).
// All other member fields are managed by authorised staff via admin-members.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UpdateSchema = z.object({
  // Phone is required and cannot be removed once set (report 3).
  phone: z.string().trim().min(3, 'Phone number is required').max(40),
  photo_url: z.string().max(500).nullable().optional()
    .refine((v) => !v || v.startsWith('http://') || v.startsWith('https://'), 'Photo URL must be a valid URL'),
});

// Roles whose holders appear on the public site (drives is_public on create).
const PUBLIC_ROLES = new Set([
  'president', 'vice_president', 'head_of_asset_management', 'head_of_division',
  'team_leader', 'portfolio_manager', 'analyst', 'head_of_media', 'media_analyst',
  'head_of_operations', 'advisor',
]);

// Seniority used to pick a primary role when a user has more than one.
const ROLE_RANK: Record<string, number> = {
  president: 1, vice_president: 2, admin: 2, head_of_asset_management: 3,
  head_of_division: 4, head_of_media: 5, head_of_operations: 6, portfolio_manager: 7,
  team_leader: 8, analyst: 9, media_analyst: 10, advisor: 11, silent_advisor: 12,
  alumni: 90, member: 95, candidate: 98, pending: 99,
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function splitName(full: string | null | undefined, fallbackEmail: string): { first: string; surname: string } {
  const name = (full || '').trim();
  if (!name) return { first: fallbackEmail.split('@')[0] || 'Member', surname: '' };
  const parts = name.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], surname: '' };
  return { first: parts[0], surname: parts.slice(1).join(' ') };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const token = authHeader.split(' ')[1];

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Invalid token' }, 401);

    const { data: roleRows } = await supabase
      .from('user_roles').select('role, division').eq('user_id', user.id);
    const roles: string[] = (roleRows || []).map((r: any) => r.role);
    const isCandidate = roles.includes('candidate') && !roles.some((r) => r !== 'candidate' && r !== 'pending');

    // ── Photo upload (multipart) — reuses the team-photos bucket ──────────
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      if (isCandidate) return json({ error: 'Not available' }, 403);
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
      if (uploadError) return json({ error: 'Failed to upload photo to storage' }, 500);
      const { data: urlData } = supabase.storage.from('team-photos').getPublicUrl(uploadData.path);
      return json({ success: true, photo_url: urlData.publicUrl });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action === 'update' ? 'update' : 'get';

    // Candidates do not have a member record.
    if (isCandidate) return json({ member: null, isCandidate: true });

    // Resolve the user's member row (claim a placeholder on first login).
    const resolveMember = async () => {
      const { data: byUser } = await supabase.from('members').select('*').eq('user_id', user.id).maybeSingle();
      if (byUser) return byUser;

      // 1) match a to_redeem placeholder by email
      if (user.email) {
        const { data: byEmail } = await supabase
          .from('members').select('*')
          .is('user_id', null).ilike('email', user.email).limit(1).maybeSingle();
        if (byEmail) {
          const { data: linked } = await supabase.from('members')
            .update({ user_id: user.id, account_status: 'approved' })
            .eq('id', byEmail.id).select().single();
          return linked;
        }
      }

      // 2) match a to_redeem placeholder by full name
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      const { first, surname } = splitName(profile?.full_name, user.email || '');
      if (profile?.full_name) {
        const { data: candidates } = await supabase
          .from('members').select('*')
          .is('user_id', null).eq('account_status', 'to_redeem');
        const match = (candidates || []).find(
          (m: any) => `${m.first_name} ${m.surname}`.trim().toLowerCase() === profile.full_name!.trim().toLowerCase(),
        );
        if (match) {
          const { data: linked } = await supabase.from('members')
            .update({ user_id: user.id, account_status: 'approved' })
            .eq('id', match.id).select().single();
          return linked;
        }
      }

      // 3) create a fresh approved member from the user's role assignment
      const primary = [...(roleRows || [])].sort(
        (a: any, b: any) => (ROLE_RANK[a.role] ?? 99) - (ROLE_RANK[b.role] ?? 99),
      )[0] as any | undefined;
      const role = primary?.role ?? 'member';
      const division = primary?.division ?? 'none';
      const { data: created } = await supabase.from('members').insert({
        user_id: user.id,
        first_name: first,
        surname,
        email: user.email ?? null,
        division,
        role,
        account_status: 'approved',
        membership_status: 'active',
        is_public: PUBLIC_ROLES.has(role),
      }).select().single();
      return created;
    };

    if (action === 'get') {
      const member = await resolveMember();
      return json({ member });
    }

    // action === 'update' — phone + photo only
    const member = await resolveMember();
    if (!member) return json({ error: 'No member record' }, 404);

    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return json({ error: 'Validation failed', details: parsed.error.format() }, 400);

    const { data: updated, error } = await supabase.from('members')
      .update({ phone: parsed.data.phone, photo_url: parsed.data.photo_url ?? member.photo_url })
      .eq('id', member.id).eq('user_id', user.id).select().single();
    if (error) throw error;
    return json({ success: true, member: updated });
  } catch (error) {
    console.error('member-profile error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: message }, 500);
  }
});
